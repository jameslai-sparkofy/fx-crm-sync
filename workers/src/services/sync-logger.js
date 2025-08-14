/**
 * 同步日誌服務
 * 記錄詳細的同步操作資訊
 */
export class SyncLogger {
  constructor(db) {
    this.db = db;
  }

  /**
   * 記錄同步操作
   */
  async logSync({
    triggerSource = 'unknown',
    triggerDetails = '',
    objectApiName,
    objectLabel,
    objectId = null,
    operation = 'batch',
    fieldsChanged = null,
    oldValues = null,
    newValues = null,
    recordsProcessed = 0,
    recordsSuccess = 0,
    recordsFailed = 0,
    errorMessage = null,
    durationMs = 0,
    ipAddress = null,
    userAgent = null,
    status = 'pending',
    metadata = null
  }) {
    try {
      await this.db.prepare(`
        INSERT INTO sync_logs (
          trigger_source, trigger_details, object_api_name, object_label,
          object_id, operation, fields_changed, old_values, new_values,
          records_processed, records_success, records_failed,
          error_message, duration_ms, ip_address, user_agent,
          status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        triggerSource,
        triggerDetails,
        objectApiName,
        objectLabel,
        objectId,
        operation,
        fieldsChanged ? JSON.stringify(fieldsChanged) : null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        recordsProcessed,
        recordsSuccess,
        recordsFailed,
        errorMessage,
        durationMs,
        ipAddress,
        userAgent,
        status,
        metadata ? JSON.stringify(metadata) : null
      ).run();
    } catch (error) {
      console.error('記錄同步日誌失敗:', error);
    }
  }

  /**
   * 記錄 Webhook 觸發的同步
   */
  async logWebhookSync(request, payload, result) {
    const startTime = Date.now();
    const headers = request.headers;
    
    await this.logSync({
      triggerSource: 'webhook',
      triggerDetails: `Event: ${payload.event}, From: ${headers.get('origin') || 'unknown'}`,
      objectApiName: payload.objectApiName,
      objectLabel: this.getObjectLabel(payload.objectApiName),
      objectId: payload.objectId,
      operation: this.getOperationFromEvent(payload.event),
      fieldsChanged: payload.data ? Object.keys(payload.data) : null,
      newValues: payload.data,
      recordsProcessed: 1,
      recordsSuccess: result.success ? 1 : 0,
      recordsFailed: result.success ? 0 : 1,
      errorMessage: result.error || null,
      durationMs: Date.now() - startTime,
      ipAddress: headers.get('cf-connecting-ip') || headers.get('x-forwarded-for'),
      userAgent: headers.get('user-agent'),
      status: result.success ? 'success' : 'failed',
      metadata: {
        timestamp: payload.timestamp,
        webhookPayload: payload
      }
    });
  }

  /**
   * 記錄定時同步
   */
  async logScheduledSync(objectApiName, result) {
    await this.logSync({
      triggerSource: 'scheduled',
      triggerDetails: 'Cron trigger',
      objectApiName: objectApiName,
      objectLabel: this.getObjectLabel(objectApiName),
      operation: 'batch',
      recordsProcessed: result.totalProcessed || 0,
      recordsSuccess: result.success || 0,
      recordsFailed: result.errors || 0,
      errorMessage: result.error || null,
      durationMs: result.duration || 0,
      status: result.errors > 0 ? 'partial' : 'success',
      metadata: result
    });
  }

  /**
   * 記錄手動觸發的同步
   */
  async logManualSync(request, objectApiName, result) {
    const headers = request.headers;
    
    await this.logSync({
      triggerSource: 'manual',
      triggerDetails: `API: ${request.method} ${request.url}`,
      objectApiName: objectApiName,
      objectLabel: this.getObjectLabel(objectApiName),
      operation: 'batch',
      recordsProcessed: result.totalProcessed || 0,
      recordsSuccess: result.success || 0,
      recordsFailed: result.errors || 0,
      errorMessage: result.error || null,
      durationMs: result.duration || 0,
      ipAddress: headers.get('cf-connecting-ip') || headers.get('x-forwarded-for'),
      userAgent: headers.get('user-agent'),
      status: result.errors > 0 ? 'partial' : 'success',
      metadata: result
    });
  }

  /**
   * 獲取最近的同步日誌
   */
  async getRecentLogs(limit = 50) {
    const result = await this.db.prepare(`
      SELECT * FROM sync_logs 
      ORDER BY sync_time DESC 
      LIMIT ?
    `).bind(limit).all();
    
    return result.results.map(log => ({
      ...log,
      fields_changed: log.fields_changed ? JSON.parse(log.fields_changed) : null,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
  }

  /**
   * 獲取同步統計
   */
  async getSyncStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const stats = await this.db.prepare(`
      SELECT 
        object_api_name,
        object_label,
        trigger_source,
        COUNT(*) as sync_count,
        SUM(records_processed) as total_records,
        SUM(records_success) as total_success,
        SUM(records_failed) as total_failed,
        AVG(duration_ms) as avg_duration,
        MAX(sync_time) as last_sync
      FROM sync_logs 
      WHERE sync_time >= ?
      GROUP BY object_api_name, trigger_source
      ORDER BY last_sync DESC
    `).bind(since).all();
    
    return stats.results;
  }

  /**
   * 獲取對象的中文標籤
   */
  getObjectLabel(objectApiName) {
    const labels = {
      'NewOpportunityObj': '商機',
      'object_8W9cb__c': '案場(SPC)',
      'object_k1XqG__c': 'SPC維修單',
      'object_50HJ8__c': '工地師父',
      'SupplierObj': '供應商',
      'site_cabinet__c': '案場(浴櫃)',
      'progress_management_announ__c': '進度管理公告'
    };
    return labels[objectApiName] || objectApiName;
  }

  /**
   * 從事件類型獲取操作類型
   */
  getOperationFromEvent(event) {
    const mapping = {
      'object.created': 'create',
      'object.updated': 'update',
      'object.deleted': 'delete'
    };
    return mapping[event] || 'unknown';
  }

  /**
   * 比較兩個對象並找出變更的欄位
   */
  detectChangedFields(oldObj, newObj) {
    const changed = [];
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {})
    ]);
    
    for (const key of allKeys) {
      if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key])) {
        changed.push({
          field: key,
          oldValue: oldObj?.[key],
          newValue: newObj?.[key]
        });
      }
    }
    
    return changed;
  }
}