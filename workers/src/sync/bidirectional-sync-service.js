/**
 * 雙向同步服務
 * 負責在 CRM 和 D1 之間進行智能雙向同步，尊重欄位權限
 */

import { getSyncDirection, FIELD_PERMISSIONS } from '../config/field-permissions.js';
import { AuditLogger } from '../utils/audit-logger.js';

export class BidirectionalSyncService {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
    this.auditLogger = new AuditLogger(db);
  }

  /**
   * 執行雙向同步 - 從 D1 到 CRM
   */
  async syncD1ToCrm(tableName, options = {}) {
    const syncId = `d1_to_crm_sync_${Date.now()}`;
    const startTime = new Date();
    
    console.log(`[${syncId}] 開始 D1 → CRM 同步: ${tableName}`);
    
    try {
      // 獲取 D1 中有變更的記錄（基於 d1_last_modified_time）
      const lastSyncTime = options.fullSync ? null : await this.getLastD1ToCrmSync(tableName);
      
      let query = `
        SELECT * FROM ${tableName} 
        WHERE is_deleted = FALSE
      `;
      
      const params = [];
      
      if (lastSyncTime) {
        query += ` AND d1_last_modified_time > ?`;
        params.push(lastSyncTime);
      }
      
      query += ` ORDER BY d1_last_modified_time ASC LIMIT 100`;
      
      const results = await this.db.prepare(query).bind(...params).all();
      const records = results.results || [];
      
      console.log(`[${syncId}] 找到 ${records.length} 條 D1 變更記錄需要同步到 CRM`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const record of records) {
        try {
          await this.syncRecordD1ToCrm(tableName, record, syncId);
          successCount++;
        } catch (error) {
          console.error(`[${syncId}] 同步記錄失敗 ${record._id}:`, error);
          errorCount++;
        }
      }
      
      // 更新最後同步時間
      if (records.length > 0) {
        const latestTime = Math.max(...records.map(r => r.d1_last_modified_time));
        await this.updateLastD1ToCrmSync(tableName, latestTime);
      }
      
      console.log(`[${syncId}] D1 → CRM 同步完成: ${successCount} 成功, ${errorCount} 失敗`);
      
      return {
        syncId,
        success: true,
        processed: records.length,
        successCount,
        errorCount
      };
      
    } catch (error) {
      console.error(`[${syncId}] D1 → CRM 同步失敗:`, error);
      throw error;
    }
  }

  /**
   * 同步單筆記錄從 D1 到 CRM
   */
  async syncRecordD1ToCrm(tableName, d1Record, syncId) {
    const recordId = d1Record._id;
    console.log(`[${syncId}] 同步記錄 ${recordId} 從 D1 到 CRM`);
    
    try {
      // 獲取 CRM 中的對應記錄
      const objectApiName = this.getObjectApiName(tableName);
      const crmRecord = await this.getCrmRecord(objectApiName, recordId);
      
      if (!crmRecord) {
        console.log(`[${syncId}] CRM 中找不到記錄 ${recordId}，跳過同步`);
        return;
      }
      
      // 比較並準備要同步的欄位
      const fieldsToSync = this.getFieldsToSyncD1ToCrm(tableName, d1Record, crmRecord);
      
      if (Object.keys(fieldsToSync).length === 0) {
        console.log(`[${syncId}] 記錄 ${recordId} 沒有需要同步的欄位`);
        return;
      }
      
      // 更新 CRM 記錄
      await this.updateCrmRecord(objectApiName, recordId, fieldsToSync);
      
      // 記錄同步日誌
      await this.auditLogger.logAction({
        tableName,
        recordId,
        userId: 'SYNC_SERVICE',
        userRole: 'system',
        action: 'sync_d1_to_crm',
        apiSource: 'sync_service'
      });
      
      console.log(`[${syncId}] 記錄 ${recordId} 同步到 CRM 成功`);
      
    } catch (error) {
      console.error(`[${syncId}] 同步記錄 ${recordId} 到 CRM 失敗:`, error);
      throw error;
    }
  }

  /**
   * 執行雙向同步 - 從 CRM 到 D1
   */
  async syncCrmToD1(tableName, options = {}) {
    const syncId = `crm_to_d1_sync_${Date.now()}`;
    const startTime = new Date();
    
    console.log(`[${syncId}] 開始 CRM → D1 同步: ${tableName}`);
    
    try {
      const objectApiName = this.getObjectApiName(tableName);
      
      // 獲取 CRM 中有變更的記錄
      const lastSyncTime = options.fullSync ? null : await this.getLastCrmToD1Sync(tableName);
      
      const filters = [
        {
          field_name: 'life_status',
          operator: 'NEQ', 
          field_values: ['invalid']
        }
      ];
      
      if (lastSyncTime) {
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [lastSyncTime]
        });
      }
      
      const response = await this.fxClient.post('/cgi/crm/v2/data/query', {
        data: {
          dataObjectApiName: objectApiName,
          search_query_info: {
            offset: 0,
            limit: 100,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取 CRM 數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      console.log(`[${syncId}] 找到 ${records.length} 條 CRM 變更記錄需要同步到 D1`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const crmRecord of records) {
        try {
          await this.syncRecordCrmToD1(tableName, crmRecord, syncId);
          successCount++;
        } catch (error) {
          console.error(`[${syncId}] 同步記錄失敗 ${crmRecord._id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`[${syncId}] CRM → D1 同步完成: ${successCount} 成功, ${errorCount} 失敗`);
      
      return {
        syncId,
        success: true,
        processed: records.length,
        successCount,
        errorCount
      };
      
    } catch (error) {
      console.error(`[${syncId}] CRM → D1 同步失敗:`, error);
      throw error;
    }
  }

  /**
   * 同步單筆記錄從 CRM 到 D1
   */
  async syncRecordCrmToD1(tableName, crmRecord, syncId) {
    const recordId = crmRecord._id;
    console.log(`[${syncId}] 同步記錄 ${recordId} 從 CRM 到 D1`);
    
    try {
      // 獲取 D1 中的對應記錄
      const d1Record = await this.getD1Record(tableName, recordId);
      
      // 比較並準備要同步的欄位
      const fieldsToSync = this.getFieldsToSyncCrmToD1(tableName, crmRecord, d1Record);
      
      if (Object.keys(fieldsToSync).length === 0) {
        console.log(`[${syncId}] 記錄 ${recordId} 沒有需要同步的欄位`);
        return;
      }
      
      // 更新或插入 D1 記錄
      if (d1Record) {
        await this.updateD1Record(tableName, recordId, fieldsToSync);
      } else {
        await this.insertD1Record(tableName, crmRecord);
      }
      
      // 記錄同步日誌
      await this.auditLogger.logAction({
        tableName,
        recordId,
        userId: 'SYNC_SERVICE',
        userRole: 'system',
        action: 'sync_crm_to_d1',
        apiSource: 'sync_service'
      });
      
      console.log(`[${syncId}] 記錄 ${recordId} 同步到 D1 成功`);
      
    } catch (error) {
      console.error(`[${syncId}] 同步記錄 ${recordId} 到 D1 失敗:`, error);
      throw error;
    }
  }

  /**
   * 獲取從 D1 到 CRM 需要同步的欄位
   */
  getFieldsToSyncD1ToCrm(tableName, d1Record, crmRecord) {
    const fieldsToSync = {};
    
    for (const fieldName of Object.keys(d1Record)) {
      const syncDirection = getSyncDirection(fieldName, tableName);
      
      // 只同步 D1_TO_CRM 和 BIDIRECTIONAL 欄位
      if (syncDirection === 'D1_TO_CRM' || syncDirection === 'BIDIRECTIONAL') {
        const d1Value = d1Record[fieldName];
        const crmValue = crmRecord[fieldName];
        
        if (syncDirection === 'D1_TO_CRM') {
          // 單向同步：如果 D1 值與 CRM 值不同，就同步
          if (d1Value !== crmValue) {
            fieldsToSync[fieldName] = d1Value;
          }
        } else if (syncDirection === 'BIDIRECTIONAL') {
          // 雙向同步：比較時間戳決定
          const d1ModifiedTime = d1Record.d1_last_modified_time;
          const crmModifiedTime = crmRecord.last_modified_time;
          
          // 如果 D1 更新時間較新，則同步到 CRM
          if (d1ModifiedTime && crmModifiedTime && d1ModifiedTime > crmModifiedTime && d1Value !== crmValue) {
            fieldsToSync[fieldName] = d1Value;
          }
        }
      }
    }
    
    return fieldsToSync;
  }

  /**
   * 獲取從 CRM 到 D1 需要同步的欄位
   */
  getFieldsToSyncCrmToD1(tableName, crmRecord, d1Record) {
    const fieldsToSync = {};
    
    for (const fieldName of Object.keys(crmRecord)) {
      const syncDirection = getSyncDirection(fieldName, tableName);
      
      // 只同步 CRM_TO_D1 和 BIDIRECTIONAL 欄位
      if (syncDirection === 'CRM_TO_D1' || syncDirection === 'BIDIRECTIONAL') {
        const crmValue = crmRecord[fieldName];
        const d1Value = d1Record ? d1Record[fieldName] : null;
        
        if (syncDirection === 'CRM_TO_D1') {
          // 單向同步：如果 CRM 值與 D1 值不同，就同步
          if (crmValue !== d1Value) {
            fieldsToSync[fieldName] = crmValue;
          }
        } else if (syncDirection === 'BIDIRECTIONAL') {
          // 雙向同步：比較時間戳決定
          const crmModifiedTime = crmRecord.last_modified_time;
          const d1ModifiedTime = d1Record ? d1Record.d1_last_modified_time : 0;
          
          // 如果 CRM 更新時間較新，則同步到 D1
          if (crmModifiedTime && d1ModifiedTime && crmModifiedTime > d1ModifiedTime && crmValue !== d1Value) {
            fieldsToSync[fieldName] = crmValue;
          }
        }
      }
    }
    
    return fieldsToSync;
  }

  /**
   * 獲取 CRM 記錄
   */
  async getCrmRecord(objectApiName, recordId) {
    try {
      const response = await this.fxClient.post(
        objectApiName.includes('__c') ? '/cgi/crm/custom/v2/data/get' : '/cgi/crm/v2/data/get',
        {
          data: {
            dataObjectApiName: objectApiName,
            objectDataId: recordId
          }
        }
      );
      
      if (response.errorCode !== 0) {
        return null;
      }
      
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`獲取 CRM 記錄失敗 ${recordId}:`, error);
      return null;
    }
  }

  /**
   * 獲取 D1 記錄
   */
  async getD1Record(tableName, recordId) {
    try {
      const result = await this.db.prepare(`SELECT * FROM ${tableName} WHERE _id = ?`).bind(recordId).first();
      return result || null;
    } catch (error) {
      console.error(`獲取 D1 記錄失敗 ${recordId}:`, error);
      return null;
    }
  }

  /**
   * 更新 CRM 記錄
   */
  async updateCrmRecord(objectApiName, recordId, fieldsToUpdate) {
    const updateData = {
      data: {
        object_data: {
          dataObjectApiName: objectApiName,
          objectDataId: recordId,
          ...fieldsToUpdate
        }
      }
    };
    
    const response = await this.fxClient.post(
      objectApiName.includes('__c') ? '/cgi/crm/custom/v2/data/update' : '/cgi/crm/v2/data/update',
      updateData
    );
    
    if (response.errorCode !== 0) {
      throw new Error(`更新 CRM 記錄失敗: ${response.errorMessage}`);
    }
    
    return response;
  }

  /**
   * 更新 D1 記錄
   */
  async updateD1Record(tableName, recordId, fieldsToUpdate) {
    const fields = Object.keys(fieldsToUpdate);
    const values = Object.values(fieldsToUpdate);
    const placeholders = fields.map(f => `${f} = ?`).join(', ');
    
    const query = `UPDATE ${tableName} SET ${placeholders} WHERE _id = ?`;
    values.push(recordId);
    
    await this.db.prepare(query).bind(...values).run();
  }

  /**
   * 插入 D1 記錄
   */
  async insertD1Record(tableName, crmRecord) {
    const fields = Object.keys(crmRecord);
    const values = Object.values(crmRecord);
    const placeholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');
    
    const query = `INSERT INTO ${tableName} (${fieldNames}) VALUES (${placeholders})`;
    
    await this.db.prepare(query).bind(...values).run();
  }

  /**
   * 獲取對象 API 名稱
   */
  getObjectApiName(tableName) {
    if (tableName === 'newopportunityobj') {
      return 'NewOpportunityObj';
    } else if (tableName === 'object_8w9cb__c') {
      return 'object_8W9cb__c';
    }
    return tableName;
  }

  /**
   * 獲取最後一次 D1 → CRM 同步時間
   */
  async getLastD1ToCrmSync(tableName) {
    try {
      const result = await this.db.prepare(`
        SELECT MAX(timestamp) as last_sync FROM audit_logs 
        WHERE action = 'sync_d1_to_crm' AND table_name = ?
      `).bind(tableName).first();
      
      return result?.last_sync || null;
    } catch (error) {
      console.error('獲取最後 D1→CRM 同步時間失敗:', error);
      return null;
    }
  }

  /**
   * 更新最後一次 D1 → CRM 同步時間
   */
  async updateLastD1ToCrmSync(tableName, timestamp) {
    // 這裡通過記錄 audit_logs 來隱式更新，無需額外表
  }

  /**
   * 獲取最後一次 CRM → D1 同步時間
   */
  async getLastCrmToD1Sync(tableName) {
    try {
      const result = await this.db.prepare(`
        SELECT MAX(timestamp) as last_sync FROM audit_logs 
        WHERE action = 'sync_crm_to_d1' AND table_name = ?
      `).bind(tableName).first();
      
      return result?.last_sync || null;
    } catch (error) {
      console.error('獲取最後 CRM→D1 同步時間失敗:', error);
      return null;
    }
  }
}