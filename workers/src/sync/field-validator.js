/**
 * 欄位驗證器 - 確保 D1 資料庫與 CRM 欄位保持同步
 * 
 * 功能：
 * 1. 在每次同步前檢查 CRM 和 D1 的欄位差異
 * 2. 自動添加缺失的欄位
 * 3. 記錄欄位變更歷史
 * 4. 提供欄位映射和類型轉換
 */

class FieldValidator {
  constructor(db, fxClient) {
    this.db = db;
    this.fxClient = fxClient;
  }

  /**
   * 檢查並同步欄位結構
   * @param {string} objectApiName - CRM 對象 API 名稱
   * @returns {Promise<Object>} 同步結果
   */
  async validateAndSyncFields(objectApiName) {
    console.log(`[欄位驗證] 開始檢查 ${objectApiName} 的欄位結構`);
    
    try {
      // 1. 獲取 CRM 的欄位結構
      const crmFields = await this.fetchCRMFields(objectApiName);
      console.log(`[欄位驗證] CRM 有 ${crmFields.length} 個欄位`);
      
      // 2. 獲取 D1 的欄位結構
      const d1Fields = await this.fetchD1Fields(objectApiName);
      console.log(`[欄位驗證] D1 有 ${d1Fields.size} 個欄位`);
      
      // 3. 比對差異
      const missingFields = [];
      const extraFields = [];
      const fieldMap = new Map();
      
      // 找出缺失的欄位（在 CRM 有但 D1 沒有）
      for (const field of crmFields) {
        fieldMap.set(field.apiName, field);
        if (!d1Fields.has(field.apiName)) {
          missingFields.push(field);
        }
      }
      
      // 找出多餘的欄位（在 D1 有但 CRM 沒有）
      for (const d1Field of d1Fields) {
        if (!fieldMap.has(d1Field) && 
            !this.isSystemField(d1Field)) { // 排除系統欄位
          extraFields.push(d1Field);
        }
      }
      
      console.log(`[欄位驗證] 缺失欄位: ${missingFields.length}, 多餘欄位: ${extraFields.length}`);
      
      // 4. 處理缺失的欄位
      if (missingFields.length > 0) {
        console.log('[欄位驗證] 開始添加缺失的欄位...');
        for (const field of missingFields) {
          await this.addFieldToD1(objectApiName, field);
        }
      }
      
      // 5. 記錄欄位變更
      if (missingFields.length > 0 || extraFields.length > 0) {
        await this.logFieldChanges(objectApiName, missingFields, extraFields);
      }
      
      return {
        success: true,
        crmFieldCount: crmFields.length,
        d1FieldCount: d1Fields.size,
        missingFields: missingFields.map(f => f.apiName),
        extraFields: extraFields,
        fieldsAdded: missingFields.length
      };
      
    } catch (error) {
      console.error(`[欄位驗證] 錯誤:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 從 CRM 獲取欄位定義
   */
  async fetchCRMFields(objectApiName) {
    // 檢查是否有預定義的欄位映射
    const fieldMappings = await this.getFieldMappings(objectApiName);
    if (fieldMappings) {
      return fieldMappings;
    }
    
    // 動態獲取欄位（通過查詢第一條記錄）
    console.log(`[欄位驗證] 動態獲取 ${objectApiName} 的欄位`);
    
    try {
      const isCustomObject = objectApiName.endsWith('__c');
      const endpoint = isCustomObject ? 
        '/cgi/crm/custom/v2/data/query' : 
        '/cgi/crm/v2/data/query';
      
      const response = await this.fxClient.post(endpoint, {
        data: {
          dataObjectApiName: objectApiName,
          search_query_info: {
            limit: 1,
            offset: 0
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取 CRM 欄位失敗: ${response.errorMessage}`);
      }
      
      const sampleRecord = response.data?.dataList?.[0];
      if (!sampleRecord) {
        console.log(`[欄位驗證] ${objectApiName} 沒有數據，使用預定義欄位`);
        return this.getDefaultFields(objectApiName);
      }
      
      // 從樣本記錄提取欄位
      const fields = [];
      for (const [key, value] of Object.entries(sampleRecord)) {
        if (key !== 'searchAfterId') {
          fields.push({
            apiName: key,
            dataType: this.detectFieldType(value),
            label: key,
            required: false
          });
        }
      }
      
      return fields;
      
    } catch (error) {
      console.error(`[欄位驗證] 無法動態獲取欄位，使用預定義:`, error.message);
      return this.getDefaultFields(objectApiName);
    }
  }

  /**
   * 從 D1 獲取表格欄位
   */
  async fetchD1Fields(objectApiName) {
    const fields = new Set();
    
    try {
      // 使用 PRAGMA 獲取表格資訊
      const result = await this.db.prepare(
        `SELECT name FROM pragma_table_info('${objectApiName}')`
      ).all();
      
      for (const row of result.results) {
        fields.add(row.name);
      }
    } catch (error) {
      console.log(`[欄位驗證] 表格 ${objectApiName} 可能不存在`);
    }
    
    return fields;
  }

  /**
   * 添加欄位到 D1
   */
  async addFieldToD1(tableName, field) {
    try {
      const columnType = this.mapToSQLType(field.dataType);
      const columnName = `"${field.apiName}"`;
      
      console.log(`[欄位驗證] 添加欄位 ${field.apiName} (${columnType}) 到 ${tableName}`);
      
      await this.db.prepare(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`
      ).run();
      
      console.log(`[欄位驗證] ✅ 成功添加欄位 ${field.apiName}`);
      
    } catch (error) {
      // 欄位可能已存在（並發添加的情況）
      if (error.message.includes('duplicate column name')) {
        console.log(`[欄位驗證] 欄位 ${field.apiName} 已存在`);
      } else {
        console.error(`[欄位驗證] 添加欄位 ${field.apiName} 失敗:`, error.message);
      }
    }
  }

  /**
   * 偵測欄位類型
   */
  detectFieldType(value) {
    if (value === null || value === undefined) return 'TEXT';
    if (typeof value === 'number') return 'REAL';
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (Array.isArray(value)) return 'JSON';
    if (typeof value === 'object') return 'JSON';
    return 'TEXT';
  }

  /**
   * 映射到 SQL 類型
   */
  mapToSQLType(crmType) {
    const typeMap = {
      '数字': 'REAL',
      '金额': 'REAL',
      '布尔值': 'BOOLEAN',
      '日期': 'TEXT',
      '日期时间': 'TEXT',
      '单选': 'TEXT',
      '多选': 'TEXT',
      '查找关联': 'TEXT',
      '查找关联(多选)': 'TEXT',
      '图片': 'TEXT',
      '附件': 'TEXT',
      '计算字段': 'TEXT',
      '引用字段': 'TEXT',
      'JSON': 'TEXT',
      'REAL': 'REAL',
      'BOOLEAN': 'BOOLEAN',
      'TEXT': 'TEXT'
    };
    
    return typeMap[crmType] || 'TEXT';
  }

  /**
   * 是否為系統欄位
   */
  isSystemField(fieldName) {
    const systemFields = [
      'id',
      'fx_id',
      'fx_created_at',
      'fx_updated_at',
      'fx_sync_version',
      'fx_is_deleted',
      'local_created_at',
      'local_updated_at'
    ];
    
    return systemFields.includes(fieldName);
  }

  /**
   * 記錄欄位變更
   */
  async logFieldChanges(objectApiName, missingFields, extraFields) {
    try {
      // 確保欄位變更記錄表存在
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS field_change_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          object_name TEXT NOT NULL,
          change_type TEXT NOT NULL,
          field_name TEXT NOT NULL,
          field_info TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // 記錄缺失的欄位
      for (const field of missingFields) {
        await this.db.prepare(`
          INSERT INTO field_change_logs (object_name, change_type, field_name, field_info)
          VALUES (?, 'MISSING', ?, ?)
        `).bind(
          objectApiName,
          field.apiName,
          JSON.stringify(field)
        ).run();
      }
      
      // 記錄多餘的欄位
      for (const fieldName of extraFields) {
        await this.db.prepare(`
          INSERT INTO field_change_logs (object_name, change_type, field_name, field_info)
          VALUES (?, 'EXTRA', ?, NULL)
        `).bind(objectApiName, fieldName).run();
      }
      
      console.log(`[欄位驗證] 已記錄 ${missingFields.length + extraFields.length} 個欄位變更`);
      
    } catch (error) {
      console.error('[欄位驗證] 記錄變更失敗:', error);
    }
  }

  /**
   * 獲取預定義的欄位映射
   */
  async getFieldMappings(objectApiName) {
    // 從 field-mappings-all.js 導入
    try {
      const { fieldMappingsAll } = await import('../data/field-mappings-all.js');
      return fieldMappingsAll[objectApiName]?.fields || null;
    } catch (error) {
      console.log('[欄位驗證] 無法載入預定義欄位映射');
      return null;
    }
  }

  /**
   * 獲取預設欄位（當無法動態獲取時）
   */
  getDefaultFields(objectApiName) {
    // 基本欄位，所有對象都有
    return [
      { apiName: '_id', dataType: 'TEXT', label: 'ID', required: true },
      { apiName: 'name', dataType: 'TEXT', label: '名稱', required: false },
      { apiName: 'owner', dataType: 'TEXT', label: '負責人', required: false },
      { apiName: 'created_by', dataType: 'TEXT', label: '創建人', required: false },
      { apiName: 'create_time', dataType: 'TEXT', label: '創建時間', required: false },
      { apiName: 'last_modified_by', dataType: 'TEXT', label: '最後修改人', required: false },
      { apiName: 'last_modified_time', dataType: 'TEXT', label: '最後修改時間', required: false },
      { apiName: 'life_status', dataType: 'TEXT', label: '生命狀態', required: false }
    ];
  }

  /**
   * 執行欄位同步報告
   */
  async generateFieldReport(objectApiName) {
    const result = await this.validateAndSyncFields(objectApiName);
    
    const report = {
      timestamp: new Date().toISOString(),
      object: objectApiName,
      status: result.success ? 'SUCCESS' : 'FAILED',
      statistics: {
        crmFields: result.crmFieldCount,
        d1Fields: result.d1FieldCount,
        missingFields: result.missingFields?.length || 0,
        extraFields: result.extraFields?.length || 0,
        fieldsAdded: result.fieldsAdded || 0
      },
      details: result
    };
    
    console.log('[欄位驗證] 報告:', JSON.stringify(report, null, 2));
    return report;
  }
}

module.exports = FieldValidator;