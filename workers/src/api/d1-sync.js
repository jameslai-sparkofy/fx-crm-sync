import { Router } from 'itty-router';
import { CrmWriteService } from '../services/crm-write-service.js';
import { SyncLogger } from '../services/sync-logger.js';

export const d1SyncRoutes = Router({ base: '/api/d1-sync' });

/**
 * 處理 D1 變更並同步到 CRM
 * POST /api/d1-sync/process
 */
d1SyncRoutes.post('/process', async (request) => {
  const { env } = request;
  const crmWriteService = new CrmWriteService(env);
  const syncLogger = new SyncLogger(env.DB);
  
  try {
    // 獲取待處理的變更
    const pendingChanges = await env.DB.prepare(`
      SELECT * FROM d1_change_log 
      WHERE sync_status = 'pending' 
        AND sync_attempts < 3
      ORDER BY change_time ASC
      LIMIT 50
    `).all();
    
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const change of pendingChanges.results) {
      try {
        // 更新狀態為同步中
        await env.DB.prepare(`
          UPDATE d1_change_log 
          SET sync_status = 'syncing', 
              sync_attempts = sync_attempts + 1
          WHERE id = ?
        `).bind(change.id).run();
        
        // 解析數據
        const newValues = change.new_values ? JSON.parse(change.new_values) : null;
        const operation = change.operation.toLowerCase();
        
        // 執行同步
        const result = await crmWriteService.writeToCrm(
          change.object_api_name,
          change.record_id,
          newValues,
          operation === 'insert' ? 'create' : operation === 'delete' ? 'delete' : 'update',
          'd1_change'
        );
        
        if (result.success) {
          // 更新為成功
          await env.DB.prepare(`
            UPDATE d1_change_log 
            SET sync_status = 'completed',
                synced_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(change.id).run();
          
          results.success++;
        } else {
          throw new Error(result.error || '同步失敗');
        }
        
      } catch (error) {
        // 記錄錯誤
        await env.DB.prepare(`
          UPDATE d1_change_log 
          SET sync_status = CASE 
                WHEN sync_attempts >= 3 THEN 'failed' 
                ELSE 'pending' 
              END,
              sync_error = ?
          WHERE id = ?
        `).bind(error.message, change.id).run();
        
        results.failed++;
        results.errors.push({
          changeId: change.id,
          recordId: change.record_id,
          error: error.message
        });
      }
      
      results.processed++;
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[D1 Sync] 處理失敗:', error);
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
 * 獲取 D1 變更日誌
 * GET /api/d1-sync/changes
 */
d1SyncRoutes.get('/changes', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'all';
  const limit = parseInt(url.searchParams.get('limit') || '50');
  
  try {
    let query = `
      SELECT * FROM d1_change_log 
      ${status !== 'all' ? 'WHERE sync_status = ?' : ''}
      ORDER BY change_time DESC 
      LIMIT ?
    `;
    
    const stmt = status !== 'all' 
      ? env.DB.prepare(query).bind(status, limit)
      : env.DB.prepare(query).bind(limit);
    
    const result = await stmt.all();
    
    const changes = result.results.map(change => ({
      ...change,
      old_values: change.old_values ? JSON.parse(change.old_values) : null,
      new_values: change.new_values ? JSON.parse(change.new_values) : null,
      changed_fields: change.changed_fields ? JSON.parse(change.changed_fields) : []
    }));
    
    return new Response(JSON.stringify({
      success: true,
      data: changes,
      count: changes.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[D1 Sync] 獲取變更日誌失敗:', error);
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
 * 手動觸發 D1 到 CRM 的同步
 * POST /api/d1-sync/manual
 */
d1SyncRoutes.post('/manual', async (request) => {
  const { env } = request;
  const body = await request.json().catch(() => ({}));
  const { objectApiName, recordId, data, operation = 'update' } = body;
  
  if (!objectApiName || !recordId || !data) {
    return new Response(JSON.stringify({
      success: false,
      error: '缺少必要參數: objectApiName, recordId, data'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const crmWriteService = new CrmWriteService(env);
    const result = await crmWriteService.writeToCrm(
      objectApiName,
      recordId,
      data,
      operation,
      'manual'
    );
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[D1 Sync] 手動同步失敗:', error);
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
 * 重試失敗的同步
 * POST /api/d1-sync/retry
 */
d1SyncRoutes.post('/retry', async (request) => {
  const { env } = request;
  
  try {
    // 重置失敗的同步任務
    const result = await env.DB.prepare(`
      UPDATE d1_change_log 
      SET sync_status = 'pending',
          sync_attempts = 0,
          sync_error = NULL
      WHERE sync_status = 'failed'
    `).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: `已重置 ${result.meta.changes} 個失敗的同步任務`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[D1 Sync] 重試失敗:', error);
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
 * 配置雙向同步設定
 * GET /api/d1-sync/config
 */
d1SyncRoutes.get('/config', async (request) => {
  const { env } = request;
  
  try {
    // 獲取或設置雙向同步配置
    const config = await env.KV.get('BIDIRECTIONAL_SYNC_CONFIG', 'json') || {
      enabled: true,
      autoSync: true,
      syncInterval: 30000, // 30 秒
      maxRetries: 3,
      conflictResolution: 'last_write_wins', // 'last_write_wins' | 'crm_wins' | 'd1_wins'
      excludedFields: ['sync_time', 'is_deleted', '_id'],
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
    
    return new Response(JSON.stringify({
      success: true,
      data: config
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
 * 更新雙向同步設定
 * PUT /api/d1-sync/config
 */
d1SyncRoutes.put('/config', async (request) => {
  const { env } = request;
  const config = await request.json();
  
  try {
    await env.KV.put('BIDIRECTIONAL_SYNC_CONFIG', JSON.stringify(config));
    
    return new Response(JSON.stringify({
      success: true,
      message: '配置已更新',
      data: config
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