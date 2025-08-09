/**
 * CRM對象發現服務
 * 負責從紛享銷客動態讀取對象和欄位定義
 */
export class ObjectDiscoveryService {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
  }

  /**
   * 從CRM獲取所有可用對象列表
   * 注意：返回的對象apiName必須保持原樣，不做任何轉換
   */
  async discoverObjects() {
    try {
      // 調用紛享銷客API獲取對象列表
      const response = await this.fxClient.post('/cgi/crm/v2/object/list', {
        corpId: this.fxClient.corpId,
        corpAccessToken: this.fxClient.accessToken,
        currentOpenUserId: this.fxClient.currentOpenUserId
      });

      if (response.errorCode !== 0) {
        throw new Error(`獲取對象列表失敗: ${response.errorMessage}`);
      }

      const objects = response.data.objects || [];
      
      // 更新本地對象定義，保持原始API名稱
      for (const obj of objects) {
        // 處理欄位名稱（根據新的 API 響應格式）
        const apiName = obj.describeApiName || obj.apiName;
        const displayName = obj.describeDisplayName || obj.displayName || obj.label;
        const isCustom = apiName.includes('__c');
        const objectId = obj.objectId || apiName; // 如果沒有 objectId，使用 apiName
        
        await this.db.prepare(`
          INSERT INTO fx_object_definitions (
            id, api_name, display_name, description, is_custom
          ) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(api_name) DO UPDATE SET
            display_name = excluded.display_name,
            description = excluded.description,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          objectId,
          apiName,            // 保持CRM原始API名稱
          displayName,
          obj.description || '',
          isCustom
        ).run();
      }
      
      console.log(`發現 ${objects.length} 個CRM對象`);
      return objects.map(obj => ({
        objectId: obj.objectId || obj.describeApiName || obj.apiName,
        apiName: obj.describeApiName || obj.apiName,
        displayName: obj.describeDisplayName || obj.displayName || obj.label,
        description: obj.description || '',
        isCustom: (obj.describeApiName || obj.apiName || '').includes('__c')
      }));
    } catch (error) {
      console.error('發現對象失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取指定對象的所有欄位定義
   * @param {string} objectApiName - CRM對象的原始API名稱
   */
  async getObjectFields(objectApiName) {
    try {
      // 調用紛享銷客describe API
      const response = await this.fxClient.post('/cgi/crm/v2/object/describe', {
        corpId: this.fxClient.corpId,
        corpAccessToken: this.fxClient.accessToken,
        currentOpenUserId: this.fxClient.currentOpenUserId,
        objectApiName: objectApiName
      });

      if (response.errorCode !== 0) {
        throw new Error(`獲取對象欄位失敗: ${response.errorMessage}`);
      }

      return response.data.fields || [];
    } catch (error) {
      console.error(`獲取對象 ${objectApiName} 的欄位失敗:`, error);
      throw error;
    }
  }

  /**
   * 同步欄位定義到本地資料庫
   * 嚴格保持CRM的欄位apiName不變
   */
  async syncFieldDefinitions(objectApiName) {
    try {
      const fields = await this.getObjectFields(objectApiName);
      
      // 記錄現有欄位以便檢測刪除
      const existingFields = await this.db.prepare(`
        SELECT field_api_name FROM fx_field_definitions 
        WHERE object_api_name = ? AND is_active = TRUE
      `).bind(objectApiName).all();
      
      const existingFieldNames = new Set(existingFields.results.map(f => f.field_api_name));
      const currentFieldNames = new Set();

      // 同步每個欄位
      for (const field of fields) {
        currentFieldNames.add(field.apiName);
        
        await this.db.prepare(`
          INSERT INTO fx_field_definitions (
            id, object_api_name, field_api_name, display_name,
            field_type, data_type, is_required, is_custom, 
            default_value, options, validation_rules
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(object_api_name, field_api_name) DO UPDATE SET
            display_name = excluded.display_name,
            field_type = excluded.field_type,
            data_type = excluded.data_type,
            is_required = excluded.is_required,
            default_value = excluded.default_value,
            options = excluded.options,
            validation_rules = excluded.validation_rules,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          field.fieldId,
          objectApiName,
          field.apiName,              // 保持CRM原始欄位名稱
          field.displayName,
          field.fieldType,
          this.mapFieldType(field.fieldType),
          field.isRequired || false,
          field.isCustom || false,
          field.defaultValue || null,
          JSON.stringify(field.options || []),
          JSON.stringify(field.validationRules || {})
        ).run();
      }

      // 標記已刪除的欄位
      for (const existingFieldName of existingFieldNames) {
        if (!currentFieldNames.has(existingFieldName)) {
          await this.db.prepare(`
            UPDATE fx_field_definitions 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE object_api_name = ? AND field_api_name = ?
          `).bind(objectApiName, existingFieldName).run();
          
          // 記錄欄位刪除
          await this.logFieldChange(objectApiName, existingFieldName, 'DROP_FIELD');
        }
      }

      console.log(`同步 ${objectApiName} 的 ${fields.length} 個欄位定義`);
    } catch (error) {
      console.error(`同步欄位定義失敗:`, error);
      throw error;
    }
  }

  /**
   * 映射CRM欄位類型到SQL資料類型
   * 保持與CRM的資料格式一致性
   */
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
      'url': 'TEXT',
      'file': 'TEXT',
      'image': 'TEXT',
      'lookup': 'TEXT',
      'formula': 'TEXT',
      'autonumber': 'TEXT'
    };
    
    return typeMap[fxFieldType.toLowerCase()] || 'TEXT';
  }

  /**
   * 記錄欄位變更
   */
  async logFieldChange(objectApiName, fieldApiName, changeType) {
    await this.db.prepare(`
      INSERT INTO schema_change_logs (
        object_api_name, change_type, field_api_name, 
        status, created_at
      ) VALUES (?, ?, ?, 'DETECTED', CURRENT_TIMESTAMP)
    `).bind(objectApiName, changeType, fieldApiName).run();
  }

  /**
   * 獲取已啟用同步的對象列表
   */
  async getEnabledObjects() {
    const result = await this.db.prepare(`
      SELECT * FROM fx_object_definitions 
      WHERE is_enabled = TRUE AND is_synced = TRUE
      ORDER BY display_name
    `).all();
    
    return result.results;
  }

  /**
   * 檢查對象是否存在
   */
  async objectExists(objectApiName) {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM fx_object_definitions 
      WHERE api_name = ?
    `).bind(objectApiName).first();
    
    return result.count > 0;
  }
}