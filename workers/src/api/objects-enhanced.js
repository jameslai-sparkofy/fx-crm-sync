import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';

export const objectsEnhancedRoutes = Router({ base: '/api/objects' });

/**
 * 獲取所有同步對象清單
 * GET /api/objects
 */
objectsEnhancedRoutes.get('/', async (request) => {
  const { env } = request;
  
  try {
    // 預定義的對象列表
    const defaultObjects = [
      { apiName: 'NewOpportunityObj', displayName: '商機', isCustom: false, isSynced: true, isEnabled: true, description: '商機管理對象' },
      { apiName: 'NewOpportunityContactsObj', displayName: '商機連絡人', isCustom: false, isSynced: true, isEnabled: true, description: '商機連絡人管理對象' },
      { apiName: 'SupplierObj', displayName: '供應商', isCustom: false, isSynced: true, isEnabled: true, description: '供應商管理對象' }
    ];
    
    const customObjects = [
      { apiName: 'object_8W9cb__c', displayName: '案場(SPC)', isCustom: true, isSynced: true, isEnabled: true, description: '案場管理對象' },
      { apiName: 'object_k1XqG__c', displayName: '維修單', isCustom: true, isSynced: true, isEnabled: true, description: 'SPC維修單管理對象' },
      { apiName: 'object_50HJ8__c', displayName: '工地師父', isCustom: true, isSynced: true, isEnabled: true, description: '工地師父管理對象' },
      { apiName: 'site_cabinet__c', displayName: '案場(浴櫃)', isCustom: true, isSynced: true, isEnabled: true, description: '浴櫃案場管理對象' },
      { apiName: 'progress_management_announ__c', displayName: '進度公告', isCustom: true, isSynced: true, isEnabled: true, description: '進度管理公告對象' }
    ];
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        defaultObjects,
        customObjects
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('獲取對象清單失敗:', error);
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
      'NewOpportunityContactsObj': { enabled: true },
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
 * 切換對象同步狀態（新路由）
 * POST /api/objects/:apiName/toggle
 */
objectsEnhancedRoutes.post('/:apiName/toggle', async (request) => {
  const { env, params } = request;
  const { apiName } = params;
  
  try {
    const body = await request.json();
    const { enabled } = body;
    
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

/**
 * 初始化對象資料表
 * POST /api/objects/:apiName/init-table
 */
objectsEnhancedRoutes.post('/:apiName/init-table', async (request) => {
  const { env, params } = request;
  const { apiName } = params;
  
  try {
    // 根據對象名稱創建對應的資料表
    const tableName = apiName.replace(/__c$/, '').toLowerCase();
    
    // 這裡應該根據對象結構創建資料表
    // 簡化版本：創建基本結構
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        updated_at TEXT,
        data JSON
      )
    `;
    
    await env.DB.prepare(createTableSQL).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: `已初始化 ${apiName} 的資料表`,
      data: { tableName }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('初始化資料表失敗:', error);
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
 * 同步對象結構
 * POST /api/objects/:apiName/sync-schema
 */
objectsEnhancedRoutes.post('/:apiName/sync-schema', async (request) => {
  const { env, params } = request;
  const { apiName } = params;
  
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 獲取對象欄位結構
    const isCustom = apiName.endsWith('__c');
    const endpoint = isCustom ? '/cgi/crm/custom/v2/object/describe' : '/cgi/crm/v2/object/describe';
    
    const response = await fxClient.post(endpoint, {
      data: { objectApiName: apiName }
    });
    
    if (response.errorCode !== 0) {
      throw new Error(response.errorMessage || '獲取對象結構失敗');
    }
    
    // 保存結構到 KV
    await env.KV.put(`OBJECT_SCHEMA_${apiName}`, JSON.stringify(response.data));
    
    return new Response(JSON.stringify({
      success: true,
      message: `已同步 ${apiName} 的結構`,
      data: {
        fieldCount: response.data?.fields?.length || 0
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('同步結構失敗:', error);
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
 * 獲取對象欄位
 * GET /api/objects/:apiName/fields
 */
objectsEnhancedRoutes.get('/:apiName/fields', async (request) => {
  const { env, params } = request;
  const { apiName } = params;
  
  // 導入中文欄位名稱對照表
  const { getFieldDisplayName } = await import('../data/field-labels-zh.js');
  
  try {
    // 先嘗試從KV獲取已同步的對象結構（包含中文欄位名稱）
    const cachedSchema = await env.KV.get(`OBJECT_SCHEMA_${apiName}`, 'json');
    
    if (cachedSchema && cachedSchema.fields) {
      // 使用CRM API返回的完整欄位資訊（包含中文名稱）
      console.log(`使用快取的對象結構: ${apiName}`);
      
      const fields = cachedSchema.fields.map(field => ({
        apiName: field.apiName,
        displayName: field.label || getFieldDisplayName(apiName, field.apiName),
        fieldType: field.fieldType || 'TEXT',
        dataType: field.dataType || field.fieldType || 'TEXT',
        isRequired: field.required || false,
        isCustom: field.apiName.includes('__c') && !field.apiName.includes('__r') && !field.apiName.includes('__l')
      }));
      
      const systemFields = fields.filter(f => !f.isCustom);
      const customFields = fields.filter(f => f.isCustom);
      
      return new Response(JSON.stringify({
        success: true,
        data: { systemFields, customFields },
        source: 'crm_api'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 如果沒有快取，嘗試從CRM API獲取
    console.log(`快取中沒有找到 ${apiName} 的結構，嘗試從CRM API獲取...`);
    
    try {
      const fxClient = new (await import('../utils/fx-client.js')).FxClient(env);
      await fxClient.init();
      
      const isCustom = apiName.endsWith('__c');
      const endpoint = isCustom ? '/cgi/crm/custom/v2/object/describe' : '/cgi/crm/v2/object/describe';
      
      const response = await fxClient.post(endpoint, {
        data: { objectApiName: apiName }
      });
      
      if (response.errorCode === 0 && response.data && response.data.fields) {
        console.log(`從CRM API獲取到 ${apiName} 的結構，欄位數量: ${response.data.fields.length}`);
        
        // 儲存到KV以供下次使用
        await env.KV.put(`OBJECT_SCHEMA_${apiName}`, JSON.stringify(response.data));
        
        // 處理欄位資訊
        const fields = response.data.fields.map(field => ({
          apiName: field.apiName,
          displayName: field.label || getFieldDisplayName(apiName, field.apiName),
          fieldType: field.fieldType || 'TEXT',
          dataType: field.dataType || field.fieldType || 'TEXT',
          isRequired: field.required || false,
          isCustom: field.apiName.includes('__c') && !field.apiName.includes('__r') && !field.apiName.includes('__l')
        }));
        
        const systemFields = fields.filter(f => !f.isCustom);
        const customFields = fields.filter(f => f.isCustom);
        
        return new Response(JSON.stringify({
          success: true,
          data: { systemFields, customFields },
          source: 'crm_api_fresh'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        console.log(`CRM API返回錯誤: ${response.errorMessage || '未知錯誤'}，使用後備方案`);
      }
    } catch (crmError) {
      console.log(`CRM API調用失敗: ${crmError.message}，使用後備方案`);
    }
    
    // 後備方案：使用D1資料庫結構（但提示用戶同步對象結構）
    console.log(`使用後備方案：從D1資料庫讀取 ${apiName} 的結構`);
    
    const tableName = apiName.toLowerCase();
    const tableInfoQuery = `PRAGMA table_info(${tableName})`;
    const { results } = await env.DB.prepare(tableInfoQuery).all();
    
    if (!results || results.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: { systemFields: [], customFields: [] },
        warning: '資料表不存在，請先同步對象結構',
        source: 'db_fallback'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 系統欄位名稱列表
    const systemFieldNames = [
      '_id', 'id', 'name', 'created_at', 'updated_at', 'create_by', 'created_by', 'last_modified_by',
      'owner', 'data_id', 'account_id', 'stage', 'amount', 'close_date', 'create_time', 'last_modified_time',
      'probability', 'description', 'next_step', 'loss_reason', 'life_status', 'lock_status', 'version'
    ];
    
    // 處理欄位資訊（使用簡單的名稱轉換）
    const fields = results.map(column => {
      const isSystem = systemFieldNames.includes(column.name.toLowerCase()) || 
                       (!column.name.includes('__c') && !column.name.startsWith('field_'));
      
      // 生成顯示名稱（英文轉換，因為沒有中文對照）
      let displayName = column.name;
      if (column.name.includes('__c')) {
        displayName = column.name
          .replace(/__c$/, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim();
      } else {
        displayName = column.name
          .replace(/^_/, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim();
      }
      
      return {
        apiName: column.name,
        displayName: getFieldDisplayName(apiName, column.name),
        fieldType: column.type,
        dataType: column.type,
        isRequired: column.notnull === 1,
        isCustom: !isSystem
      };
    });
    
    const systemFields = fields.filter(f => !f.isCustom);
    const customFields = fields.filter(f => f.isCustom);
    
    return new Response(JSON.stringify({
      success: true,
      data: { systemFields, customFields },
      warning: '使用資料庫結構顯示，建議點擊「同步結構」按鈕獲取完整的中文欄位名稱',
      source: 'db_fallback'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取欄位失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});