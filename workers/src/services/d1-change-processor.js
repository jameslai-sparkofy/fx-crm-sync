/**
 * D1 變更處理器
 * 定期處理 D1 的變更並同步到 CRM
 */
import { CrmWriteService } from './crm-write-service.js';

export class D1ChangeProcessor {
  constructor(env) {
    this.env = env;
    this.crmWriteService = new CrmWriteService(env);
    this.isProcessing = false;
  }

  /**
   * 啟動變更處理器
   */
  async start() {
    // 獲取配置
    const config = await this.getConfig();
    
    if (!config.enabled || !config.autoSync) {
      console.log('[D1 Processor] 雙向同步已停用');
      return;
    }
    
    // 如果正在處理，跳過
    if (this.isProcessing) {
      console.log('[D1 Processor] 已有處理任務在執行');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      await this.processChanges();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 處理待同步的變更
   */
  async processChanges() {
    const startTime = Date.now();
    console.log('[D1 Processor] 開始處理 D1 變更...');
    
    try {
      // 獲取待處理的變更
      const changes = await this.getPendingChanges();
      
      if (changes.length === 0) {
        console.log('[D1 Processor] 沒有待處理的變更');
        return;
      }
      
      console.log(`[D1 Processor] 發現 ${changes.length} 個待處理變更`);
      
      const results = {
        total: changes.length,
        success: 0,
        failed: 0,
        skipped: 0
      };
      
      // 按對象分組處理
      const groupedChanges = this.groupChangesByObject(changes);
      
      for (const [objectApiName, objectChanges] of Object.entries(groupedChanges)) {
        // 檢查對象是否啟用雙向同步
        const config = await this.getConfig();
        if (!config.enabledObjects[objectApiName]) {
          console.log(`[D1 Processor] ${objectApiName} 未啟用雙向同步，跳過`);
          results.skipped += objectChanges.length;
          continue;
        }
        
        // 處理每個變更
        for (const change of objectChanges) {
          const result = await this.processSingleChange(change);
          if (result.success) {
            results.success++;
          } else if (result.skipped) {
            results.skipped++;
          } else {
            results.failed++;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[D1 Processor] 處理完成: 成功 ${results.success}, 失敗 ${results.failed}, 跳過 ${results.skipped}, 耗時 ${duration}ms`);
      
      return results;
      
    } catch (error) {
      console.error('[D1 Processor] 處理失敗:', error);
      throw error;
    }
  }

  /**
   * 處理單個變更
   */
  async processSingleChange(change) {
    try {
      // 標記為處理中
      await this.updateChangeStatus(change.id, 'syncing');
      
      // 解析數據
      const newValues = change.new_values ? JSON.parse(change.new_values) : null;
      const oldValues = change.old_values ? JSON.parse(change.old_values) : null;
      
      // 檢查是否需要跳過（避免循環同步）
      if (await this.shouldSkipChange(change)) {
        await this.updateChangeStatus(change.id, 'skipped');
        return { success: false, skipped: true };
      }
      
      // 根據操作類型處理
      let operation;
      switch (change.operation) {
        case 'INSERT':
          operation = 'create';
          break;
        case 'DELETE':
          operation = 'delete';
          break;
        case 'UPDATE':
          operation = 'update';
          // 只同步實際變更的欄位
          const changedData = this.getChangedFields(oldValues, newValues);
          if (Object.keys(changedData).length === 0) {
            await this.updateChangeStatus(change.id, 'skipped');
            return { success: false, skipped: true };
          }
          break;
        default:
          throw new Error(`未知操作類型: ${change.operation}`);
      }
      
      // 執行同步到 CRM
      const result = await this.crmWriteService.writeToCrm(
        change.object_api_name,
        change.record_id,
        newValues,
        operation,
        'd1_auto_sync'
      );
      
      if (result.success) {
        await this.updateChangeStatus(change.id, 'completed');
        return { success: true };
      } else {
        throw new Error(result.error || '同步失敗');
      }
      
    } catch (error) {
      console.error(`[D1 Processor] 處理變更 #${change.id} 失敗:`, error);
      
      // 更新錯誤狀態
      await this.env.DB.prepare(`
        UPDATE d1_change_log 
        SET sync_status = CASE 
              WHEN sync_attempts >= 3 THEN 'failed' 
              ELSE 'pending' 
            END,
            sync_error = ?,
            sync_attempts = sync_attempts + 1
        WHERE id = ?
      `).bind(error.message, change.id).run();
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 獲取待處理的變更
   */
  async getPendingChanges() {
    const result = await this.env.DB.prepare(`
      SELECT * FROM d1_change_log 
      WHERE sync_status IN ('pending', 'failed')
        AND sync_attempts < 3
      ORDER BY change_time ASC
      LIMIT 100
    `).all();
    
    return result.results || [];
  }

  /**
   * 按對象分組變更
   */
  groupChangesByObject(changes) {
    const grouped = {};
    
    for (const change of changes) {
      const key = change.object_api_name;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(change);
    }
    
    return grouped;
  }

  /**
   * 獲取變更的欄位
   */
  getChangedFields(oldValues, newValues) {
    if (!oldValues || !newValues) {
      return newValues || {};
    }
    
    const changed = {};
    const config = this.getConfig();
    const excludedFields = config.excludedFields || ['sync_time', 'is_deleted', '_id'];
    
    for (const [key, value] of Object.entries(newValues)) {
      // 跳過排除的欄位
      if (excludedFields.includes(key)) {
        continue;
      }
      
      // 比較新舊值
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(value)) {
        changed[key] = value;
      }
    }
    
    return changed;
  }

  /**
   * 檢查是否應跳過變更
   */
  async shouldSkipChange(change) {
    // 檢查最近 30 秒內是否有來自 webhook 的相同更新
    const recentWebhook = await this.env.DB.prepare(`
      SELECT * FROM sync_logs 
      WHERE object_api_name = ? 
        AND object_id = ?
        AND trigger_source = 'webhook'
        AND sync_time > datetime('now', '-30 seconds')
      LIMIT 1
    `).bind(change.object_api_name, change.record_id).first();
    
    return !!recentWebhook;
  }

  /**
   * 更新變更狀態
   */
  async updateChangeStatus(changeId, status) {
    await this.env.DB.prepare(`
      UPDATE d1_change_log 
      SET sync_status = ?,
          synced_at = CASE 
            WHEN ? IN ('completed', 'skipped') 
            THEN CURRENT_TIMESTAMP 
            ELSE synced_at 
          END
      WHERE id = ?
    `).bind(status, status, changeId).run();
  }

  /**
   * 獲取配置
   */
  async getConfig() {
    return await this.env.KV.get('BIDIRECTIONAL_SYNC_CONFIG', 'json') || {
      enabled: true,
      autoSync: true,
      syncInterval: 30000,
      maxRetries: 3,
      conflictResolution: 'last_write_wins',
      excludedFields: ['sync_time', 'is_deleted', '_id', 'fx_created_at', 'fx_updated_at'],
      enabledObjects: {
        'NewOpportunityObj': true,
        'object_8W9cb__c': true,
        'object_k1XqG__c': true,
        'object_50HJ8__c': true,
        'SupplierObj': true,
        'site_cabinet__c': true,
        'progress_management_announ__c': true
      }
    };
  }
}