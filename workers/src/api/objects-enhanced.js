import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';

export const objectsEnhancedRoutes = Router({ base: '/api/objects' });

/**
 * 獲取對象同步狀態
 * GET /api/objects/status
 */
objectsEnhancedRoutes.get('/status', async (request) => {
  const { env } = request;
  
  try {
    // 從 KV 存儲獲取對象狀態
    const status = await env.KV.get('SYNC_OBJECTS_STATUS', 'json') || {};
    
    // 默認所有對象都啟用
    const defaultStatus = {
      'NewOpportunityObj': { enabled: true },
      'object_8W9cb__c': { enabled: true },
      'object_k1XqG__c': { enabled: true },
      'object_50HJ8__c': { enabled: true },
      'SupplierObj': { enabled: true },
      'site_cabinet__c': { enabled: true },
      'progress_management_announ__c': { enabled: true }
    };
    
    // 合併默認狀態和存儲的狀態
    const mergedStatus = { ...defaultStatus, ...status };
    
    return new Response(JSON.stringify({
      success: true,
      data: mergedStatus
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('獲取對象狀態失敗:', error);
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
 * 切換對象同步狀態
 * POST /api/objects/toggle
 */
objectsEnhancedRoutes.post('/toggle', async (request) => {
  const { env } = request;
  
  try {
    const body = await request.json();
    const { apiName, enabled } = body;
    
    // 獲取當前狀態
    const status = await env.KV.get('SYNC_OBJECTS_STATUS', 'json') || {};
    
    // 更新狀態
    status[apiName] = { 
      enabled: enabled,
      updatedAt: new Date().toISOString()
    };
    
    // 保存到 KV
    await env.KV.put('SYNC_OBJECTS_STATUS', JSON.stringify(status));
    
    return new Response(JSON.stringify({
      success: true,
      message: `已${enabled ? '啟用' : '停用'} ${apiName} 的同步`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('更新對象狀態失敗:', error);
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
 * 發現 CRM 對象
 * POST /api/objects/discover
 */
objectsEnhancedRoutes.post('/discover', async (request) => {
  const { env } = request;
  
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 獲取標準對象列表
    const standardObjects = [
      { apiName: 'NewOpportunityObj', displayName: '商機', isCustom: false },
      { apiName: 'SupplierObj', displayName: '供應商', isCustom: false },
      { apiName: 'AccountObj', displayName: '客戶', isCustom: false },
      { apiName: 'ContactObj', displayName: '聯絡人', isCustom: false },
      { apiName: 'ProductObj', displayName: '產品', isCustom: false }
    ];
    
    // 獲取自定義對象列表（通過 API）
    const customObjectsResponse = await fxClient.post('/cgi/crm/custom/v2/object/list', {
      data: {
        pageSize: 100,
        pageNumber: 1
      }
    });
    
    let customObjects = [];
    if (customObjectsResponse.errorCode === 0) {
      customObjects = customObjectsResponse.data?.objects?.map(obj => ({
        apiName: obj.apiName,
        displayName: obj.label,
        isCustom: true
      })) || [];
    }
    
    const allObjects = [...standardObjects, ...customObjects];
    
    // 保存到 KV
    await env.KV.put('DISCOVERED_OBJECTS', JSON.stringify(allObjects));
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        count: allObjects.length,
        objects: allObjects
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('發現對象失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});