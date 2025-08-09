# 動態Schema同步設計

## 核心需求

### 1. 動態表單管理
- 系統可以從CRM讀取對象列表，提供用戶選擇要同步的表單
- 支持動態新增表單到同步列表
- 自動創建對應的D1資料表

### 2. 欄位變動同步
- 檢測CRM表單欄位的新增、刪除、修改
- 自動更新D1資料庫結構以保持一致
- 記錄欄位變更歷史

### 3. 嚴格遵守CRM欄位定義
- 資料庫欄位名稱必須與CRM API名稱完全一致
- 資料類型必須匹配CRM定義
- 不可任意修改或轉換欄位名稱

## 系統架構

### 元數據管理表

```sql
-- CRM對象定義表
CREATE TABLE fx_object_definitions (
    id TEXT PRIMARY KEY,
    api_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT TRUE,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_synced BOOLEAN DEFAULT FALSE,
    table_name TEXT,
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRM欄位定義表
CREATE TABLE fx_field_definitions (
    id TEXT PRIMARY KEY,
    object_api_name TEXT NOT NULL,
    field_api_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    data_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    default_value TEXT,
    options TEXT, -- JSON格式的選項列表
    validation_rules TEXT, -- JSON格式的驗證規則
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(object_api_name, field_api_name),
    FOREIGN KEY (object_api_name) REFERENCES fx_object_definitions(api_name)
);

-- Schema變更記錄表
CREATE TABLE schema_change_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_api_name TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'ADD_FIELD', 'DROP_FIELD', 'MODIFY_FIELD', 'ADD_TABLE'
    field_api_name TEXT,
    old_definition TEXT, -- JSON格式
    new_definition TEXT, -- JSON格式
    sql_executed TEXT,
    status TEXT NOT NULL, -- 'PENDING', 'COMPLETED', 'FAILED'
    error_message TEXT,
    executed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 實現方案

### 1. CRM對象發現服務

```javascript
// workers/src/sync/object-discovery.js
export class ObjectDiscoveryService {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
  }

  // 從CRM獲取所有可用對象
  async discoverObjects() {
    const response = await this.fxClient.get('/cgi/object/list');
    const objects = response.data.objects;
    
    // 更新本地對象定義
    for (const obj of objects) {
      await this.db.prepare(`
        INSERT INTO fx_object_definitions (
          id, api_name, display_name, description, is_custom
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(api_name) DO UPDATE SET
          display_name = excluded.display_name,
          description = excluded.description,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        obj.id,
        obj.apiName,
        obj.displayName,
        obj.description,
        obj.isCustom
      ).run();
    }
    
    return objects;
  }

  // 獲取對象的欄位定義
  async getObjectFields(objectApiName) {
    const response = await this.fxClient.get(`/cgi/object/${objectApiName}/describe`);
    return response.data.fields;
  }

  // 同步欄位定義
  async syncFieldDefinitions(objectApiName) {
    const fields = await this.getObjectFields(objectApiName);
    
    for (const field of fields) {
      await this.db.prepare(`
        INSERT INTO fx_field_definitions (
          id, object_api_name, field_api_name, display_name,
          field_type, data_type, is_required, is_custom, options
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(object_api_name, field_api_name) DO UPDATE SET
          display_name = excluded.display_name,
          field_type = excluded.field_type,
          data_type = excluded.data_type,
          is_required = excluded.is_required,
          options = excluded.options,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        field.id,
        objectApiName,
        field.apiName,
        field.displayName,
        field.fieldType,
        this.mapFieldType(field.fieldType),
        field.isRequired,
        field.isCustom,
        JSON.stringify(field.options || [])
      ).run();
    }
  }

  // 映射CRM欄位類型到SQL類型
  mapFieldType(fxFieldType) {
    const typeMap = {
      'text': 'TEXT',
      'textarea': 'TEXT',
      'number': 'REAL',
      'currency': 'REAL',
      'percent': 'REAL',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'boolean': 'BOOLEAN',
      'picklist': 'TEXT',
      'multipicklist': 'TEXT',
      'reference': 'TEXT',
      'email': 'TEXT',
      'phone': 'TEXT',
      'url': 'TEXT'
    };
    
    return typeMap[fxFieldType] || 'TEXT';
  }
}
```

### 2. 動態表創建服務

```javascript
// workers/src/sync/schema-manager.js
export class SchemaManager {
  constructor(db) {
    this.db = db;
  }

  // 為新對象創建表
  async createTableForObject(objectApiName) {
    // 獲取對象和欄位定義
    const object = await this.getObjectDefinition(objectApiName);
    const fields = await this.getFieldDefinitions(objectApiName);
    
    // 生成CREATE TABLE語句
    const tableName = this.generateTableName(objectApiName);
    const columns = this.generateColumnDefinitions(fields);
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        fx_object_id TEXT UNIQUE NOT NULL,
        ${columns.join(',\n        ')},
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        fx_created_at DATETIME,
        fx_updated_at DATETIME,
        sync_version INTEGER DEFAULT 0,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `;
    
    // 執行創建表
    await this.db.exec(createTableSQL);
    
    // 創建索引
    await this.createIndexes(tableName, fields);
    
    // 更新對象定義
    await this.db.prepare(`
      UPDATE fx_object_definitions 
      SET table_name = ?, is_synced = TRUE 
      WHERE api_name = ?
    `).bind(tableName, objectApiName).run();
    
    // 記錄變更
    await this.logSchemaChange(objectApiName, 'ADD_TABLE', null, createTableSQL);
    
    return tableName;
  }

  // 生成表名（保持與CRM一致）
  generateTableName(objectApiName) {
    // 直接使用API名稱作為表名，轉為小寫並加下劃線
    return objectApiName.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1);
  }

  // 生成列定義
  generateColumnDefinitions(fields) {
    return fields.map(field => {
      const columnName = field.field_api_name;
      const dataType = field.data_type;
      const constraints = [];
      
      if (field.is_required) {
        constraints.push('NOT NULL');
      }
      
      if (field.default_value) {
        constraints.push(`DEFAULT '${field.default_value}'`);
      }
      
      return `${columnName} ${dataType} ${constraints.join(' ')}`.trim();
    });
  }

  // 創建索引
  async createIndexes(tableName, fields) {
    // 始終創建的索引
    await this.db.exec(`
      CREATE INDEX idx_${tableName}_fx_object_id ON ${tableName}(fx_object_id);
      CREATE INDEX idx_${tableName}_updated_at ON ${tableName}(updated_at);
    `);
    
    // 為reference類型欄位創建索引
    for (const field of fields) {
      if (field.field_type === 'reference') {
        await this.db.exec(`
          CREATE INDEX idx_${tableName}_${field.field_api_name} 
          ON ${tableName}(${field.field_api_name});
        `);
      }
    }
  }
}
```

### 3. Schema變更檢測與同步

```javascript
// workers/src/sync/schema-sync.js
export class SchemaSyncService {
  constructor(objectDiscovery, schemaManager, db) {
    this.objectDiscovery = objectDiscovery;
    this.schemaManager = schemaManager;
    this.db = db;
  }

  // 檢測並同步schema變更
  async syncSchemaChanges(objectApiName) {
    // 獲取CRM最新欄位定義
    const crmFields = await this.objectDiscovery.getObjectFields(objectApiName);
    
    // 獲取本地欄位定義
    const localFields = await this.getLocalFields(objectApiName);
    
    // 比較差異
    const changes = this.compareFields(crmFields, localFields);
    
    // 應用變更
    for (const change of changes) {
      await this.applySchemaChange(objectApiName, change);
    }
  }

  // 比較欄位差異
  compareFields(crmFields, localFields) {
    const changes = [];
    const crmFieldMap = new Map(crmFields.map(f => [f.apiName, f]));
    const localFieldMap = new Map(localFields.map(f => [f.field_api_name, f]));
    
    // 檢測新增欄位
    for (const [apiName, crmField] of crmFieldMap) {
      if (!localFieldMap.has(apiName)) {
        changes.push({
          type: 'ADD_FIELD',
          field: crmField
        });
      }
    }
    
    // 檢測刪除的欄位
    for (const [apiName, localField] of localFieldMap) {
      if (!crmFieldMap.has(apiName)) {
        changes.push({
          type: 'DROP_FIELD',
          field: localField
        });
      }
    }
    
    // 檢測修改的欄位
    for (const [apiName, crmField] of crmFieldMap) {
      const localField = localFieldMap.get(apiName);
      if (localField && this.isFieldModified(crmField, localField)) {
        changes.push({
          type: 'MODIFY_FIELD',
          oldField: localField,
          newField: crmField
        });
      }
    }
    
    return changes;
  }

  // 應用schema變更
  async applySchemaChange(objectApiName, change) {
    const tableName = await this.getTableName(objectApiName);
    let sql;
    
    switch (change.type) {
      case 'ADD_FIELD':
        sql = `ALTER TABLE ${tableName} ADD COLUMN ${change.field.apiName} ${this.mapFieldType(change.field.fieldType)}`;
        break;
        
      case 'DROP_FIELD':
        // D1不支持DROP COLUMN，標記為inactive
        await this.db.prepare(`
          UPDATE fx_field_definitions 
          SET is_active = FALSE 
          WHERE object_api_name = ? AND field_api_name = ?
        `).bind(objectApiName, change.field.field_api_name).run();
        return;
        
      case 'MODIFY_FIELD':
        // D1不支持ALTER COLUMN，記錄變更
        await this.logFieldModification(objectApiName, change);
        return;
    }
    
    // 執行SQL
    if (sql) {
      await this.db.exec(sql);
      
      // 記錄變更
      await this.logSchemaChange(objectApiName, change.type, change.field.apiName, sql);
    }
  }
}
```

### 4. Web管理界面

```javascript
// web-app/pages/admin/objects.js
import { useState, useEffect } from 'react';
import { Table, Button, Switch, Modal, message } from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';

export default function ObjectManagement() {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // 獲取CRM對象列表
  const fetchObjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/objects');
      const data = await res.json();
      setObjects(data);
    } catch (error) {
      message.error('獲取對象列表失敗');
    }
    setLoading(false);
  };

  // 啟用/禁用對象同步
  const toggleObjectSync = async (objectApiName, enabled) => {
    try {
      await fetch(`/api/admin/objects/${objectApiName}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      message.success(`${enabled ? '啟用' : '禁用'}同步成功`);
      fetchObjects();
    } catch (error) {
      message.error('操作失敗');
    }
  };

  // 同步對象Schema
  const syncObjectSchema = async (objectApiName) => {
    try {
      await fetch(`/api/admin/objects/${objectApiName}/sync-schema`, {
        method: 'POST'
      });
      
      message.success('Schema同步成功');
    } catch (error) {
      message.error('Schema同步失敗');
    }
  };

  const columns = [
    {
      title: 'API名稱',
      dataIndex: 'api_name',
      key: 'api_name',
    },
    {
      title: '顯示名稱',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: '是否自定義',
      dataIndex: 'is_custom',
      key: 'is_custom',
      render: (val) => val ? '是' : '否'
    },
    {
      title: '同步狀態',
      dataIndex: 'is_synced',
      key: 'is_synced',
      render: (val, record) => (
        <Switch 
          checked={val} 
          onChange={(checked) => toggleObjectSync(record.api_name, checked)}
        />
      )
    },
    {
      title: '最後同步時間',
      dataIndex: 'last_synced_at',
      key: 'last_synced_at',
      render: (val) => val ? new Date(val).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          <Button 
            type="link" 
            icon={<SyncOutlined />}
            onClick={() => syncObjectSchema(record.api_name)}
            disabled={!record.is_synced}
          >
            同步Schema
          </Button>
        </>
      )
    }
  ];

  useEffect(() => {
    fetchObjects();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={fetchObjects}
          loading={loading}
        >
          刷新對象列表
        </Button>
      </div>
      
      <Table 
        dataSource={objects}
        columns={columns}
        rowKey="api_name"
        loading={loading}
      />
    </div>
  );
}
```

## 關鍵設計原則

### 1. 欄位名稱嚴格映射
- 資料庫列名必須與CRM的field_api_name完全一致
- 不進行任何名稱轉換或格式化
- 保留CRM原始的命名規則

### 2. 資料類型映射
```javascript
const CRM_TO_SQL_TYPE_MAP = {
  'text': 'TEXT',
  'textarea': 'TEXT',
  'number': 'REAL',
  'currency': 'REAL',
  'percent': 'REAL',
  'date': 'DATE',
  'datetime': 'DATETIME',
  'boolean': 'BOOLEAN',
  'picklist': 'TEXT',
  'multipicklist': 'TEXT',
  'reference': 'TEXT',
  'email': 'TEXT',
  'phone': 'TEXT',
  'url': 'TEXT',
  'file': 'TEXT' // 存儲文件ID
};
```

### 3. 變更處理策略
- **新增欄位**: 使用ALTER TABLE ADD COLUMN
- **刪除欄位**: 標記為inactive，不實際刪除（D1限制）
- **修改欄位**: 記錄變更日誌，需要手動處理

## 監控與告警

### Schema變更監控
```javascript
// 定期檢查schema變更
export async function monitorSchemaChanges(env) {
  const enabledObjects = await getEnabledObjects(env.DB);
  
  for (const obj of enabledObjects) {
    const changes = await detectSchemaChanges(obj.api_name);
    
    if (changes.length > 0) {
      // 發送告警
      await sendAlert(env, {
        type: 'SCHEMA_CHANGE_DETECTED',
        object: obj.api_name,
        changes: changes
      });
    }
  }
}
```

## 最佳實踐

1. **定期同步**: 每天定時檢查schema變更
2. **變更審核**: 重要欄位變更需要人工確認
3. **備份策略**: 在應用schema變更前備份數據
4. **測試環境**: 先在測試環境驗證schema變更
5. **版本控制**: 記錄所有schema變更歷史