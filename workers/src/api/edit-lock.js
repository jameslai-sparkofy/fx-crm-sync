/**
 * 編輯鎖定API路由
 * 提供記錄編輯鎖定管理功能
 */

import { Router } from 'itty-router';
import { EditLockService } from '../services/edit-lock-service.js';

export const editLockRoutes = Router({ base: '/api/edit-lock' });

/**
 * 獲取編輯鎖
 * POST /api/edit-lock/acquire
 * Body: { objectType, recordId, userId, userRole? }
 */
editLockRoutes.post('/acquire', async (request) => {
  const { env } = request;
  
  try {
    const { objectType, recordId, userId, userRole = 'worker' } = await request.json();
    
    if (!objectType || !recordId || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '缺少必要參數: objectType, recordId, userId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const editLockService = new EditLockService(env.DB);
    const result = await editLockService.acquireLock(objectType, recordId, userId, userRole);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 409,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 釋放編輯鎖
 * POST /api/edit-lock/release
 * Body: { objectType, recordId, userId }
 */
editLockRoutes.post('/release', async (request) => {
  const { env } = request;
  
  try {
    const { objectType, recordId, userId } = await request.json();
    
    if (!objectType || !recordId || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '缺少必要參數: objectType, recordId, userId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const editLockService = new EditLockService(env.DB);
    const result = await editLockService.releaseLock(objectType, recordId, userId);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 404,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 檢查鎖定狀態
 * GET /api/edit-lock/status/{objectType}/{recordId}
 */
editLockRoutes.get('/status/:objectType/:recordId', async (request) => {
  const { env } = request;
  
  try {
    const { objectType, recordId } = request.params;
    
    const editLockService = new EditLockService(env.DB);
    const result = await editLockService.checkLockStatus(objectType, recordId);
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 更新鎖定活動時間（心跳）
 * POST /api/edit-lock/heartbeat
 * Body: { objectType, recordId, userId }
 */
editLockRoutes.post('/heartbeat', async (request) => {
  const { env } = request;
  
  try {
    const { objectType, recordId, userId } = await request.json();
    
    if (!objectType || !recordId || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '缺少必要參數: objectType, recordId, userId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const editLockService = new EditLockService(env.DB);
    const updated = await editLockService.updateLockActivity(objectType, recordId, userId);
    
    return new Response(JSON.stringify({
      success: updated,
      message: updated ? '活動時間已更新' : '未找到有效的編輯鎖'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 強制釋放鎖定（管理員功能）
 * POST /api/edit-lock/force-release
 * Body: { objectType, recordId, adminUserId }
 */
editLockRoutes.post('/force-release', async (request) => {
  const { env } = request;
  
  try {
    const { objectType, recordId, adminUserId } = await request.json();
    
    if (!objectType || !recordId || !adminUserId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '缺少必要參數: objectType, recordId, adminUserId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // TODO: 在實際應用中應該驗證 adminUserId 是否具有管理員權限
    
    const editLockService = new EditLockService(env.DB);
    const result = await editLockService.forceReleaseLock(objectType, recordId, adminUserId);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 獲取用戶的活動鎖定
 * GET /api/edit-lock/user/{userId}
 */
editLockRoutes.get('/user/:userId', async (request) => {
  const { env } = request;
  
  try {
    const { userId } = request.params;
    
    const editLockService = new EditLockService(env.DB);
    const locks = await editLockService.getUserActiveLocks(userId);
    
    return new Response(JSON.stringify({
      success: true,
      data: locks
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 獲取對象的所有活動鎖定
 * GET /api/edit-lock/object/{objectType}
 */
editLockRoutes.get('/object/:objectType', async (request) => {
  const { env } = request;
  
  try {
    const { objectType } = request.params;
    
    const editLockService = new EditLockService(env.DB);
    const locks = await editLockService.getObjectActiveLocks(objectType);
    
    return new Response(JSON.stringify({
      success: true,
      data: locks
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 獲取鎖定統計
 * GET /api/edit-lock/stats
 */
editLockRoutes.get('/stats', async (request) => {
  const { env } = request;
  
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    const editLockService = new EditLockService(env.DB);
    const stats = await editLockService.getLockStatistics(days);
    
    // 獲取活動鎖定概覽
    const activeLocks = await env.DB.prepare(`
      SELECT * FROM v_active_locks
    `).all();
    
    // 獲取鎖定衝突歷史
    const conflicts = await env.DB.prepare(`
      SELECT * FROM v_lock_conflicts LIMIT 20
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        statistics: stats,
        activeLocks: activeLocks.results || [],
        recentConflicts: conflicts.results || []
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 清理過期鎖定
 * POST /api/edit-lock/cleanup
 */
editLockRoutes.post('/cleanup', async (request) => {
  const { env } = request;
  
  try {
    const editLockService = new EditLockService(env.DB);
    const cleanedCount = await editLockService.cleanupExpiredLocks();
    
    return new Response(JSON.stringify({
      success: true,
      message: `已清理 ${cleanedCount} 個過期鎖定`,
      cleanedCount
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 驗證編輯權限
 * POST /api/edit-lock/validate
 * Body: { objectType, recordId, userId, userRole }
 */
editLockRoutes.post('/validate', async (request) => {
  const { env } = request;
  
  try {
    const { objectType, recordId, userId, userRole } = await request.json();
    
    if (!objectType || !recordId || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '缺少必要參數: objectType, recordId, userId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const editLockService = new EditLockService(env.DB);
    const result = await editLockService.validateEditPermission(objectType, recordId, userId, userRole);
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});