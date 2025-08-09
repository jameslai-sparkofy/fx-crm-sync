/**
 * 動態Schema管理器
 * 負責根據CRM定義創建和更新D1資料表結構
 * 嚴格遵守CRM欄位名稱，不做任何轉換
 */
export class SchemaManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * 為CRM對象創建對應的資料表
   * 表名和欄位名直接使用CRM的apiName
   */
  async createTableForObject(objectApiName) {
    try {
      // 獲取對象定義
      const object = await this.getObjectDefinition(objectApiName);
      if (!object) {
        throw new Error(`對象 ${objectApiName} 不存在`);
      }

      // 獲取欄位定義
      const fields = await this.getFieldDefinitions(objectApiName);
      
      // 如果沒有欄位定義，創建基本結構
      if (fields.length === 0) {
        console.log(`對象 ${objectApiName} 沒有欄位定義，創建基本表結構`);
        const tableName = objectApiName.toLowerCase();
        
        // 創建基本表結構（不依賴欄位定義）
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id TEXT PRIMARY KEY,
            fx_object_id TEXT UNIQUE NOT NULL,
            name TEXT,
            owner TEXT,
            created_by TEXT,
            updated_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            fx_created_at DATETIME,
            fx_updated_at DATETIME,
            sync_version INTEGER DEFAULT 0,
            is_deleted BOOLEAN DEFAULT FALSE
          )
        `;
        
        await this.db.prepare(createTableSQL).run();
        
        // 創建基本索引
        const basicIndexes = [
          `CREATE INDEX IF NOT EXISTS idx_${tableName}_fx_object_id ON ${tableName}(fx_object_id)`,
          `CREATE INDEX IF NOT EXISTS idx_${tableName}_updated_at ON ${tableName}(updated_at)`,
          `CREATE INDEX IF NOT EXISTS idx_${tableName}_is_deleted ON ${tableName}(is_deleted)`
        ];
        
        for (const indexSQL of basicIndexes) {
          await this.db.prepare(indexSQL).run();
        }
        
        // 更新對象定義記錄
        await this.db.prepare(`
          UPDATE fx_object_definitions 
          SET table_name = ?, is_synced = TRUE, last_synced_at = CURRENT_TIMESTAMP
          WHERE api_name = ?
        `).bind(tableName, objectApiName).run();
        
        await this.logSchemaChange(objectApiName, 'ADD_TABLE', null, createTableSQL, 'COMPLETED');
        console.log(`成功創建基本表 ${tableName} for ${objectApiName}`);
        return tableName;
      }

      // 使用CRM的apiName作為表名（轉換為小寫以符合SQL規範）
      const tableName = objectApiName.toLowerCase();
      
      // 生成列定義
      const columns = this.generateColumnDefinitions(fields);
      
      // 構建CREATE TABLE語句
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id TEXT PRIMARY KEY,
          fx_object_id TEXT UNIQUE NOT NULL,
          ${columns.join(',\n          ')},
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          fx_created_at DATETIME,
          fx_updated_at DATETIME,
          sync_version INTEGER DEFAULT 0,
          is_deleted BOOLEAN DEFAULT FALSE
        )
      `;
      
      // 執行創建表
      await this.db.prepare(createTableSQL).run();
      
      // 創建基本索引
      await this.createIndexes(tableName, fields);
      
      // 更新對象定義記錄
      await this.db.prepare(`
        UPDATE fx_object_definitions 
        SET table_name = ?, is_synced = TRUE, last_synced_at = CURRENT_TIMESTAMP
        WHERE api_name = ?
      `).bind(tableName, objectApiName).run();
      
      // 記錄schema變更
      await this.logSchemaChange(objectApiName, 'ADD_TABLE', null, createTableSQL, 'COMPLETED');
      
      console.log(`成功創建表 ${tableName} for ${objectApiName}`);
      return tableName;
    } catch (error) {
      console.error(`創建表失敗:`, error);
      await this.logSchemaChange(objectApiName, 'ADD_TABLE', null, null, 'FAILED', error.message);
      throw error;
    }
  }

  /**
   * 生成列定義，使用CRM原始欄位名
   */
  generateColumnDefinitions(fields) {
    const columns = [];
    
    for (const field of fields) {
      // 直接使用CRM的field_api_name作為列名
      const columnName = field.field_api_name;
      const dataType = field.data_type;
      const constraints = [];
      
      // 添加約束
      if (field.is_required && !this.isSystemField(columnName)) {
        constraints.push('NOT NULL');
      }
      
      if (field.default_value) {
        // 根據資料類型處理預設值
        if (dataType === 'BOOLEAN') {
          constraints.push(`DEFAULT ${field.default_value === 'true' ? 'TRUE' : 'FALSE'}`);
        } else if (dataType === 'REAL' || dataType === 'INTEGER') {
          constraints.push(`DEFAULT ${field.default_value}`);
        } else {
          constraints.push(`DEFAULT '${field.default_value}'`);
        }
      }
      
      const columnDef = `${columnName} ${dataType} ${constraints.join(' ')}`.trim();
      columns.push(columnDef);
    }
    
    return columns;
  }

  /**
   * 創建索引
   */
  async createIndexes(tableName, fields) {
    // 創建基本索引
    const basicIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_fx_object_id ON ${tableName}(fx_object_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_updated_at ON ${tableName}(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_is_deleted ON ${tableName}(is_deleted)`
    ];
    
    for (const sql of basicIndexes) {
      await this.db.exec(sql);
    }
    
    // 為reference和lookup類型欄位創建索引
    for (const field of fields) {
      if (['reference', 'lookup'].includes(field.field_type)) {
        const indexName = `idx_${tableName}_${field.field_api_name}`;
        const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${field.field_api_name})`;
        await this.db.exec(sql);
      }
    }
  }

  /**
   * 添加新欄位到現有表
   */
  async addFieldToTable(objectApiName, field) {
    try {
      const tableName = await this.getTableName(objectApiName);
      const columnDef = this.generateColumnDefinition(field);
      
      const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`;
      await this.db.exec(sql);
      
      await this.logSchemaChange(objectApiName, 'ADD_FIELD', field.field_api_name, sql, 'COMPLETED');
      console.log(`成功添加欄位 ${field.field_api_name} 到表 ${tableName}`);
    } catch (error) {
      console.error(`添加欄位失敗:`, error);
      await this.logSchemaChange(objectApiName, 'ADD_FIELD', field.field_api_name, null, 'FAILED', error.message);
      throw error;
    }
  }

  /**
   * 生成單個欄位的列定義
   */
  generateColumnDefinition(field) {
    const columnName = field.field_api_name;
    const dataType = field.data_type;
    const constraints = [];
    
    if (field.default_value) {
      if (dataType === 'BOOLEAN') {
        constraints.push(`DEFAULT ${field.default_value === 'true' ? 'TRUE' : 'FALSE'}`);
      } else if (dataType === 'REAL' || dataType === 'INTEGER') {
        constraints.push(`DEFAULT ${field.default_value}`);
      } else {
        constraints.push(`DEFAULT '${field.default_value}'`);
      }
    }
    
    return `${columnName} ${dataType} ${constraints.join(' ')}`.trim();
  }

  /**
   * 獲取對象定義
   */
  async getObjectDefinition(objectApiName) {
    return await this.db.prepare(`
      SELECT * FROM fx_object_definitions WHERE api_name = ?
    `).bind(objectApiName).first();
  }

  /**
   * 獲取欄位定義
   */
  async getFieldDefinitions(objectApiName) {
    const result = await this.db.prepare(`
      SELECT * FROM fx_field_definitions 
      WHERE object_api_name = ? AND is_active = TRUE
      ORDER BY field_api_name
    `).bind(objectApiName).all();
    
    return result.results;
  }

  /**
   * 獲取表名
   */
  async getTableName(objectApiName) {
    const object = await this.getObjectDefinition(objectApiName);
    if (!object || !object.table_name) {
      throw new Error(`對象 ${objectApiName} 尚未創建表`);
    }
    return object.table_name;
  }

  /**
   * 檢查是否為系統欄位
   */
  isSystemField(fieldName) {
    const systemFields = [
      'id', 'fx_object_id', 'created_at', 'updated_at',
      'fx_created_at', 'fx_updated_at', 'sync_version', 'is_deleted'
    ];
    return systemFields.includes(fieldName);
  }

  /**
   * 記錄schema變更
   */
  async logSchemaChange(objectApiName, changeType, fieldApiName, sql, status, errorMessage = null) {
    await this.db.prepare(`
      INSERT INTO schema_change_logs (
        object_api_name, change_type, field_api_name, 
        sql_executed, status, error_message, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      objectApiName,
      changeType,
      fieldApiName,
      sql,
      status,
      errorMessage
    ).run();
  }

  /**
   * 檢查表是否存在
   */
  async tableExists(tableName) {
    const result = await this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).bind(tableName).first();
    
    return !!result;
  }
}