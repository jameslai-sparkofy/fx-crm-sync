/**
 * 自動結構更新器
 * 自動執行安全的表結構變更（只新增欄位，不刪除）
 */
export class AutoSchemaUpdater {
  constructor(db) {
    this.db = db;
  }

  /**
   * 自動更新表結構
   * @param {string} tableName - 表名
   * @param {object} changes - 欄位變更
   * @returns {object} 更新結果
   */
  async autoUpdateSchema(tableName, changes) {
    const results = {
      success: true,
      added: [],
      skipped: [],
      errors: []
    };

    // 只處理新增欄位（安全操作）
    if (changes.addedFields && changes.addedFields.length > 0) {
      console.log(`[AutoSchemaUpdater] 準備新增 ${changes.addedFields.length} 個欄位到 ${tableName}`);
      
      for (const field of changes.addedFields) {
        try {
          await this.addColumn(tableName, field);
          results.added.push(field.apiName);
          console.log(`[AutoSchemaUpdater] 成功新增欄位: ${field.apiName}`);
        } catch (error) {
          console.error(`[AutoSchemaUpdater] 新增欄位 ${field.apiName} 失敗:`, error);
          results.errors.push({
            field: field.apiName,
            error: error.message
          });
        }
      }
    }

    // 記錄但不執行刪除操作
    if (changes.removedFields && changes.removedFields.length > 0) {
      console.log(`[AutoSchemaUpdater] 檢測到 ${changes.removedFields.length} 個欄位被刪除，需手動處理`);
      results.skipped = changes.removedFields.map(f => ({
        field: f.apiName,
        reason: '刪除欄位需要手動確認以避免數據丟失'
      }));
    }

    // 記錄欄位修改
    if (changes.modifiedFields && changes.modifiedFields.length > 0) {
      console.log(`[AutoSchemaUpdater] 檢測到 ${changes.modifiedFields.length} 個欄位被修改，需手動處理`);
      for (const mod of changes.modifiedFields) {
        results.skipped.push({
          field: mod.apiName,
          reason: '修改欄位類型需要手動處理'
        });
      }
    }

    // 記錄更新結果
    await this.recordUpdateResult(tableName, results);
    
    return results;
  }

  /**
   * 新增欄位
   * @param {string} tableName - 表名
   * @param {object} field - 欄位定義
   */
  async addColumn(tableName, field) {
    const dataType = this.mapToSQLiteType(field.dataType);
    const defaultValue = this.getDefaultValue(field);
    
    // 構建 ALTER TABLE 語句
    let sql = `ALTER TABLE ${tableName} ADD COLUMN ${field.apiName} ${dataType}`;
    
    // 如果是必填欄位，添加預設值
    if (field.required) {
      sql += ` DEFAULT ${defaultValue}`;
    }
    
    // 執行 SQL
    await this.db.prepare(sql).run();
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
      'image': 'TEXT',
      'file': 'TEXT'
    };
    
    return typeMap[crmType] || 'TEXT';
  }

  /**
   * 獲取欄位的預設值
   */
  getDefaultValue(field) {
    switch (field.dataType) {
      case 'text':
      case 'picklist':
      case 'multipicklist':
      case 'reference':
      case 'url':
      case 'email':
      case 'phone':
      case 'textarea':
      case 'image':
      case 'file':
        return "''";
      
      case 'number':
      case 'percent':
      case 'currency':
        return '0';
      
      case 'integer':
      case 'date':
      case 'datetime':
        return '0';
      
      case 'boolean':
        return 'FALSE';
      
      default:
        return "''";
    }
  }

  /**
   * 記錄更新結果
   */
  async recordUpdateResult(tableName, results) {
    await this.db.prepare(`
      INSERT INTO schema_update_logs (
        table_name,
        update_type,
        update_details,
        status,
        executed_at
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      tableName,
      'auto_update',
      JSON.stringify(results),
      results.errors.length === 0 ? 'success' : 'partial',
      new Date().toISOString()
    ).run();
  }

  /**
   * 檢查是否可以安全地自動更新
   * @param {object} changes - 欄位變更
   * @returns {object} 檢查結果
   */
  canAutoUpdate(changes) {
    const canUpdate = {
      safe: true,
      warnings: [],
      blockers: []
    };

    // 新增欄位通常是安全的
    if (changes.addedFields && changes.addedFields.length > 0) {
      canUpdate.warnings.push(`將新增 ${changes.addedFields.length} 個欄位`);
    }

    // 刪除欄位需要手動確認
    if (changes.removedFields && changes.removedFields.length > 0) {
      canUpdate.blockers.push(`檢測到 ${changes.removedFields.length} 個欄位將被刪除，需要手動確認`);
      canUpdate.safe = false;
    }

    // 修改欄位類型需要謹慎處理
    if (changes.modifiedFields && changes.modifiedFields.length > 0) {
      for (const mod of changes.modifiedFields) {
        for (const change of mod.changes) {
          if (change.property === 'dataType') {
            canUpdate.blockers.push(`欄位 ${mod.apiName} 的資料類型從 ${change.oldValue} 變更為 ${change.newValue}`);
            canUpdate.safe = false;
          }
        }
      }
    }

    return canUpdate;
  }
}