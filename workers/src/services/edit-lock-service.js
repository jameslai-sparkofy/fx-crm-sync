/**
 * 編輯鎖定服務
 * 防止多個用戶同時編輯同一筆記錄
 */

export class EditLockService {
  constructor(db) {
    this.db = db;
    this.LOCK_TIMEOUT = 30 * 60 * 1000; // 30分鐘鎖定超時
  }

  /**
   * 獲取記錄的編輯鎖
   */
  async acquireLock(objectType, recordId, userId, userRole = 'worker') {
    const lockId = `lock_${objectType}_${recordId}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.LOCK_TIMEOUT).toISOString();

    try {
      // 檢查是否已有有效的鎖
      const existingLock = await this.db.prepare(`
        SELECT * FROM edit_locks 
        WHERE object_type = ? AND record_id = ?
          AND expires_at > datetime('now')
          AND status = 'ACTIVE'
      `).bind(objectType, recordId).first();

      // 如果已經被同一用戶鎖定，延長鎖定時間
      if (existingLock && existingLock.user_id === userId) {
        await this.db.prepare(`
          UPDATE edit_locks 
          SET expires_at = ?, last_activity = ?
          WHERE id = ?
        `).bind(expiresAt, now, existingLock.id).run();

        console.log(`[EditLock] 延長鎖定: ${lockId} by ${userId}`);
        return {
          success: true,
          lockId: existingLock.lock_id,
          message: '鎖定時間已延長',
          expiresAt
        };
      }

      // 如果被其他用戶鎖定，返回衝突
      if (existingLock && existingLock.user_id !== userId) {
        console.log(`[EditLock] 鎖定衝突: ${lockId}, 當前持有者: ${existingLock.user_id}`);
        return {
          success: false,
          error: 'LOCK_CONFLICT',
          message: `記錄正在被 ${existingLock.user_name} 編輯中`,
          lockedBy: {
            userId: existingLock.user_id,
            userName: existingLock.user_name,
            userRole: existingLock.user_role,
            lockedAt: existingLock.created_at,
            expiresAt: existingLock.expires_at
          }
        };
      }

      // 創建新的鎖定
      const result = await this.db.prepare(`
        INSERT INTO edit_locks (
          lock_id, object_type, record_id, user_id, user_name, user_role,
          created_at, expires_at, last_activity, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `).bind(
        lockId,
        objectType,
        recordId,
        userId,
        await this.getUserName(userId),
        userRole,
        now,
        expiresAt,
        now
      ).run();

      console.log(`[EditLock] 創建鎖定: ${lockId} by ${userId}`);
      return {
        success: true,
        lockId,
        message: '獲取編輯鎖成功',
        expiresAt
      };

    } catch (error) {
      console.error(`[EditLock] 獲取鎖定失敗: ${lockId}`, error);
      return {
        success: false,
        error: 'LOCK_ERROR',
        message: `獲取編輯鎖失敗: ${error.message}`
      };
    }
  }

  /**
   * 釋放編輯鎖
   */
  async releaseLock(objectType, recordId, userId) {
    const lockId = `lock_${objectType}_${recordId}`;

    try {
      // 只允許鎖的持有者釋放鎖
      const result = await this.db.prepare(`
        UPDATE edit_locks 
        SET status = 'RELEASED', released_at = ?
        WHERE object_type = ? AND record_id = ? AND user_id = ?
          AND status = 'ACTIVE'
      `).bind(
        new Date().toISOString(),
        objectType,
        recordId,
        userId
      ).run();

      if (result.changes > 0) {
        console.log(`[EditLock] 釋放鎖定: ${lockId} by ${userId}`);
        return {
          success: true,
          message: '編輯鎖已釋放'
        };
      } else {
        return {
          success: false,
          error: 'NO_LOCK_FOUND',
          message: '沒有找到有效的編輯鎖'
        };
      }

    } catch (error) {
      console.error(`[EditLock] 釋放鎖定失敗: ${lockId}`, error);
      return {
        success: false,
        error: 'UNLOCK_ERROR',
        message: `釋放編輯鎖失敗: ${error.message}`
      };
    }
  }

  /**
   * 強制釋放編輯鎖（管理員功能）
   */
  async forceReleaseLock(objectType, recordId, adminUserId) {
    const lockId = `lock_${objectType}_${recordId}`;

    try {
      const result = await this.db.prepare(`
        UPDATE edit_locks 
        SET status = 'FORCE_RELEASED', 
            released_at = ?,
            released_by = ?
        WHERE object_type = ? AND record_id = ? AND status = 'ACTIVE'
      `).bind(
        new Date().toISOString(),
        adminUserId,
        objectType,
        recordId
      ).run();

      if (result.changes > 0) {
        console.log(`[EditLock] 強制釋放鎖定: ${lockId} by admin ${adminUserId}`);
        return {
          success: true,
          message: '編輯鎖已被管理員強制釋放'
        };
      } else {
        return {
          success: false,
          message: '沒有找到需要釋放的編輯鎖'
        };
      }

    } catch (error) {
      console.error(`[EditLock] 強制釋放鎖定失敗: ${lockId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 檢查記錄的鎖定狀態
   */
  async checkLockStatus(objectType, recordId) {
    try {
      const lock = await this.db.prepare(`
        SELECT * FROM edit_locks 
        WHERE object_type = ? AND record_id = ?
          AND expires_at > datetime('now')
          AND status = 'ACTIVE'
      `).bind(objectType, recordId).first();

      if (!lock) {
        return {
          locked: false,
          message: '記錄未被鎖定'
        };
      }

      return {
        locked: true,
        lockInfo: {
          lockId: lock.lock_id,
          userId: lock.user_id,
          userName: lock.user_name,
          userRole: lock.user_role,
          lockedAt: lock.created_at,
          expiresAt: lock.expires_at,
          lastActivity: lock.last_activity
        }
      };

    } catch (error) {
      console.error('[EditLock] 檢查鎖定狀態失敗:', error);
      return {
        locked: false,
        error: error.message
      };
    }
  }

  /**
   * 更新鎖定活動時間（心跳）
   */
  async updateLockActivity(objectType, recordId, userId) {
    try {
      const result = await this.db.prepare(`
        UPDATE edit_locks 
        SET last_activity = ?
        WHERE object_type = ? AND record_id = ? AND user_id = ?
          AND status = 'ACTIVE'
      `).bind(
        new Date().toISOString(),
        objectType,
        recordId,
        userId
      ).run();

      return result.changes > 0;
    } catch (error) {
      console.error('[EditLock] 更新活動時間失敗:', error);
      return false;
    }
  }

  /**
   * 清理過期的鎖定
   */
  async cleanupExpiredLocks() {
    try {
      const result = await this.db.prepare(`
        UPDATE edit_locks 
        SET status = 'EXPIRED'
        WHERE expires_at <= datetime('now') AND status = 'ACTIVE'
      `).run();

      if (result.changes > 0) {
        console.log(`[EditLock] 清理了 ${result.changes} 個過期鎖定`);
      }

      return result.changes;
    } catch (error) {
      console.error('[EditLock] 清理過期鎖定失敗:', error);
      return 0;
    }
  }

  /**
   * 獲取用戶的所有活動鎖定
   */
  async getUserActiveLocks(userId) {
    try {
      const locks = await this.db.prepare(`
        SELECT * FROM edit_locks 
        WHERE user_id = ? AND status = 'ACTIVE'
          AND expires_at > datetime('now')
        ORDER BY created_at DESC
      `).bind(userId).all();

      return locks.results || [];
    } catch (error) {
      console.error('[EditLock] 獲取用戶鎖定失敗:', error);
      return [];
    }
  }

  /**
   * 獲取對象的所有活動鎖定
   */
  async getObjectActiveLocks(objectType) {
    try {
      const locks = await this.db.prepare(`
        SELECT * FROM edit_locks 
        WHERE object_type = ? AND status = 'ACTIVE'
          AND expires_at > datetime('now')
        ORDER BY created_at DESC
      `).bind(objectType).all();

      return locks.results || [];
    } catch (error) {
      console.error('[EditLock] 獲取對象鎖定失敗:', error);
      return [];
    }
  }

  /**
   * 鎖定統計
   */
  async getLockStatistics(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      const stats = await this.db.prepare(`
        SELECT 
          object_type,
          COUNT(*) as total_locks,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_locks,
          COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired_locks,
          COUNT(CASE WHEN status = 'RELEASED' THEN 1 END) as released_locks,
          COUNT(CASE WHEN status = 'FORCE_RELEASED' THEN 1 END) as force_released_locks,
          AVG(
            CASE WHEN released_at IS NOT NULL 
            THEN (julianday(released_at) - julianday(created_at)) * 24 * 60
            END
          ) as avg_lock_duration_minutes
        FROM edit_locks
        WHERE created_at >= ?
        GROUP BY object_type
        ORDER BY total_locks DESC
      `).bind(startDateStr).all();

      return stats.results || [];
    } catch (error) {
      console.error('[EditLock] 獲取鎖定統計失敗:', error);
      return [];
    }
  }

  /**
   * 獲取用戶名稱（簡化版本）
   */
  async getUserName(userId) {
    // 這裡可以集成用戶系統獲取真實用戶名
    // 暫時使用簡化版本
    return `User_${userId.slice(-4)}`;
  }

  /**
   * 驗證編輯權限
   */
  async validateEditPermission(objectType, recordId, userId, userRole) {
    // 檢查鎖定狀態
    const lockStatus = await this.checkLockStatus(objectType, recordId);
    
    if (lockStatus.locked) {
      // 如果被自己鎖定，允許編輯
      if (lockStatus.lockInfo.userId === userId) {
        return { allowed: true, reason: 'own_lock' };
      }
      
      // 如果被其他人鎖定，拒絕編輯
      return { 
        allowed: false, 
        reason: 'locked_by_others',
        lockInfo: lockStatus.lockInfo
      };
    }

    // 沒有鎖定，允許編輯
    return { allowed: true, reason: 'not_locked' };
  }
}