/**
 * 欄位變更檢測器
 * 檢測 CRM 對象的欄位是否有新增或刪除
 */
export class FieldChangeDetector {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
  }

  /**
   * 檢測欄位變更
   * @param {string} objectApiName - 對象 API 名稱
   * @returns {object} 變更結果
   */
  async detectFieldChanges(objectApiName) {
    try {
      console.log(`[FieldChangeDetector] 開始檢測 ${objectApiName} 的欄位變更`);
      
      // 1. 獲取 CRM 當前欄位定義
      const currentFields = await this.fetchCurrentFields(objectApiName);
      
      // 2. 獲取資料庫中記錄的欄位
      const storedFields = await this.getStoredFields(objectApiName);
      
      // 3. 比較差異
      const changes = this.compareFields(currentFields, storedFields);
      
      // 4. 如果有變更，記錄到資料庫
      if (changes.hasChanges) {
        await this.recordFieldChanges(objectApiName, changes);
      }
      
      return changes;
      
    } catch (error) {
      console.error('[FieldChangeDetector] 檢測失敗:', error);
      throw error;
    }
  }

  /**
   * 從 CRM 獲取當前欄位定義
   */
  async fetchCurrentFields(objectApiName) {
    const isCustomObject = objectApiName.includes('__c');
    const apiPath = isCustomObject 
      ? '/cgi/crm/custom/v2/object/describe'
      : '/cgi/crm/v2/object/describe';
    
    const response = await this.fxClient.post(apiPath, {
      data: {
        apiName: objectApiName
      }
    });
    
    if (response.errorCode !== 0) {
      throw new Error(`獲取欄位定義失敗: ${response.errorMessage}`);
    }
    
    // 提取欄位資訊
    const fields = response.data?.fields || [];
    return fields.map(field => ({
      apiName: field.api_name,
      label: field.label,
      dataType: field.data_type,
      required: field.required || false,
      custom: field.custom || false,
      description: field.description || ''
    }));
  }

  /**
   * 獲取資料庫中記錄的欄位
   */
  async getStoredFields(objectApiName) {
    const result = await this.db.prepare(`
      SELECT field_definitions 
      FROM fx_object_definitions 
      WHERE api_name = ?
    `).bind(objectApiName).first();
    
    if (!result || !result.field_definitions) {
      return [];
    }
    
    return JSON.parse(result.field_definitions);
  }

  /**
   * 比較欄位差異
   */
  compareFields(currentFields, storedFields) {
    const currentMap = new Map(currentFields.map(f => [f.apiName, f]));
    const storedMap = new Map(storedFields.map(f => [f.apiName, f]));
    
    const addedFields = [];
    const removedFields = [];
    const modifiedFields = [];
    
    // 檢查新增的欄位
    for (const [apiName, field] of currentMap) {
      if (!storedMap.has(apiName)) {
        addedFields.push(field);
      } else {
        // 檢查欄位屬性是否有變更
        const storedField = storedMap.get(apiName);
        if (this.isFieldModified(field, storedField)) {
          modifiedFields.push({
            apiName,
            changes: this.getFieldChanges(field, storedField)
          });
        }
      }
    }
    
    // 檢查刪除的欄位
    for (const [apiName, field] of storedMap) {
      if (!currentMap.has(apiName)) {
        removedFields.push(field);
      }
    }
    
    return {
      hasChanges: addedFields.length > 0 || removedFields.length > 0 || modifiedFields.length > 0,
      addedFields,
      removedFields,
      modifiedFields,
      summary: {
        added: addedFields.length,
        removed: removedFields.length,
        modified: modifiedFields.length
      }
    };
  }

  /**
   * 檢查欄位是否被修改
   */
  isFieldModified(currentField, storedField) {
    return currentField.dataType !== storedField.dataType ||
           currentField.required !== storedField.required ||
           currentField.label !== storedField.label;
  }

  /**
   * 獲取欄位變更詳情
   */
  getFieldChanges(currentField, storedField) {
    const changes = [];
    
    if (currentField.dataType !== storedField.dataType) {
      changes.push({
        property: 'dataType',
        oldValue: storedField.dataType,
        newValue: currentField.dataType
      });
    }
    
    if (currentField.required !== storedField.required) {
      changes.push({
        property: 'required',
        oldValue: storedField.required,
        newValue: currentField.required
      });
    }
    
    if (currentField.label !== storedField.label) {
      changes.push({
        property: 'label',
        oldValue: storedField.label,
        newValue: currentField.label
      });
    }
    
    return changes;
  }

  /**
   * 記錄欄位變更
   */
  async recordFieldChanges(objectApiName, changes) {
    await this.db.prepare(`
      INSERT INTO field_change_logs (
        object_api_name,
        change_type,
        change_details,
        detected_at
      ) VALUES (?, ?, ?, ?)
    `).bind(
      objectApiName,
      'field_changes',
      JSON.stringify(changes),
      new Date().toISOString()
    ).run();
    
    console.log(`[FieldChangeDetector] 已記錄 ${objectApiName} 的欄位變更:`, changes.summary);
  }

  /**
   * 生成 ALTER TABLE 語句建議（不自動執行）
   */
  generateAlterTableSuggestions(tableName, changes) {
    const suggestions = [];
    
    // 新增欄位的建議
    for (const field of changes.addedFields) {
      const dataType = this.mapToSQLiteType(field.dataType);
      const nullable = field.required ? 'NOT NULL DEFAULT \'\'' : '';
      
      suggestions.push({
        type: 'ADD_COLUMN',
        sql: `ALTER TABLE ${tableName} ADD COLUMN ${field.apiName} ${dataType} ${nullable};`,
        warning: '新增欄位將使用預設值填充現有記錄'
      });
    }
    
    // 刪除欄位的建議（SQLite 不直接支援，需要重建表）
    if (changes.removedFields.length > 0) {
      suggestions.push({
        type: 'REMOVE_COLUMNS',
        sql: '-- SQLite 不支援直接刪除欄位，需要重建表',
        warning: '刪除欄位需要重建表，可能造成數據丟失',
        fields: changes.removedFields.map(f => f.apiName)
      });
    }
    
    return suggestions;
  }

  /**
   * 映射 CRM 資料類型到 SQLite 資料類型
   */
  mapToSQLiteType(crmType) {
    const typeMap = {
      'text': 'TEXT',
      'number': 'REAL',
      'integer': 'INTEGER',
      'boolean': 'BOOLEAN',
      'date': 'INTEGER',
      'datetime': 'INTEGER',
      'picklist': 'TEXT',
      'multipicklist': 'TEXT',
      'reference': 'TEXT',
      'url': 'TEXT',
      'email': 'TEXT',
      'phone': 'TEXT',
      'textarea': 'TEXT',
      'percent': 'REAL',
      'currency': 'TEXT',
      'formula': 'TEXT',
      'image': 'TEXT' // 儲存圖片 URL 或 R2 object key
    };
    
    return typeMap[crmType] || 'TEXT';
  }
}