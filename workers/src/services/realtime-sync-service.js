/**
 * 即時同步服務
 * 處理webhook觸發的即時同步，避免與定時同步衝突
 */

import { FxClient } from '../utils/fx-client.js';
import { DataSyncService } from '../sync/data-sync-service.js';
import { SyncLogger } from '../services/sync-logger.js';

export class RealtimeSyncService {
  constructor(env) {
    this.env = env;
    this.db = env.DB;
    this.fxClient = null;
    this.dataSyncService = null;
  }

  async init() {
    this.fxClient = new FxClient(this.env);
    await this.fxClient.init();
    this.dataSyncService = new DataSyncService(this.fxClient, this.db);
  }

  /**
   * 處理即時同步請求
   */
  async handleRealtimeSync(webhookPayload) {
    const syncId = `realtime_${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`[${syncId}] 開始處理即時同步: ${webhookPayload.objectApiName}/${webhookPayload.objectId}`);
    
    try {
      // 1. 檢查是否需要跳過（避免與定時同步衝突）
      if (await this.shouldSkipRealtimeSync(webhookPayload)) {
        console.log(`[${syncId}] 跳過即時同步（避免衝突）`);
        return { 
          success: true, 
          skipped: true, 
          reason: 'avoided_conflict',
          duration: Date.now() - startTime 
        };
      }

      // 2. 根據事件類型處理
      let result;
      switch (webhookPayload.event) {
        case 'object.created':
        case 'object.updated':
          result = await this.syncSingleRecord(webhookPayload, syncId);
          break;
          
        case 'object.deleted':
          result = await this.markRecordAsDeleted(webhookPayload, syncId);
          break;
          
        default:
          throw new Error(`不支持的事件類型: ${webhookPayload.event}`);
      }

      // 3. 更新即時同步統計
      await this.updateRealtimeSyncStats(webhookPayload.objectApiName, true);

      console.log(`[${syncId}] 即時同步完成`);
      return {
        success: true,
        ...result,
        duration: Date.now() - startTime
      };

    } catch (error) {
      console.error(`[${syncId}] 即時同步失敗:`, error);
      await this.updateRealtimeSyncStats(webhookPayload.objectApiName, false);
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 智能去重：判斷是否應該跳過即時同步
   */
  async shouldSkipRealtimeSync(payload) {
    const { objectApiName, objectId, timestamp } = payload;
    
    try {
      // 檢查是否有進行中的定時同步
      const ongoingBatchSync = await this.db.prepare(`
        SELECT * FROM sync_logs 
        WHERE entity_type = ? 
          AND status = 'IN_PROGRESS'
          AND started_at > datetime('now', '-30 minutes')
        LIMIT 1
      `).bind(objectApiName).first();
      
      if (ongoingBatchSync) {
        console.log(`[RealtimeSync] 檢測到進行中的批次同步: ${ongoingBatchSync.sync_id}`);
        return true;
      }

      // 檢查最近30秒是否已經同步過這筆記錄
      const recentSync = await this.db.prepare(`
        SELECT * FROM realtime_sync_log 
        WHERE object_api_name = ? 
          AND object_id = ?
          AND synced_at > datetime('now', '-30 seconds')
          AND status = 'SUCCESS'
        ORDER BY synced_at DESC
        LIMIT 1
      `).bind(objectApiName, objectId).first();
      
      if (recentSync) {
        console.log(`[RealtimeSync] 記錄最近已同步: ${objectId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[RealtimeSync] 檢查衝突失敗:', error);
      // 如果檢查失敗，為了安全起見，不跳過同步
      return false;
    }
  }

  /**
   * 同步單筆記錄
   */
  async syncSingleRecord(payload, syncId) {
    const { objectApiName, objectId } = payload;
    
    try {
      // 1. 從CRM獲取最新記錄
      console.log(`[${syncId}] 從CRM獲取記錄: ${objectId}`);
      const record = await this.fetchRecordFromCrm(objectApiName, objectId);
      
      if (!record) {
        console.log(`[${syncId}] CRM中找不到記錄: ${objectId}`);
        return { recordsProcessed: 0, message: '記錄不存在' };
      }

      // 2. 檢查D1中的現有記錄
      const existingRecord = await this.fetchRecordFromD1(objectApiName, objectId);
      
      // 3. 比較並決定是否需要更新
      if (existingRecord && !this.recordNeedsUpdate(record, existingRecord)) {
        console.log(`[${syncId}] 記錄無需更新: ${objectId}`);
        return { recordsProcessed: 0, message: '記錄已是最新' };
      }

      // 4. 同步到D1
      console.log(`[${syncId}] 同步記錄到D1: ${objectId}`);
      await this.saveRecordToD1(objectApiName, record);

      // 5. 記錄即時同步日誌
      await this.logRealtimeSync(objectApiName, objectId, 'SUCCESS', payload);

      return { 
        recordsProcessed: 1, 
        message: existingRecord ? '記錄已更新' : '記錄已創建'
      };

    } catch (error) {
      // 記錄失敗日誌
      await this.logRealtimeSync(objectApiName, objectId, 'FAILED', payload, error.message);
      throw error;
    }
  }

  /**
   * 標記記錄為已刪除
   */
  async markRecordAsDeleted(payload, syncId) {
    const { objectApiName, objectId } = payload;
    
    try {
      const tableName = this.getTableName(objectApiName);
      if (!tableName) {
        throw new Error(`不支持的對象類型: ${objectApiName}`);
      }

      // 軟刪除記錄
      const result = await this.db.prepare(`
        UPDATE ${tableName} 
        SET is_deleted = TRUE,
            fx_updated_at = ?,
            d1_last_modified_time = ?,
            sync_time = CURRENT_TIMESTAMP
        WHERE _id = ? AND is_deleted = FALSE
      `).bind(
        Date.now(),
        Date.now(),
        objectId
      ).run();

      // 記錄即時同步日誌
      await this.logRealtimeSync(objectApiName, objectId, 'SUCCESS', payload);

      console.log(`[${syncId}] 標記記錄為已刪除: ${objectId}, 影響行數: ${result.changes}`);
      
      return { 
        recordsProcessed: result.changes, 
        message: '記錄已標記刪除' 
      };

    } catch (error) {
      await this.logRealtimeSync(objectApiName, objectId, 'FAILED', payload, error.message);
      throw error;
    }
  }

  /**
   * 從CRM獲取單筆記錄
   */
  async fetchRecordFromCrm(objectApiName, objectId) {
    // 根據對象類型選擇API端點
    const isStandardObject = ['NewOpportunityObj', 'SupplierObj'].includes(objectApiName);
    const apiPath = isStandardObject ? '/cgi/crm/v2/data/get' : '/cgi/crm/custom/v2/data/get';
    
    const response = await this.fxClient.post(apiPath, {
      data: {
        dataObjectApiName: objectApiName,
        objectDataId: objectId
      }
    });
    
    if (response.errorCode !== 0) {
      if (response.errorCode === 301) {
        // 記錄不存在
        return null;
      }
      throw new Error(`獲取CRM記錄失敗: ${response.errorMessage}`);
    }
    
    return response.data?.data || response.data;
  }

  /**
   * 從D1獲取記錄
   */
  async fetchRecordFromD1(objectApiName, objectId) {
    const tableName = this.getTableName(objectApiName);
    if (!tableName) return null;
    
    try {
      const result = await this.db.prepare(`
        SELECT * FROM ${tableName} WHERE _id = ?
      `).bind(objectId).first();
      
      return result || null;
    } catch (error) {
      console.error('從D1獲取記錄失敗:', error);
      return null;
    }
  }

  /**
   * 判斷記錄是否需要更新
   */
  recordNeedsUpdate(crmRecord, d1Record) {
    // 比較 last_modified_time
    const crmTime = crmRecord.last_modified_time || 0;
    const d1Time = d1Record.last_modified_time || 0;
    
    // CRM記錄更新時間比D1新，則需要更新
    return crmTime > d1Time;
  }

  /**
   * 保存記錄到D1
   */
  async saveRecordToD1(objectApiName, record) {
    switch(objectApiName) {
      case 'NewOpportunityObj':
        await this.dataSyncService.saveOpportunities([record]);
        break;
      case 'object_8W9cb__c':
        await this.dataSyncService.batchSyncSites([record]);
        break;
      case 'object_k1XqG__c':
        await this.dataSyncService.saveRepairOrders([record]);
        break;
      case 'object_50HJ8__c':
        await this.dataSyncService.saveWorkers([record]);
        break;
      case 'SupplierObj':
        await this.dataSyncService.saveSuppliers([record]);
        break;
      case 'site_cabinet__c':
        await this.dataSyncService.saveSiteCabinet([record]);
        break;
      case 'progress_management_announ__c':
        await this.dataSyncService.saveProgressAnnouncement([record]);
        break;
      default:
        throw new Error(`不支持的對象類型: ${objectApiName}`);
    }
  }

  /**
   * 記錄即時同步日誌
   */
  async logRealtimeSync(objectApiName, objectId, status, payload, errorMessage = null) {
    try {
      await this.db.prepare(`
        INSERT INTO realtime_sync_log (
          object_api_name, object_id, event_type,
          status, payload, error_message, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        objectApiName,
        objectId,
        payload.event,
        status,
        JSON.stringify(payload),
        errorMessage,
        new Date().toISOString()
      ).run();
    } catch (error) {
      console.error('記錄即時同步日誌失敗:', error);
    }
  }

  /**
   * 更新即時同步統計
   */
  async updateRealtimeSyncStats(objectApiName, success) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await this.db.prepare(`
        INSERT INTO realtime_sync_stats (
          date, object_api_name, success_count, failed_count
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(date, object_api_name) DO UPDATE SET
          success_count = success_count + ?,
          failed_count = failed_count + ?,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        today,
        objectApiName,
        success ? 1 : 0,
        success ? 0 : 1,
        success ? 1 : 0,
        success ? 0 : 1
      ).run();
    } catch (error) {
      console.error('更新即時同步統計失敗:', error);
    }
  }

  /**
   * 獲取表名映射
   */
  getTableName(objectApiName) {
    const mapping = {
      'NewOpportunityObj': 'newopportunityobj',
      'object_8W9cb__c': 'object_8w9cb__c',
      'object_k1XqG__c': 'object_k1xqg__c',
      'object_50HJ8__c': 'object_50hj8__c',
      'SupplierObj': 'supplierobj',
      'site_cabinet__c': 'site_cabinet__c',
      'progress_management_announ__c': 'progress_management_announ__c'
    };
    
    return mapping[objectApiName] || null;
  }

  /**
   * 獲取即時同步統計
   */
  async getRealtimeSyncStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const stats = await this.db.prepare(`
        SELECT 
          object_api_name,
          SUM(success_count) as total_success,
          SUM(failed_count) as total_failed,
          COUNT(*) as active_days
        FROM realtime_sync_stats
        WHERE date >= ?
        GROUP BY object_api_name
        ORDER BY total_success DESC
      `).bind(startDateStr).all();
      
      return stats.results || [];
    } catch (error) {
      console.error('獲取即時同步統計失敗:', error);
      return [];
    }
  }
}