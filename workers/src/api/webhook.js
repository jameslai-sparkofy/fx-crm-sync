import { Router } from 'itty-router';
import { RealtimeSyncService } from '../services/realtime-sync-service.js';
import { SyncLogger } from '../services/sync-logger.js';

export const webhookRoutes = Router({ base: '/api/webhook' });

/**
 * Webhook 端點 - 接收來自紛享銷客的數據變更通知
 * POST /api/webhook/notify
 * 
 * 預期的請求格式:
 * {
 *   "event": "object.created" | "object.updated" | "object.deleted",
 *   "objectApiName": "NewOpportunityObj" | "object_8W9cb__c",
 *   "objectId": "記錄ID",
 *   "data": { ... },
 *   "timestamp": 1234567890
 * }
 */
webhookRoutes.post('/notify', async (request) => {
  const { env } = request;
  const startTime = Date.now();
  let payload;
  
  try {
    // 解析請求內容
    payload = await request.json();
    console.log('[Webhook] 收到通知:', JSON.stringify(payload, null, 2));
    
    // 驗證必要欄位
    if (!payload.event || !payload.objectApiName || !payload.objectId) {
      const error = '缺少必要欄位: event, objectApiName, objectId';
      return new Response(JSON.stringify({
        success: false,
        error
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 記錄 Webhook 事件到數據庫
    const logId = await logWebhookReceived(env.DB, payload);
    
    // 使用新的即時同步服務處理
    const realtimeSyncService = new RealtimeSyncService(env);
    await realtimeSyncService.init();
    
    const syncResult = await realtimeSyncService.handleRealtimeSync(payload);
    
    // 更新webhook日誌狀態
    await updateWebhookLogStatus(env.DB, logId, syncResult.success, syncResult.error);
    
    return new Response(JSON.stringify({
      success: syncResult.success,
      message: syncResult.success ? 
        (syncResult.skipped ? '已跳過同步（避免衝突）' : 'Webhook 處理成功') : 
        'Webhook 處理失敗',
      data: {
        skipped: syncResult.skipped || false,
        reason: syncResult.reason,
        recordsProcessed: syncResult.recordsProcessed || 0,
        duration: syncResult.duration
      }
    }), {
      status: syncResult.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[Webhook] 處理失敗:', error);
    
    // 如果有payload和logId，更新失敗狀態
    if (payload) {
      try {
        await updateWebhookLogStatus(env.DB, null, false, error.message, payload);
      } catch (logError) {
        console.error('[Webhook] 記錄失敗日誌時出錯:', logError);
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 查看 Webhook 配置資訊
 * GET /api/webhook/config
 */
webhookRoutes.get('/config', async (request) => {
  const { env } = request;
  const baseUrl = 'https://fx-crm-sync.lai-jameslai.workers.dev';
  
  return new Response(JSON.stringify({
    success: true,
    data: {
      webhookUrl: `${baseUrl}/api/webhook/notify`,
      supportedEvents: [
        'object.created',
        'object.updated',
        'object.deleted'
      ],
      supportedObjects: [
        {
          apiName: 'NewOpportunityObj',
          displayName: '商機'
        },
        {
          apiName: 'object_8W9cb__c',
          displayName: '案場(SPC)'
        },
        {
          apiName: 'object_k1XqG__c',
          displayName: 'SPC維修單'
        },
        {
          apiName: 'object_50HJ8__c',
          displayName: '工地師父'
        },
        {
          apiName: 'SupplierObj',
          displayName: '供應商'
        },
        {
          apiName: 'site_cabinet__c',
          displayName: '案場(浴櫃)'
        },
        {
          apiName: 'progress_management_announ__c',
          displayName: '進度管理公告'
        }
      ],
      instructions: '請在紛享銷客管理後台配置 Webhook，將上述 webhookUrl 填入通知地址'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

/**
 * 查看最近的 Webhook 日誌
 * GET /api/webhook/logs
 */
webhookRoutes.get('/logs', async (request) => {
  const { env } = request;
  
  try {
    const logs = await env.DB.prepare(`
      SELECT * FROM webhook_logs 
      ORDER BY received_at DESC 
      LIMIT 50
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: logs.results
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
 * 即時同步統計
 * GET /api/webhook/realtime-stats
 */
webhookRoutes.get('/realtime-stats', async (request) => {
  const { env } = request;
  
  try {
    const realtimeSyncService = new RealtimeSyncService(env);
    const stats = await realtimeSyncService.getRealtimeSyncStats(7);
    
    // 獲取概覽視圖數據
    const overviewResult = await env.DB.prepare(`
      SELECT * FROM v_realtime_sync_overview
    `).all();
    
    // 獲取最近的活動
    const recentActivityResult = await env.DB.prepare(`
      SELECT * FROM v_recent_webhook_activity LIMIT 10
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        stats: stats,
        overview: overviewResult.results || [],
        recentActivity: recentActivityResult.results || []
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
 * 測試webhook端點
 * POST /api/webhook/test
 */
webhookRoutes.post('/test', async (request) => {
  const { env } = request;
  
  try {
    // 創建測試webhook payload
    const testPayload = {
      event: 'object.updated',
      objectApiName: 'object_8W9cb__c',
      objectId: 'test_' + Date.now(),
      data: {
        name: '測試案場',
        shift_time__c: '測試工班'
      },
      timestamp: Date.now()
    };
    
    console.log('[Webhook Test] 創建測試payload:', testPayload);
    
    // 記錄測試事件
    await logWebhookReceived(env.DB, testPayload);
    
    return new Response(JSON.stringify({
      success: true,
      message: '測試webhook已記錄',
      data: testPayload
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
 * 同步單筆記錄
 */
async function syncSingleRecord(env, objectApiName, objectId, changedData = null) {
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 根據對象類型查詢單筆記錄
    let apiPath, dataKey;
    // 標準對象使用 v2 API
    if (objectApiName === 'NewOpportunityObj' || objectApiName === 'SupplierObj') {
      apiPath = '/cgi/crm/v2/data/get';
      dataKey = 'data';
    } else {
      // 自定義對象使用 custom/v2 API
      apiPath = '/cgi/crm/custom/v2/data/get';
      dataKey = 'data';
    }
    
    const response = await fxClient.post(apiPath, {
      data: {
        dataObjectApiName: objectApiName,
        id: objectId
      }
    });
    
    if (response.errorCode !== 0) {
      throw new Error(`獲取記錄失敗: ${response.errorMessage}`);
    }
    
    const record = response[dataKey];
    if (!record) {
      console.log('[Webhook] 記錄不存在:', objectId);
      return;
    }
    
    // 使用 DataSyncService 保存記錄
    const dataSyncService = new DataSyncService(fxClient, env.DB);
    
    // 根據不同對象類型調用對應的保存方法
    switch(objectApiName) {
      case 'NewOpportunityObj':
        await dataSyncService.saveOpportunities([record]);
        break;
      case 'object_8W9cb__c':
        await dataSyncService.saveSites([record]);
        break;
      case 'object_k1XqG__c':
        await dataSyncService.saveRepairOrders([record]);
        break;
      case 'object_50HJ8__c':
        await dataSyncService.saveWorkers([record]);
        break;
      case 'SupplierObj':
        await dataSyncService.saveSuppliers([record]);
        break;
      case 'site_cabinet__c':
        await dataSyncService.saveSiteCabinet([record]);
        break;
      case 'progress_management_announ__c':
        await dataSyncService.saveProgressAnnouncement([record]);
        break;
      default:
        console.log('[Webhook] 不支援的對象類型:', objectApiName);
        return;
    }
    
    console.log('[Webhook] 單筆記錄同步成功:', objectId);
    
  } catch (error) {
    console.error('[Webhook] 單筆記錄同步失敗:', error);
    throw error;
  }
}

/**
 * 記錄webhook接收日誌
 */
async function logWebhookReceived(db, payload) {
  try {
    const result = await db.prepare(`
      INSERT INTO webhook_logs (
        event_type, object_api_name, object_id, 
        payload, received_at, status
      ) VALUES (?, ?, ?, ?, ?, 'PENDING')
    `).bind(
      payload.event,
      payload.objectApiName,
      payload.objectId,
      JSON.stringify(payload),
      new Date().toISOString()
    ).run();
    
    return result.meta.last_row_id;
  } catch (error) {
    console.error('[Webhook] 記錄接收日誌失敗:', error);
    return null;
  }
}

/**
 * 更新webhook日誌狀態
 */
async function updateWebhookLogStatus(db, logId, success, errorMessage, payload = null) {
  try {
    if (logId) {
      // 更新現有記錄
      await db.prepare(`
        UPDATE webhook_logs 
        SET status = ?, error_message = ?, processed_at = ?
        WHERE id = ?
      `).bind(
        success ? 'SUCCESS' : 'FAILED',
        errorMessage || null,
        new Date().toISOString(),
        logId
      ).run();
    } else if (payload) {
      // 創建新的失敗記錄
      await db.prepare(`
        INSERT INTO webhook_logs (
          event_type, object_api_name, object_id,
          payload, received_at, processed_at, status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, 'FAILED', ?)
      `).bind(
        payload.event,
        payload.objectApiName,
        payload.objectId,
        JSON.stringify(payload),
        new Date().toISOString(),
        new Date().toISOString(),
        errorMessage
      ).run();
    }
  } catch (error) {
    console.error('[Webhook] 更新日誌狀態失敗:', error);
  }
}