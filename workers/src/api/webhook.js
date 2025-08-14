import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';
import { DataSyncService } from '../sync/data-sync-service.js';
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
  const syncLogger = new SyncLogger(env.DB);
  const startTime = Date.now();
  
  try {
    // 解析請求內容
    const payload = await request.json();
    console.log('[Webhook] 收到通知:', JSON.stringify(payload, null, 2));
    
    // 驗證必要欄位
    if (!payload.event || !payload.objectApiName || !payload.objectId) {
      const error = '缺少必要欄位: event, objectApiName, objectId';
      await syncLogger.logWebhookSync(request, payload, { success: false, error });
      return new Response(JSON.stringify({
        success: false,
        error
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 記錄 Webhook 事件
    await env.DB.prepare(`
      INSERT INTO webhook_logs (
        event_type, object_api_name, object_id, 
        payload, received_at
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      payload.event,
      payload.objectApiName,
      payload.objectId,
      JSON.stringify(payload),
      new Date().toISOString()
    ).run();
    
    let syncResult = { success: true };
    
    // 根據事件類型處理
    try {
      switch (payload.event) {
        case 'object.created':
        case 'object.updated':
          // 觸發單筆記錄同步
          await syncSingleRecord(env, payload.objectApiName, payload.objectId, payload.data);
          break;
          
        case 'object.deleted':
          // 標記記錄為已刪除
          await markRecordAsDeleted(env, payload.objectApiName, payload.objectId);
          break;
          
        default:
          console.log('[Webhook] 未知事件類型:', payload.event);
      }
    } catch (syncError) {
      syncResult = { success: false, error: syncError.message };
      throw syncError;
    }
    
    // 記錄同步日誌
    syncResult.duration = Date.now() - startTime;
    await syncLogger.logWebhookSync(request, payload, syncResult);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook 處理成功',
      duration: syncResult.duration
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[Webhook] 處理失敗:', error);
    
    // 記錄失敗日誌
    await syncLogger.logWebhookSync(request, payload || {}, { 
      success: false, 
      error: error.message,
      duration: Date.now() - startTime
    });
    
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
 * 標記記錄為已刪除
 */
async function markRecordAsDeleted(env, objectApiName, objectId) {
  try {
    // 對象名稱到表名的映射
    const tableMapping = {
      'NewOpportunityObj': 'newopportunityobj',
      'object_8W9cb__c': 'object_8w9cb__c',
      'object_k1XqG__c': 'object_k1xqg__c',
      'object_50HJ8__c': 'object_50hj8__c',
      'SupplierObj': 'supplierobj',
      'site_cabinet__c': 'site_cabinet__c',
      'progress_management_announ__c': 'progress_management_announ__c'
    };
    
    const tableName = tableMapping[objectApiName];
    if (!tableName) {
      throw new Error(`不支持的對象類型: ${objectApiName}`);
    }
    
    await env.DB.prepare(`
      UPDATE ${tableName} 
      SET is_deleted = 1, 
          fx_updated_at = ?,
          sync_time = CURRENT_TIMESTAMP
      WHERE _id = ?
    `).bind(
      Date.now(),
      objectId
    ).run();
    
    console.log('[Webhook] 標記記錄為已刪除:', objectId);
    
  } catch (error) {
    console.error('[Webhook] 標記刪除失敗:', error);
    throw error;
  }
}