import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';
import { DataSyncService } from '../sync/data-sync-service.js';

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
  
  try {
    // 解析請求內容
    const payload = await request.json();
    console.log('[Webhook] 收到通知:', JSON.stringify(payload, null, 2));
    
    // 驗證必要欄位
    if (!payload.event || !payload.objectApiName || !payload.objectId) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少必要欄位: event, objectApiName, objectId'
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
    
    // 根據事件類型處理
    switch (payload.event) {
      case 'object.created':
      case 'object.updated':
        // 觸發單筆記錄同步
        await syncSingleRecord(env, payload.objectApiName, payload.objectId);
        break;
        
      case 'object.deleted':
        // 標記記錄為已刪除
        await markRecordAsDeleted(env, payload.objectApiName, payload.objectId);
        break;
        
      default:
        console.log('[Webhook] 未知事件類型:', payload.event);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook 處理成功'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[Webhook] 處理失敗:', error);
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
          displayName: '案場'
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
async function syncSingleRecord(env, objectApiName, objectId) {
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 根據對象類型查詢單筆記錄
    let apiPath, dataKey;
    if (objectApiName === 'NewOpportunityObj') {
      apiPath = '/cgi/crm/v2/data/get';
      dataKey = 'data';
    } else {
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
    
    if (objectApiName === 'NewOpportunityObj') {
      await dataSyncService.saveOpportunities([record]);
    } else if (objectApiName === 'object_8W9cb__c') {
      await dataSyncService.saveSites([record]);
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
    let tableName;
    if (objectApiName === 'NewOpportunityObj') {
      tableName = 'newopportunityobj';
    } else if (objectApiName === 'object_8W9cb__c') {
      tableName = 'object_8w9cb__c';
    } else {
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