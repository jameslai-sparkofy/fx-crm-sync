import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';
import { ObjectDiscoveryService } from '../sync/object-discovery.js';

export const objectRoutes = Router({ base: '/api/objects' });

/**
 * 獲取CRM對象列表
 * GET /api/objects
 * 支持搜索參數: ?search=案場
 * 
 * 返回格式：
 * {
 *   defaultObjects: [...],  // 預設對象
 *   customObjects: [...]    // 自定義對象
 * }
 */
objectRoutes.get('/', async (request) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get('search') || '';
  
  const { env } = request;
  
  try {
    // 初始化紛享銷客客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 初始化對象發現服務
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    
    // 獲取所有對象
    const objects = await objectDiscovery.discoverObjects();
    
    // 分類預設和自定義對象
    const defaultObjects = objects.filter(obj => !obj.isCustom);
    const customObjects = objects.filter(obj => obj.isCustom);
    
    // 查詢本地同步狀態
    const syncStatus = await env.DB.prepare(`
      SELECT api_name, is_enabled, is_synced, table_name, last_synced_at
      FROM fx_object_definitions
    `).all();
    
    const statusMap = new Map(
      syncStatus.results.map(s => [s.api_name, s])
    );
    
    // 合併同步狀態
    const enrichObject = (obj) => {
      const status = statusMap.get(obj.apiName) || {};
      return {
        ...obj,
        isEnabled: status.is_enabled || false,
        isSynced: status.is_synced || false,
        tableName: status.table_name || null,
        lastSyncedAt: status.last_synced_at || null
      };
    };
    
    // 如果有搜索條件，過濾對象
    let filteredDefaultObjects = defaultObjects.map(enrichObject);
    let filteredCustomObjects = customObjects.map(enrichObject);
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredDefaultObjects = filteredDefaultObjects.filter(obj => 
        obj.displayName.toLowerCase().includes(searchLower) ||
        obj.apiName.toLowerCase().includes(searchLower) ||
        (obj.description && obj.description.toLowerCase().includes(searchLower))
      );
      filteredCustomObjects = filteredCustomObjects.filter(obj => 
        obj.displayName.toLowerCase().includes(searchLower) ||
        obj.apiName.toLowerCase().includes(searchLower) ||
        (obj.description && obj.description.toLowerCase().includes(searchLower))
      );
    }
    
    // 排序：將已啟用的對象排在前面
    const sortObjects = (a, b) => {
      // 先按啟用狀態排序（已啟用排前面）
      if (a.isEnabled !== b.isEnabled) {
        return a.isEnabled ? -1 : 1;
      }
      // 再按同步狀態排序（已同步排前面）
      if (a.isSynced !== b.isSynced) {
        return a.isSynced ? -1 : 1;
      }
      // 最後按名稱排序
      return a.displayName.localeCompare(b.displayName, 'zh-TW');
    };
    
    filteredDefaultObjects.sort(sortObjects);
    filteredCustomObjects.sort(sortObjects);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        defaultObjects: filteredDefaultObjects,
        customObjects: filteredCustomObjects,
        total: filteredDefaultObjects.length + filteredCustomObjects.length,
        searchTerm: searchTerm || null
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取對象列表失敗:', error);
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
 * 獲取特定對象的欄位列表
 * GET /api/objects/:objectApiName/fields
 */
objectRoutes.get('/:objectApiName/fields', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 初始化客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    
    // 獲取欄位定義
    const fields = await objectDiscovery.getObjectFields(objectApiName);
    
    // 同步欄位定義到本地
    await objectDiscovery.syncFieldDefinitions(objectApiName);
    
    // 查詢本地欄位狀態
    const localFields = await env.DB.prepare(`
      SELECT field_api_name, is_active
      FROM fx_field_definitions
      WHERE object_api_name = ?
    `).bind(objectApiName).all();
    
    const activeFieldsMap = new Map(
      localFields.results.map(f => [f.field_api_name, f.is_active])
    );
    
    // 分類系統欄位和自定義欄位
    const systemFields = [];
    const customFields = [];
    
    fields.forEach(field => {
      const fieldData = {
        fieldId: field.fieldId,
        apiName: field.apiName,
        displayName: field.displayName,
        fieldType: field.fieldType,
        dataType: objectDiscovery.mapFieldType(field.fieldType),
        isRequired: field.isRequired || false,
        isCustom: field.isCustom || false,
        isActive: activeFieldsMap.get(field.apiName) !== false,
        defaultValue: field.defaultValue || null,
        options: field.options || [],
        validationRules: field.validationRules || {}
      };
      
      if (field.isCustom) {
        customFields.push(fieldData);
      } else {
        systemFields.push(fieldData);
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        systemFields,
        customFields,
        totalFields: fields.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`獲取對象 ${objectApiName} 的欄位失敗:`, error);
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
 * 啟用/禁用對象同步
 * POST /api/objects/:objectApiName/toggle
 */
objectRoutes.post('/:objectApiName/toggle', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    const body = await request.json();
    const { enabled } = body;
    
    // 更新對象狀態
    await env.DB.prepare(`
      UPDATE fx_object_definitions
      SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE api_name = ?
    `).bind(enabled, objectApiName).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: `對象 ${objectApiName} 同步已${enabled ? '啟用' : '禁用'}`
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
 * 發現新對象
 * POST /api/objects/discover
 * 從CRM重新獲取對象列表並更新本地定義
 */
objectRoutes.post('/discover', async (request) => {
  const { env } = request;
  
  try {
    // 初始化客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    
    // 發現並同步對象
    const objects = await objectDiscovery.discoverObjects();
    
    // 統計新增的對象
    const stats = {
      total: objects.length,
      custom: objects.filter(o => o.isCustom).length,
      standard: objects.filter(o => !o.isCustom).length,
      new: 0
    };
    
    return new Response(JSON.stringify({
      success: true,
      message: '對象發現完成',
      data: stats
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
 * 初始化對象表結構
 * POST /api/objects/:objectApiName/init-table
 * 為對象創建對應的數據表
 */
objectRoutes.post('/:objectApiName/init-table', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 初始化必要的服務
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    const SchemaManager = (await import('../sync/schema-manager.js')).SchemaManager;
    const schemaManager = new SchemaManager(env.DB);
    
    // 嘗試同步欄位定義，如果失敗則繼續（會創建基本表結構）
    console.log(`同步 ${objectApiName} 的欄位定義...`);
    try {
      await objectDiscovery.syncFieldDefinitions(objectApiName);
    } catch (error) {
      console.warn(`獲取欄位定義失敗: ${error.message}，將創建基本表結構`);
    }
    
    // 創建表
    const tableName = await schemaManager.createTableForObject(objectApiName);
    
    // 標記對象已同步
    await env.DB.prepare(`
      UPDATE fx_object_definitions
      SET is_synced = TRUE, table_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE api_name = ?
    `).bind(tableName, objectApiName).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: `對象 ${objectApiName} 的表結構已初始化`,
      data: { tableName }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('初始化表結構失敗:', error);
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
 * POST /api/objects/:objectApiName/sync-schema
 * 檢測並同步欄位變更
 */
objectRoutes.post('/:objectApiName/sync-schema', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 初始化必要的服務
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    const SchemaManager = (await import('../sync/schema-manager.js')).SchemaManager;
    const SchemaSyncService = (await import('../sync/schema-sync.js')).SchemaSyncService;
    
    const schemaManager = new SchemaManager(env.DB);
    const schemaSync = new SchemaSyncService(objectDiscovery, schemaManager, env.DB);
    
    // 執行結構同步
    const changes = await schemaSync.syncObjectSchema(objectApiName);
    
    return new Response(JSON.stringify({
      success: true,
      message: '結構同步完成',
      data: {
        objectApiName,
        changes
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
 * 獲取欄位變更記錄
 * GET /api/objects/:objectApiName/field-change-logs
 */
objectRoutes.get('/:objectApiName/field-change-logs', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  
  try {
    const logs = await env.DB.prepare(`
      SELECT * FROM field_change_logs
      WHERE object_api_name = ?
      ORDER BY detected_at DESC
      LIMIT ?
    `).bind(objectApiName, limit).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: logs.results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取欄位變更記錄失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});