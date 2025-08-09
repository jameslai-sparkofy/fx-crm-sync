/**
 * 欄位同步管理器 - 動態比對CRM和D1的欄位差異
 */

export class FieldSyncManager {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
  }

  /**
   * 獲取CRM中對象的所有欄位
   */
  async getCRMFields(objectApiName) {
    const isCustom = objectApiName.endsWith('__c');
    let fields = [];

    try {
      if (isCustom) {
        // 自定義對象 - 先嘗試 describe API
        try {
          const response = await this.fxClient.post('/cgi/crm/custom/v2/object/describe', {
            apiName: objectApiName
          });
          
          if (response.errorCode === 0 && response.data?.fields) {
            fields = response.data.fields.map(field => ({
              apiName: field.apiName,
              label: field.label || field.apiName,
              dataType: field.dataType || 'TEXT',
              required: field.required || false,
              maxLength: field.maxLength,
              defaultValue: field.defaultValue,
              description: field.description || '',
              source: 'describe_api'
            }));
            
            console.log(`✅ 從 Describe API 獲取到 ${fields.length} 個欄位: ${objectApiName}`);
            return fields;
          }
        } catch (describeError) {
          console.log(`⚠️ Describe API 失敗，嘗試從數據推斷: ${describeError.message}`);
        }
        
        // 如果 describe 失敗，從實際數據推斷
        const queryResponse = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
          data: {
            dataObjectApiName: objectApiName,
            search_query_info: {
              limit: 10, // 取多條記錄來更好地推斷欄位
              offset: 0,
              filters: []
            }
          }
        });
        
        if (queryResponse.errorCode === 0 && queryResponse.data?.dataList?.length > 0) {
          // 合併多條記錄的欄位
          const allFields = new Set();
          queryResponse.data.dataList.forEach(record => {
            Object.keys(record).forEach(key => {
              if (key !== 'searchAfterId' && key !== 'total_num') {
                allFields.add(key);
              }
            });
          });
          
          fields = Array.from(allFields).map(key => {
            // 從所有記錄中找第一個非空值來推斷類型
            let sampleValue = null;
            for (const record of queryResponse.data.dataList) {
              if (record[key] != null) {
                sampleValue = record[key];
                break;
              }
            }
            
            return {
              apiName: key,
              label: this.formatFieldLabel(key),
              dataType: this.inferDataType(sampleValue),
              required: false,
              description: '',
              source: 'data_inference'
            };
          });
        }
        
      } else {
        // 標準對象 - 從樣本數據推斷
        const queryResponse = await this.fxClient.post('/cgi/crm/v2/data/query', {
          data: {
            dataObjectApiName: objectApiName,
            search_query_info: {
              limit: 10,
              offset: 0,
              filters: []
            }
          }
        });
        
        if (queryResponse.errorCode === 0 && queryResponse.data?.dataList?.length > 0) {
          const allFields = new Set();
          queryResponse.data.dataList.forEach(record => {
            Object.keys(record).forEach(key => {
              if (key !== 'searchAfterId' && key !== 'total_num') {
                allFields.add(key);
              }
            });
          });
          
          fields = Array.from(allFields).map(key => {
            let sampleValue = null;
            for (const record of queryResponse.data.dataList) {
              if (record[key] != null) {
                sampleValue = record[key];
                break;
              }
            }
            
            return {
              apiName: key,
              label: this.formatFieldLabel(key),
              dataType: this.inferDataType(sampleValue),
              required: false,
              description: '',
              source: 'data_inference'
            };
          });
        }
      }
      
      console.log(`✅ 從CRM獲取到 ${fields.length} 個欄位: ${objectApiName}`);
      return fields;
      
    } catch (error) {
      console.error(`❌ 獲取CRM欄位失敗 ${objectApiName}:`, error.message);
      throw error;
    }
  }

  /**
   * 獲取D1資料庫中表的欄位
   */
  async getD1Fields(tableName) {
    try {
      const result = await this.db.prepare(
        `SELECT name, type FROM pragma_table_info(?)`
      ).bind(tableName).all();
      
      if (!result.results) {
        console.log(`⚠️ 表 ${tableName} 不存在於D1中`);
        return [];
      }
      
      const fields = result.results.map(row => ({
        apiName: row.name,
        dataType: row.type,
        source: 'd1_schema'
      }));
      
      console.log(`✅ 從D1獲取到 ${fields.length} 個欄位: ${tableName}`);
      return fields;
      
    } catch (error) {
      console.error(`❌ 獲取D1欄位失敗 ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * 比對CRM和D1的欄位差異
   */
  async compareFields(objectApiName, tableName) {
    console.log(`\n🔍 開始比對欄位: ${objectApiName} <-> ${tableName}`);
    
    // 獲取CRM和D1的欄位
    const [crmFields, d1Fields] = await Promise.all([
      this.getCRMFields(objectApiName),
      this.getD1Fields(tableName)
    ]);
    
    // 創建D1欄位映射
    const d1FieldMap = new Map();
    d1Fields.forEach(field => {
      d1FieldMap.set(field.apiName, field);
    });
    
    // 找出需要添加的欄位（CRM中有但D1中沒有）
    const fieldsToAdd = [];
    const fieldsToUpdate = [];
    
    crmFields.forEach(crmField => {
      if (!d1FieldMap.has(crmField.apiName)) {
        fieldsToAdd.push(crmField);
      } else {
        // 欄位存在，檢查是否需要更新
        const d1Field = d1FieldMap.get(crmField.apiName);
        if (this.shouldUpdateField(crmField, d1Field)) {
          fieldsToUpdate.push({
            apiName: crmField.apiName,
            oldType: d1Field.dataType,
            newType: this.mapCRMTypeToD1Type(crmField.dataType),
            crmField
          });
        }
      }
    });
    
    // 找出可能需要刪除的欄位（D1中有但CRM中沒有）
    const crmFieldNames = new Set(crmFields.map(f => f.apiName));
    const fieldsToRemove = d1Fields.filter(d1Field => 
      !crmFieldNames.has(d1Field.apiName) && 
      !this.isSystemField(d1Field.apiName)
    );
    
    const comparison = {
      objectApiName,
      tableName,
      crmFields: crmFields.length,
      d1Fields: d1Fields.length,
      fieldsToAdd,
      fieldsToUpdate,
      fieldsToRemove,
      isUpToDate: fieldsToAdd.length === 0 && fieldsToUpdate.length === 0
    };
    
    console.log(`📊 比對結果: 新增=${fieldsToAdd.length}, 更新=${fieldsToUpdate.length}, 移除=${fieldsToRemove.length}`);
    
    return comparison;
  }

  /**
   * 執行欄位同步（添加新欄位）
   */
  async syncFields(comparison) {
    if (comparison.isUpToDate) {
      console.log(`✅ ${comparison.objectApiName} 欄位已是最新`);
      return { success: true, changes: [] };
    }
    
    const changes = [];
    
    // 添加新欄位
    for (const field of comparison.fieldsToAdd) {
      try {
        const d1Type = this.mapCRMTypeToD1Type(field.dataType);
        const sql = `ALTER TABLE ${comparison.tableName} ADD COLUMN ${field.apiName} ${d1Type}`;
        
        await this.db.prepare(sql).run();
        
        changes.push({
          action: 'ADD',
          fieldName: field.apiName,
          fieldType: d1Type,
          label: field.label
        });
        
        console.log(`✅ 添加欄位: ${field.apiName} (${d1Type})`);
        
        // 如果是引用欄位，還要添加關聯欄位
        if (field.dataType === 'LOOKUP' || field.dataType === 'REFERENCE') {
          const relationFields = [
            `${field.apiName}__r`,
            `${field.apiName}__relation_ids`
          ];
          
          for (const relationField of relationFields) {
            try {
              const relationSql = `ALTER TABLE ${comparison.tableName} ADD COLUMN ${relationField} TEXT`;
              await this.db.prepare(relationSql).run();
              changes.push({
                action: 'ADD',
                fieldName: relationField,
                fieldType: 'TEXT',
                label: `${field.label} 關聯`
              });
              console.log(`✅ 添加關聯欄位: ${relationField}`);
            } catch (relationError) {
              if (!relationError.message.includes('duplicate column')) {
                console.error(`⚠️ 添加關聯欄位失敗 ${relationField}:`, relationError.message);
              }
            }
          }
        }
        
      } catch (error) {
        if (error.message.includes('duplicate column')) {
          console.log(`ℹ️ 欄位已存在: ${field.apiName}`);
        } else {
          console.error(`❌ 添加欄位失敗 ${field.apiName}:`, error.message);
          changes.push({
            action: 'ERROR',
            fieldName: field.apiName,
            error: error.message
          });
        }
      }
    }
    
    return { success: true, changes };
  }

  /**
   * 更新欄位對應表
   */
  async updateFieldMappings(objectApiName, crmFields) {
    try {
      // 先刪除舊的欄位定義
      await this.db.prepare(`
        DELETE FROM fx_field_definitions 
        WHERE object_api_name = ?
      `).bind(objectApiName).run();
      
      // 插入新的欄位定義
      const insertStmt = this.db.prepare(`
        INSERT INTO fx_field_definitions (
          object_api_name, field_api_name, field_label, field_type, 
          is_required, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      for (const field of crmFields) {
        await insertStmt.bind(
          objectApiName,
          field.apiName,
          field.label,
          field.dataType,
          field.required ? 1 : 0,
          field.description || ''
        ).run();
      }
      
      console.log(`✅ 更新欄位對應表: ${objectApiName} (${crmFields.length}個欄位)`);
      
    } catch (error) {
      console.error(`❌ 更新欄位對應表失敗 ${objectApiName}:`, error.message);
      throw error;
    }
  }

  /**
   * 格式化欄位標籤
   */
  formatFieldLabel(apiName) {
    return apiName
      .replace(/__c$/, '')
      .replace(/__r$/, '_關聯')
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * 推斷數據類型
   */
  inferDataType(value) {
    if (value === null || value === undefined) return 'TEXT';
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (Array.isArray(value)) return 'MULTISELECT';
    if (typeof value === 'object') return 'OBJECT';
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'DATETIME';
      if (/^\d+$/.test(value) && value.length > 10) return 'TIMESTAMP';
      return 'TEXT';
    }
    return 'TEXT';
  }

  /**
   * 映射CRM數據類型到D1數據類型
   */
  mapCRMTypeToD1Type(crmType) {
    const typeMap = {
      'TEXT': 'TEXT',
      'NUMBER': 'REAL',
      'BOOLEAN': 'BOOLEAN',
      'DATETIME': 'TEXT',
      'DATE': 'TEXT',
      'TIMESTAMP': 'INTEGER',
      'LOOKUP': 'TEXT',
      'REFERENCE': 'TEXT',
      'MULTISELECT': 'TEXT',
      'SELECT': 'TEXT',
      'OBJECT': 'TEXT',
      'ARRAY': 'TEXT',
      'IMAGE': 'TEXT',
      'ATTACHMENT': 'TEXT',
      'AUTO_NUMBER': 'TEXT',
      'CURRENCY': 'REAL',
      'PERCENT': 'REAL',
      'EMAIL': 'TEXT',
      'PHONE': 'TEXT',
      'URL': 'TEXT'
    };
    
    return typeMap[crmType] || 'TEXT';
  }

  /**
   * 判斷是否應該更新欄位
   */
  shouldUpdateField(crmField, d1Field) {
    const expectedD1Type = this.mapCRMTypeToD1Type(crmField.dataType);
    return d1Field.dataType !== expectedD1Type;
  }

  /**
   * 判斷是否為系統欄位（不應刪除）
   */
  isSystemField(fieldName) {
    const systemFields = [
      '_id', 'name', 'owner', 'owner__r', 'owner_department', 'owner_department_id',
      'create_time', 'created_by', 'created_by__r', 'last_modified_time', 
      'last_modified_by', 'last_modified_by__r', 'life_status', 'life_status__r',
      'lock_status', 'lock_status__r', 'is_deleted', 'record_type', 'version',
      'data_own_department', 'data_own_department__r', 'relevant_team', 'total_num',
      'sync_version', 'fx_created_at', 'fx_updated_at', 'sync_time'
    ];
    
    return systemFields.includes(fieldName);
  }
}