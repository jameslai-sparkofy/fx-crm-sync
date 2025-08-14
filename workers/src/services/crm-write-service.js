/**
 * CRM 寫入服務
 * 處理從 D1 寫回 CRM 的操作
 */
import { FxClient } from '../utils/fx-client.js';
import { SyncLogger } from './sync-logger.js';

export class CrmWriteService {
  constructor(env) {
    this.env = env;
    this.fxClient = null;
    this.syncLogger = new SyncLogger(env.DB);
  }

  async init() {
    if (!this.fxClient) {
      this.fxClient = new FxClient(this.env);
      await this.fxClient.init();
    }
  }

  /**
   * 將 D1 的變更寫回 CRM
   * @param {string} objectApiName - 對象 API 名稱
   * @param {string} objectId - 記錄 ID
   * @param {object} data - 要更新的數據
   * @param {string} operation - 操作類型: create | update | delete
   * @param {string} source - 觸發源
   */
  async writeToCrm(objectApiName, objectId, data, operation, source = 'd1_change') {
    const startTime = Date.now();
    
    try {
      await this.init();
      
      // 檢查是否需要避免循環同步
      if (await this.shouldSkipSync(objectApiName, objectId, data)) {
        console.log('[CRM Write] 跳過同步以避免循環');
        return { success: true, skipped: true };
      }
      
      let result;
      
      switch (operation) {
        case 'create':
          result = await this.createRecord(objectApiName, data);
          break;
        case 'update':
          result = await this.updateRecord(objectApiName, objectId, data);
          break;
        case 'delete':
          result = await this.deleteRecord(objectApiName, objectId);
          break;
        default:
          throw new Error(`不支持的操作類型: ${operation}`);
      }
      
      // 記錄同步日誌
      await this.syncLogger.logSync({
        triggerSource: source,
        triggerDetails: `D1 → CRM ${operation}`,
        objectApiName,
        objectLabel: this.syncLogger.getObjectLabel(objectApiName),
        objectId,
        operation,
        fieldsChanged: Object.keys(data || {}),
        newValues: data,
        recordsProcessed: 1,
        recordsSuccess: result.success ? 1 : 0,
        recordsFailed: result.success ? 0 : 1,
        errorMessage: result.error || null,
        durationMs: Date.now() - startTime,
        status: result.success ? 'success' : 'failed',
        metadata: { direction: 'd1_to_crm', result }
      });
      
      return result;
      
    } catch (error) {
      console.error('[CRM Write] 寫入失敗:', error);
      
      await this.syncLogger.logSync({
        triggerSource: source,
        triggerDetails: `D1 → CRM ${operation} 失敗`,
        objectApiName,
        objectLabel: this.syncLogger.getObjectLabel(objectApiName),
        objectId,
        operation,
        recordsProcessed: 1,
        recordsSuccess: 0,
        recordsFailed: 1,
        errorMessage: error.message,
        durationMs: Date.now() - startTime,
        status: 'failed'
      });
      
      throw error;
    }
  }

  /**
   * 創建新記錄
   */
  async createRecord(objectApiName, data) {
    const isCustom = objectApiName.endsWith('__c');
    const apiPath = isCustom ? '/cgi/crm/custom/v2/data/create' : '/cgi/crm/v2/data/create';
    
    const response = await this.fxClient.post(apiPath, {
      data: {
        dataObjectApiName: objectApiName,
        data: this.formatDataForCrm(data)
      }
    });
    
    if (response.errorCode !== 0) {
      throw new Error(`創建記錄失敗: ${response.errorMessage}`);
    }
    
    return {
      success: true,
      objectId: response.data?._id || response.data?.id
    };
  }

  /**
   * 更新記錄
   */
  async updateRecord(objectApiName, objectId, data) {
    const isCustom = objectApiName.endsWith('__c');
    const apiPath = isCustom ? '/cgi/crm/custom/v2/data/update' : '/cgi/crm/v2/data/update';
    
    // 使用官方文檔格式：object_data 包裝
    const response = await this.fxClient.post(apiPath, {
      data: {
        object_data: {
          _id: objectId,
          dataObjectApiName: objectApiName,
          ...this.formatDataForCrm(data)
        }
      }
    });
    
    if (response.errorCode !== 0) {
      throw new Error(`更新記錄失敗: ${response.errorMessage}`);
    }
    
    return { success: true };
  }

  /**
   * 刪除記錄（標記為作廢）
   */
  async deleteRecord(objectApiName, objectId) {
    // CRM 中通常是標記為作廢而非真正刪除
    return await this.updateRecord(objectApiName, objectId, {
      life_status: '作废'
    });
  }

  /**
   * 格式化數據以符合 CRM API 要求
   */
  formatDataForCrm(data) {
    const formatted = {};
    
    for (const [key, value] of Object.entries(data)) {
      // 跳過內部欄位
      if (key.startsWith('_') || key === 'sync_time' || key === 'is_deleted') {
        continue;
      }
      
      // 處理日期時間
      if (value instanceof Date) {
        formatted[key] = value.getTime();
      }
      // 處理 JSON 欄位
      else if (typeof value === 'object' && value !== null) {
        formatted[key] = JSON.stringify(value);
      }
      // 其他值直接使用
      else {
        formatted[key] = value;
      }
    }
    
    return formatted;
  }

  /**
   * 檢查是否應該跳過同步（避免循環）
   */
  async shouldSkipSync(objectApiName, objectId, data) {
    try {
      // 檢查最近是否有來自 webhook 的相同更新
      const recentLogs = await this.env.DB.prepare(`
        SELECT * FROM sync_logs 
        WHERE object_api_name = ? 
          AND object_id = ?
          AND trigger_source = 'webhook'
          AND sync_time > datetime('now', '-30 seconds')
        ORDER BY sync_time DESC
        LIMIT 1
      `).bind(objectApiName, objectId).first();
      
      if (recentLogs) {
        // 比較數據是否相同
        const recentData = recentLogs.new_values ? JSON.parse(recentLogs.new_values) : {};
        const isSameData = JSON.stringify(data) === JSON.stringify(recentData);
        
        if (isSameData) {
          console.log('[CRM Write] 檢測到循環同步，跳過');
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('[CRM Write] 檢查循環同步失敗:', error);
      return false;
    }
  }

  /**
   * 批量寫入 CRM
   */
  async batchWriteToCrm(objectApiName, records, operation = 'update') {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const record of records) {
      try {
        await this.writeToCrm(
          objectApiName,
          record._id || record.id,
          record,
          operation
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: record._id || record.id,
          error: error.message
        });
      }
    }
    
    return results;
  }
}