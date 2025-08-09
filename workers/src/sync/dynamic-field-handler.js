/**
 * 動態欄位處理器
 * 處理 CRM 與 D1 之間的欄位映射，支持動態欄位變更
 */

class DynamicFieldHandler {
  constructor() {
    // 基礎系統欄位（所有對象都有）
    this.systemFields = [
      '_id',
      'name',
      'owner',
      'owner__r',
      'owner_department_id',
      'owner_department',
      'create_time',
      'created_by',
      'created_by__r',
      'last_modified_time',
      'last_modified_by',
      'last_modified_by__r',
      'life_status',
      'life_status__r',
      'lock_status',
      'lock_status__r',
      'is_deleted',
      'record_type',
      'version',
      'data_own_department',
      'data_own_department__r',
      'relevant_team',
      'total_num'
    ];

    // 通用欄位映射規則（適用於所有對象）
    // 由於 CRM 和 D1 欄位現在完全一致，只需要處理少數陣列欄位
    this.fieldMappings = {
      // 這些欄位在 CRM 中可能是陣列，需要轉換為單一值
      'owner': { type: 'array_first' },
      'created_by': { type: 'array_first' },
      'last_modified_by': { type: 'array_first' },
      'data_own_department': { type: 'array_first' },
      'relevant_team': { type: 'json_stringify' }
      
      // 其他所有欄位都直接映射，不需要特殊處理
    };
  }

  /**
   * 動態生成 INSERT SQL 語句
   */
  generateInsertSQL(tableName, fields) {
    const columns = fields.join(', ');
    const placeholders = fields.map((_, index) => `?${index + 1}`).join(', ');
    
    const updateSet = fields
      .filter(field => !['_id', 'create_time', 'created_by', 'created_by__r'].includes(field))
      .map(field => `${field} = excluded.${field}`)
      .join(',\n            ');
    
    return `
      INSERT INTO ${tableName} (
        ${columns},
        fx_created_at, fx_updated_at, sync_version
      ) VALUES (
        ${placeholders},
        ?${fields.length + 1}, ?${fields.length + 2}, ?${fields.length + 3}
      )
      ON CONFLICT(_id) DO UPDATE SET
        ${updateSet},
        fx_updated_at = excluded.fx_updated_at,
        sync_version = sync_version + 1,
        sync_time = CURRENT_TIMESTAMP
    `;
  }

  /**
   * 從 CRM 數據中提取所有欄位名稱
   */
  extractFieldsFromData(dataList) {
    const fieldSet = new Set();
    
    // 收集所有記錄中出現的欄位
    dataList.forEach(record => {
      Object.keys(record).forEach(key => {
        // 直接添加所有 CRM 的欄位，以 CRM 為準
        fieldSet.add(key);
      });
    });
    
    // 轉換為有序列表
    const allFields = Array.from(fieldSet);
    
    // 系統欄位優先，然後按字母順序
    return [
      ...this.systemFields.filter(f => allFields.includes(f)),
      ...allFields.filter(f => !this.systemFields.includes(f)).sort()
    ];
  }

  /**
   * 處理單個欄位值
   */
  processFieldValue(fieldName, value, record) {
    // 先檢查是否有預定義的映射規則
    const mapping = this.fieldMappings[fieldName];
    
    if (mapping) {
      switch (mapping.type) {
        case 'array_first':
          return Array.isArray(value) ? value[0] : value;
        case 'json_stringify':
          return value ? JSON.stringify(value) : null;
        default:
          return value ?? null;
      }
    }
    
    // 對於沒有預定義映射的欄位，進行智能處理
    // 如果是陣列但欄位名稱不包含特定後綴，自動取第一個元素
    if (Array.isArray(value) && 
        !fieldName.endsWith('__r') && 
        !fieldName.endsWith('__l') && 
        !fieldName.endsWith('_ids') &&
        fieldName !== 'relevant_team') {
      console.log(`[動態處理] 自動處理陣列欄位 ${fieldName}，取第一個元素`);
      return value[0] ?? null;
    }
    
    // 其他情況直接返回
    return value ?? null;
  }

  /**
   * 獲取對象值
   */
  getObjectValue(obj, key) {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;
    return obj[key] || null;
  }

  /**
   * 動態綁定數據到預處理語句
   */
  bindDynamicData(stmt, record, fields) {
    const values = [];
    
    // 記錄第一條有 shift_time 的記錄
    if (record.shift_time__c && !this.loggedShiftTime) {
      console.log(`[動態綁定] 發現有 shift_time 的記錄:`, {
        _id: record._id,
        name: record.name,
        shift_time__c: record.shift_time__c,
        shift_time__c__v: record.shift_time__c__v
      });
      this.loggedShiftTime = true;
    }
    
    // 處理每個欄位
    fields.forEach(field => {
      const value = this.processFieldValue(field, record[field], record);
      values.push(value);
      
      // 記錄 shift_time 相關欄位的處理結果
      if (field.includes('shift_time') && record.shift_time__c && !this.loggedShiftTimeValues) {
        console.log(`[動態綁定] ${field} = ${value}`);
      }
    });
    
    if (record.shift_time__c && !this.loggedShiftTimeValues) {
      this.loggedShiftTimeValues = true;
    }
    
    // 添加時間戳和版本
    values.push(record.create_time || new Date().toISOString());
    values.push(record.last_modified_time || new Date().toISOString());
    values.push(0); // sync_version
    
    return stmt.bind(...values);
  }

  /**
   * 批量同步案場數據（動態欄位版本）
   */
  async batchSyncSitesDynamic(db, sites) {
    let success = 0;
    let errors = 0;
    const batchSize = 100;
    
    console.log(`[動態案場同步] 開始同步 ${sites.length} 條數據到 D1`);
    
    // 從數據中提取所有欄位
    const fields = this.extractFieldsFromData(sites);
    console.log(`[動態案場同步] 檢測到 ${fields.length} 個欄位`);
    
    // 檢查第一條記錄的 shift_time 資料
    if (sites.length > 0) {
      const firstSite = sites[0];
      console.log(`[動態案場同步] 第一條記錄的 shift_time 資料:`, {
        shift_time__c: firstSite.shift_time__c,
        shift_time__c__v: firstSite.shift_time__c__v,
        hasShiftTime: !!firstSite.shift_time__c
      });
    }
    
    // 不再添加 D1 特有的欄位，完全以 CRM 為準
    // CRM 有什麼欄位，D1 就應該有什麼欄位
    
    // 生成動態 SQL (注意：表名必須是小寫)
    const sql = this.generateInsertSQL('object_8w9cb__c', fields);
    
    for (let i = 0; i < sites.length; i += batchSize) {
      const batch = sites.slice(i, i + batchSize);
      
      try {
        console.log(`[動態案場同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        
        const stmt = db.prepare(sql);
        
        // 逐條處理以獲得更好的錯誤信息
        for (const site of batch) {
          try {
            const result = this.bindDynamicData(stmt, site, fields).run();
            success++;
          } catch (error) {
            errors++;
            console.error(`案場 ${site._id} (${site.name}) 保存失敗:`, error.message);
            
            // 記錄第一個錯誤的詳細信息
            if (errors === 1) {
              console.error(`第一個錯誤的詳細數據:`, {
                _id: site._id,
                name: site.name,
                shift_time__c: site.shift_time__c,
                shift_time__c__v: site.shift_time__c__v
              });
            }
          }
        }
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    console.log(`[動態案場同步] 完成: 成功 ${success}, 失敗 ${errors}`);
    return { success, errors };
  }

  /**
   * 獲取表格欄位列表
   */
  async getTableColumns(db, tableName) {
    try {
      const result = await db.prepare(`
        SELECT name FROM pragma_table_info(?)
      `).bind(tableName).all();
      
      return result.results.map(row => row.name);
    } catch (error) {
      console.error(`獲取表格欄位失敗:`, error);
      return [];
    }
  }

  /**
   * 動態添加缺失的欄位
   */
  async addMissingColumns(db, tableName, dataFields) {
    const existingColumns = await this.getTableColumns(db, tableName);
    const missingFields = dataFields.filter(f => !existingColumns.includes(f));
    
    if (missingFields.length > 0) {
      console.log(`[動態欄位] 發現 ${missingFields.length} 個新欄位需要添加`);
      
      for (const field of missingFields) {
        try {
          // 根據欄位名稱判斷類型
          let dataType = 'TEXT';
          if (field.endsWith('_time') || field.endsWith('_date')) {
            dataType = 'INTEGER';
          } else if (field.endsWith('_num') || field.endsWith('_count')) {
            dataType = 'REAL';
          } else if (field === 'is_deleted' || field.startsWith('is_')) {
            dataType = 'BOOLEAN';
          }
          
          const alterSQL = `ALTER TABLE ${tableName} ADD COLUMN ${field} ${dataType}`;
          await db.prepare(alterSQL).run();
          console.log(`[動態欄位] 成功添加欄位: ${field} (${dataType})`);
        } catch (error) {
          console.error(`[動態欄位] 添加欄位 ${field} 失敗:`, error.message);
        }
      }
    }
    
    return missingFields;
  }
}

module.exports = DynamicFieldHandler;