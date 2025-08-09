/**
 * 審計日誌記錄工具
 * 用於追蹤所有 API 操作和資料變更
 */

export class AuditLogger {
  constructor(db) {
    this.db = db;
  }

  /**
   * 記錄操作到審計日誌表
   */
  async logAction(logData) {
    const {
      tableName,
      recordId,
      userId,
      userRole,
      action,
      fieldName = null,
      oldValue = null,
      newValue = null,
      apiSource,
      ipAddress = null,
      userAgent = null
    } = logData;

    const timestamp = Date.now();

    try {
      await this.db.prepare(`
        INSERT INTO audit_logs (
          table_name, record_id, user_id, user_role, action,
          field_name, old_value, new_value, timestamp,
          api_source, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tableName,
        recordId,
        userId,
        userRole,
        action,
        fieldName,
        oldValue,
        newValue,
        timestamp,
        apiSource,
        ipAddress,
        userAgent
      ).run();

      console.log(`[AUDIT] 記錄操作: ${action} by ${userId} (${userRole}) on ${tableName}/${recordId}`);
    } catch (error) {
      console.error('[AUDIT] 記錄審計日誌失敗:', error);
      // 不拋出錯誤，避免影響主要業務流程
    }
  }

  /**
   * 記錄欄位變更到歷史記錄
   */
  async updateHistoryLog(tableName, recordId, userId, userRole, action, fieldChanges = [], apiSource) {
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    let logEntry = `[${timestamp}] ${apiSource.toUpperCase()}: ${userId} (${userRole}) 執行 ${action}`;
    
    if (fieldChanges.length > 0) {
      logEntry += ' - 欄位變更: ';
      logEntry += fieldChanges.map(change => {
        if (change.oldValue !== undefined && change.newValue !== undefined) {
          return `${change.fieldName}: "${change.oldValue}" → "${change.newValue}"`;
        } else {
          return `${change.fieldName}: ${change.newValue}`;
        }
      }).join(', ');
    }
    
    logEntry += ` (${dateStr})\n`;

    try {
      // 獲取現有的歷史記錄
      const currentLog = await this.db.prepare(`
        SELECT history_log FROM ${tableName} WHERE _id = ?
      `).bind(recordId).first();

      const existingLog = currentLog?.history_log || '';
      const updatedLog = existingLog + logEntry;

      // 更新歷史記錄
      await this.db.prepare(`
        UPDATE ${tableName} 
        SET history_log = ?,
            d1_last_modified_time = ?,
            d1_last_modified_by = ?
        WHERE _id = ?
      `).bind(updatedLog, timestamp, userId, recordId).run();

      console.log(`[AUDIT] 更新歷史記錄: ${tableName}/${recordId}`);
    } catch (error) {
      console.error('[AUDIT] 更新歷史記錄失敗:', error);
      // 不拋出錯誤，避免影響主要業務流程
    }
  }

  /**
   * 記錄多個欄位變更
   */
  async logFieldChanges(tableName, recordId, userId, userRole, changes, apiSource, request = null) {
    const fieldChanges = [];
    
    // 為每個欄位變更記錄審計日誌
    for (const [fieldName, changeData] of Object.entries(changes)) {
      await this.logAction({
        tableName,
        recordId,
        userId,
        userRole,
        action: 'update',
        fieldName,
        oldValue: changeData.oldValue,
        newValue: changeData.newValue,
        apiSource,
        ipAddress: request?.headers?.get('cf-connecting-ip') || request?.headers?.get('x-forwarded-for'),
        userAgent: request?.headers?.get('user-agent')
      });

      fieldChanges.push({
        fieldName,
        oldValue: changeData.oldValue,
        newValue: changeData.newValue
      });
    }

    // 更新歷史記錄
    await this.updateHistoryLog(tableName, recordId, userId, userRole, 'update', fieldChanges, apiSource);
  }

  /**
   * 記錄創建操作
   */
  async logCreate(tableName, recordId, userId, userRole, recordData, apiSource, request = null) {
    await this.logAction({
      tableName,
      recordId,
      userId,
      userRole,
      action: 'create',
      apiSource,
      ipAddress: request?.headers?.get('cf-connecting-ip') || request?.headers?.get('x-forwarded-for'),
      userAgent: request?.headers?.get('user-agent')
    });

    await this.updateHistoryLog(tableName, recordId, userId, userRole, 'create', [], apiSource);
  }

  /**
   * 記錄刪除操作
   */
  async logDelete(tableName, recordId, userId, userRole, apiSource, request = null) {
    await this.logAction({
      tableName,
      recordId,
      userId,
      userRole,
      action: 'delete',
      apiSource,
      ipAddress: request?.headers?.get('cf-connecting-ip') || request?.headers?.get('x-forwarded-for'),
      userAgent: request?.headers?.get('user-agent')
    });

    await this.updateHistoryLog(tableName, recordId, userId, userRole, 'delete', [], apiSource);
  }

  /**
   * 獲取記錄的審計歷史
   */
  async getAuditHistory(tableName, recordId, limit = 50) {
    try {
      const results = await this.db.prepare(`
        SELECT * FROM audit_logs 
        WHERE table_name = ? AND record_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `).bind(tableName, recordId, limit).all();

      return results.results || [];
    } catch (error) {
      console.error('[AUDIT] 獲取審計歷史失敗:', error);
      return [];
    }
  }

  /**
   * 獲取用戶的操作歷史
   */
  async getUserActivity(userId, limit = 100) {
    try {
      const results = await this.db.prepare(`
        SELECT * FROM audit_logs 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `).bind(userId, limit).all();

      return results.results || [];
    } catch (error) {
      console.error('[AUDIT] 獲取用戶活動失敗:', error);
      return [];
    }
  }

  /**
   * 記錄同步衝突
   */
  async logSyncConflict(tableName, recordId, fieldName, d1Value, crmValue, d1ModifiedTime, crmModifiedTime) {
    try {
      await this.db.prepare(`
        INSERT INTO sync_conflicts (
          table_name, record_id, field_name, d1_value, crm_value,
          d1_modified_time, crm_modified_time, resolution_strategy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual_review')
      `).bind(
        tableName,
        recordId,
        fieldName,
        JSON.stringify(d1Value),
        JSON.stringify(crmValue),
        d1ModifiedTime,
        crmModifiedTime
      ).run();

      console.log(`[AUDIT] 記錄同步衝突: ${tableName}/${recordId}/${fieldName}`);
    } catch (error) {
      console.error('[AUDIT] 記錄同步衝突失敗:', error);
    }
  }

  /**
   * 解決同步衝突
   */
  async resolveSyncConflict(conflictId, resolutionStrategy, resolvedBy) {
    const timestamp = Date.now();
    
    try {
      await this.db.prepare(`
        UPDATE sync_conflicts 
        SET resolution_strategy = ?, resolved_at = ?, resolved_by = ?
        WHERE id = ?
      `).bind(resolutionStrategy, timestamp, resolvedBy, conflictId).run();

      console.log(`[AUDIT] 解決同步衝突: ${conflictId} 使用策略 ${resolutionStrategy}`);
    } catch (error) {
      console.error('[AUDIT] 解決同步衝突失敗:', error);
    }
  }

  /**
   * 獲取未解決的同步衝突
   */
  async getPendingConflicts(tableName = null, recordId = null) {
    try {
      let query = 'SELECT * FROM sync_conflicts WHERE resolved_at IS NULL';
      const params = [];

      if (tableName) {
        query += ' AND table_name = ?';
        params.push(tableName);
      }

      if (recordId) {
        query += ' AND record_id = ?';
        params.push(recordId);
      }

      query += ' ORDER BY created_at DESC';

      const results = await this.db.prepare(query).bind(...params).all();
      return results.results || [];
    } catch (error) {
      console.error('[AUDIT] 獲取待解決衝突失敗:', error);
      return [];
    }
  }

  /**
   * 檢查記錄是否被其他用戶鎖定編輯
   */
  async checkEditLock(tableName, recordId, currentUserId) {
    try {
      const result = await this.db.prepare(`
        SELECT edit_locked_by, edit_locked_at FROM ${tableName} WHERE _id = ?
      `).bind(recordId).first();

      if (!result?.edit_locked_by) {
        return { locked: false };
      }

      // 檢查鎖定是否過期（30分鐘）
      const lockAge = Date.now() - result.edit_locked_at;
      const LOCK_TIMEOUT = 30 * 60 * 1000; // 30分鐘

      if (lockAge > LOCK_TIMEOUT || result.edit_locked_by === currentUserId) {
        return { locked: false };
      }

      return {
        locked: true,
        lockedBy: result.edit_locked_by,
        lockedAt: result.edit_locked_at
      };
    } catch (error) {
      console.error('[AUDIT] 檢查編輯鎖定失敗:', error);
      return { locked: false };
    }
  }

  /**
   * 設置編輯鎖定
   */
  async setEditLock(tableName, recordId, userId) {
    const timestamp = Date.now();
    
    try {
      await this.db.prepare(`
        UPDATE ${tableName} 
        SET edit_locked_by = ?, edit_locked_at = ?
        WHERE _id = ?
      `).bind(userId, timestamp, recordId).run();

      console.log(`[AUDIT] 設置編輯鎖定: ${tableName}/${recordId} by ${userId}`);
    } catch (error) {
      console.error('[AUDIT] 設置編輯鎖定失敗:', error);
    }
  }

  /**
   * 釋放編輯鎖定
   */
  async releaseEditLock(tableName, recordId, userId) {
    try {
      await this.db.prepare(`
        UPDATE ${tableName} 
        SET edit_locked_by = NULL, edit_locked_at = NULL
        WHERE _id = ? AND edit_locked_by = ?
      `).bind(recordId, userId).run();

      console.log(`[AUDIT] 釋放編輯鎖定: ${tableName}/${recordId} by ${userId}`);
    } catch (error) {
      console.error('[AUDIT] 釋放編輯鎖定失敗:', error);
    }
  }
}