/**
 * Schema同步服務
 * 檢測CRM欄位變更並同步到D1資料庫
 */
export class SchemaSyncService {
  constructor(objectDiscovery, schemaManager, db) {
    this.objectDiscovery = objectDiscovery;
    this.schemaManager = schemaManager;
    this.db = db;
  }

  /**
   * 檢測並同步所有已啟用對象的schema變更
   */
  async syncAllEnabledObjects() {
    try {
      const enabledObjects = await this.objectDiscovery.getEnabledObjects();
      console.log(`開始同步 ${enabledObjects.length} 個對象的schema`);
      
      const results = [];
      for (const obj of enabledObjects) {
        try {
          const changes = await this.syncObjectSchema(obj.api_name);
          results.push({
            objectApiName: obj.api_name,
            success: true,
            changes: changes
          });
        } catch (error) {
          console.error(`同步 ${obj.api_name} 失敗:`, error);
          results.push({
            objectApiName: obj.api_name,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('批量同步schema失敗:', error);
      throw error;
    }
  }

  /**
   * 同步單個對象的schema變更
   */
  async syncObjectSchema(objectApiName) {
    console.log(`開始同步 ${objectApiName} 的schema`);
    
    // 更新欄位定義
    await this.objectDiscovery.syncFieldDefinitions(objectApiName);
    
    // 確保表存在
    const tableName = await this.ensureTableExists(objectApiName);
    
    // 檢測並應用變更
    const changes = await this.detectAndApplyChanges(objectApiName, tableName);
    
    // 更新最後同步時間
    await this.updateLastSyncTime(objectApiName);
    
    console.log(`${objectApiName} schema同步完成，共 ${changes.length} 個變更`);
    return changes;
  }

  /**
   * 確保表存在，如果不存在則創建
   */
  async ensureTableExists(objectApiName) {
    const object = await this.schemaManager.getObjectDefinition(objectApiName);
    
    if (!object.table_name) {
      // 表不存在，創建新表
      console.log(`對象 ${objectApiName} 的表不存在，開始創建`);
      return await this.schemaManager.createTableForObject(objectApiName);
    }
    
    // 檢查實際表是否存在
    const tableExists = await this.schemaManager.tableExists(object.table_name);
    if (!tableExists) {
      console.log(`表 ${object.table_name} 在資料庫中不存在，重新創建`);
      return await this.schemaManager.createTableForObject(objectApiName);
    }
    
    return object.table_name;
  }

  /**
   * 檢測並應用欄位變更
   */
  async detectAndApplyChanges(objectApiName, tableName) {
    // 獲取CRM中的欄位定義
    const crmFields = await this.getCRMFields(objectApiName);
    
    // 獲取資料庫中的實際欄位
    const dbColumns = await this.getTableColumns(tableName);
    
    // 比較差異
    const changes = this.compareSchemas(crmFields, dbColumns);
    
    // 應用變更
    for (const change of changes) {
      await this.applyChange(objectApiName, tableName, change);
    }
    
    return changes;
  }

  /**
   * 獲取CRM欄位定義（從本地已同步的定義）
   */
  async getCRMFields(objectApiName) {
    const fields = await this.schemaManager.getFieldDefinitions(objectApiName);
    return fields.filter(f => f.is_active);
  }

  /**
   * 獲取表的實際列信息
   */
  async getTableColumns(tableName) {
    const result = await this.db.prepare(`
      PRAGMA table_info(${tableName})
    `).all();
    
    return result.results.map(col => ({
      name: col.name,
      type: col.type,
      notnull: col.notnull,
      dflt_value: col.dflt_value
    }));
  }

  /**
   * 比較CRM定義和資料庫結構的差異
   */
  compareSchemas(crmFields, dbColumns) {
    const changes = [];
    const dbColumnMap = new Map(dbColumns.map(col => [col.name, col]));
    
    // 系統欄位不參與比較
    const systemFields = new Set([
      'id', 'fx_object_id', 'created_at', 'updated_at',
      'fx_created_at', 'fx_updated_at', 'sync_version', 'is_deleted'
    ]);
    
    // 檢查需要新增的欄位
    for (const field of crmFields) {
      const columnName = field.field_api_name;
      
      if (!systemFields.has(columnName) && !dbColumnMap.has(columnName)) {
        changes.push({
          type: 'ADD_FIELD',
          field: field
        });
      }
    }
    
    // 注意：D1不支持DROP COLUMN，所以被刪除的欄位只在fx_field_definitions中標記為inactive
    
    return changes;
  }

  /**
   * 應用單個變更
   */
  async applyChange(objectApiName, tableName, change) {
    switch (change.type) {
      case 'ADD_FIELD':
        await this.schemaManager.addFieldToTable(objectApiName, change.field);
        break;
        
      // D1限制：不支持DROP COLUMN和ALTER COLUMN
      // 這些變更只記錄在日誌中，不實際執行
      case 'DROP_FIELD':
      case 'MODIFY_FIELD':
        await this.logUnsupportedChange(objectApiName, change);
        break;
        
      default:
        console.warn(`未知的變更類型: ${change.type}`);
    }
  }

  /**
   * 記錄不支持的變更
   */
  async logUnsupportedChange(objectApiName, change) {
    await this.db.prepare(`
      INSERT INTO schema_change_logs (
        object_api_name, change_type, field_api_name,
        old_definition, new_definition, status, error_message
      ) VALUES (?, ?, ?, ?, ?, 'SKIPPED', 'D1不支持此操作')
    `).bind(
      objectApiName,
      change.type,
      change.field?.field_api_name || change.fieldName,
      JSON.stringify(change.oldField || {}),
      JSON.stringify(change.newField || {})
    ).run();
  }

  /**
   * 更新最後同步時間
   */
  async updateLastSyncTime(objectApiName) {
    await this.db.prepare(`
      UPDATE fx_object_definitions 
      SET last_synced_at = CURRENT_TIMESTAMP 
      WHERE api_name = ?
    `).bind(objectApiName).run();
  }

  /**
   * 獲取schema變更歷史
   */
  async getSchemaChangeHistory(objectApiName, limit = 50) {
    const result = await this.db.prepare(`
      SELECT * FROM schema_change_logs 
      WHERE object_api_name = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(objectApiName, limit).all();
    
    return result.results;
  }

  /**
   * 檢測所有對象的schema變更（不應用）
   */
  async detectAllChanges() {
    const enabledObjects = await this.objectDiscovery.getEnabledObjects();
    const allChanges = [];
    
    for (const obj of enabledObjects) {
      try {
        // 同步欄位定義
        await this.objectDiscovery.syncFieldDefinitions(obj.api_name);
        
        if (obj.table_name) {
          const crmFields = await this.getCRMFields(obj.api_name);
          const dbColumns = await this.getTableColumns(obj.table_name);
          const changes = this.compareSchemas(crmFields, dbColumns);
          
          if (changes.length > 0) {
            allChanges.push({
              objectApiName: obj.api_name,
              displayName: obj.display_name,
              changes: changes
            });
          }
        }
      } catch (error) {
        console.error(`檢測 ${obj.api_name} 的變更失敗:`, error);
      }
    }
    
    return allChanges;
  }
}