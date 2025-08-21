import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';
import { DataSyncService } from '../sync/data-sync-service.js';
import { DynamicSyncService } from '../sync/dynamic-sync-service.js';

export const syncRoutes = Router({ base: '/api/sync' });

/**
 * 手動觸發對象資料同步
 * POST /api/sync/:objectApiName/start
 */
syncRoutes.post('/:objectApiName/start', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 初始化客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const dataSyncService = new DataSyncService(fxClient, env.DB);
    const dynamicSyncService = new DynamicSyncService(fxClient, env.DB);
    
    let result;
    
    // 檢查請求參數
    const body = await request.json().catch(() => ({}));
    
    // 支持測試模式參數
    if (body.testMode && body.limit) {
      console.log(`[測試模式] 限制同步 ${body.limit} 條記錄`);
      const isCustom = objectApiName.endsWith('__c');
      result = await dynamicSyncService.syncDynamicObject(
        objectApiName, 
        isCustom, 
        { 
          fullSync: body.fullSync,
          limit: body.limit,
          testMode: true
        }
      );
      
      // 返回詳細結果
      return new Response(JSON.stringify({
        success: true,
        testMode: true,
        limit: body.limit,
        data: {
          objectApiName,
          message: `測試同步完成 (限制 ${body.limit} 條)`,
          result,
          details: {
            requestedLimit: body.limit,
            actualProcessed: result.success + result.errors,
            success: result.success,
            errors: result.errors,
            successRate: result.success + result.errors > 0 ? 
              ((result.success / (result.success + result.errors)) * 100).toFixed(1) + '%' : '0%'
          }
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 所有對象都使用動態同步
    const isCustom = objectApiName.endsWith('__c');
    result = await dynamicSyncService.syncDynamicObject(objectApiName, isCustom, { fullSync: body.fullSync });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        message: '同步完成',
        result
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('啟動同步失敗:', error);
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
 * 強制完整同步（忽略最後同步時間）
 * POST /api/sync/:objectApiName/full
 */
syncRoutes.post('/:objectApiName/full', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 初始化客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const dataSyncService = new DataSyncService(fxClient, env.DB);
    const dynamicSyncService = new DynamicSyncService(fxClient, env.DB);
    
    let result;
    
    // 所有對象都使用動態同步（強制完整同步）
    const isCustom = objectApiName.endsWith('__c');
    result = await dynamicSyncService.syncDynamicObject(objectApiName, isCustom, { fullSync: true });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        message: '完整同步完成',
        result
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('完整同步失敗:', error);
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
 * 分頁同步案場數據
 * POST /api/sync/object_8W9cb__c/page
 * Body: { offset: 0, limit: 500 }
 */
syncRoutes.post('/object_8W9cb__c/page', async (request) => {
  const { env } = request;
  
  try {
    const body = await request.json();
    const offset = body.offset || 0;
    const limit = body.limit || 500;
    
    // 初始化客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const dataSyncService = new DataSyncService(fxClient, env.DB);
    
    // 執行分頁同步
    const result = await dataSyncService.syncSitesByPage(offset, limit);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        message: `分頁同步完成 (offset: ${offset}, limit: ${limit})`,
        result,
        hasMore: result.totalFetched === limit
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('分頁同步失敗:', error);
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
 * 批量同步所有啟用的對象
 * POST /api/sync/all
 */
syncRoutes.post('/all', async (request) => {
  const { env } = request;
  
  try {
    // 初始化客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const dataSyncService = new DataSyncService(fxClient, env.DB);
    
    const results = {
      opportunities: null,
      sites: null
    };
    
    // 同步商機
    try {
      results.opportunities = await dataSyncService.syncOpportunities();
    } catch (error) {
      results.opportunities = { error: error.message };
    }
    
    // 同步案場
    try {
      results.sites = await dataSyncService.syncSites();
    } catch (error) {
      results.sites = { error: error.message };
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        message: '批量同步完成',
        results
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('批量同步失敗:', error);
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
 * 獲取定時同步狀態
 * GET /api/sync/cron-status
 */
syncRoutes.get('/cron-status', async (request) => {
  const { env } = request;
  
  try {
    // 從 KV 獲取最後執行時間
    const lastRun = await env.KV.get('LAST_CRON_RUN');
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        enabled: true,
        schedule: '0 * * * *', // 每小時整點
        lastRun: lastRun || null,
        nextRun: getNextCronTime()
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
 * 獲取資料庫記錄統計
 * GET /api/sync/database-stats
 */
syncRoutes.get('/database-stats', async (request) => {
  const { env } = request;
  
  try {
    // 定義所有支援的表格和對應的顯示名稱
    const tables = [
      { tableName: 'newopportunityobj', displayName: '商機', apiName: 'NewOpportunityObj' },
      { tableName: 'newopportunitycontactsobj', displayName: '商機連絡人', apiName: 'NewOpportunityContactsObj' },
      { tableName: 'object_8w9cb__c', displayName: '案場', apiName: 'object_8W9cb__c' },
      { tableName: 'object_k1xqg__c', displayName: '維修單', apiName: 'object_k1XqG__c' },
      { tableName: 'object_50hj8__c', displayName: '工地師父', apiName: 'object_50HJ8__c' },
      { tableName: 'supplierobj', displayName: '供應商', apiName: 'SupplierObj' },
      { tableName: 'site_cabinet__c', displayName: '案場(浴櫃)', apiName: 'site_cabinet__c' },
      { tableName: 'progress_management_announ__c', displayName: '進度管理公告', apiName: 'progress_management_announ__c' }
    ];
    
    const stats = [];
    
    // 獲取每個表的記錄數量
    for (const table of tables) {
      try {
        const result = await env.DB.prepare(`SELECT COUNT(*) as count FROM ${table.tableName}`).first();
        
        // 獲取最後同步時間
        const lastSync = await env.DB.prepare(`
          SELECT MAX(completed_at) as last_sync
          FROM sync_logs 
          WHERE entity_type = ? AND status = 'COMPLETED'
        `).bind(table.apiName).first();
        
        stats.push({
          apiName: table.apiName,
          displayName: table.displayName,
          tableName: table.tableName,
          recordCount: result.count,
          lastSync: lastSync?.last_sync || null
        });
      } catch (error) {
        // 如果表不存在，記錄為 0
        stats.push({
          apiName: table.apiName,
          displayName: table.displayName,
          tableName: table.tableName,
          recordCount: 0,
          lastSync: null,
          error: error.message
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        tables: stats
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取資料庫統計失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// 輔助函數：獲取下次執行時間
function getNextCronTime() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next.toISOString();
}

/**
 * 獲取同步狀態
 * GET /api/sync/status
 */
syncRoutes.get('/status', async (request) => {
  const { env } = request;
  
  try {
    // 獲取最近的同步記錄
    const recentSyncs = await env.DB.prepare(`
      SELECT 
        sl.*,
        od.display_name as object_display_name
      FROM sync_logs sl
      LEFT JOIN fx_object_definitions od ON sl.entity_type = od.api_name
      ORDER BY sl.created_at DESC
      LIMIT 20
    `).all();
    
    // 獲取同步統計
    const stats = await env.DB.prepare(`
      SELECT 
        entity_type,
        COUNT(*) as sync_count,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
        MAX(created_at) as last_sync_time
      FROM sync_logs
      GROUP BY entity_type
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        recentSyncs: recentSyncs.results,
        statistics: stats.results
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取同步狀態失敗:', error);
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
 * 獲取表格結構資訊
 * GET /api/sync/table-schema/:tableName
 */
syncRoutes.get('/table-schema/:tableName', async (request) => {
  const { env } = request;
  const { tableName } = request.params;
  
  try {
    // 獲取表格欄位資訊
    const columns = await env.DB.prepare(
      `PRAGMA table_info('${tableName}')`
    ).all();
    
    // 獲取表格建立語句
    const tableSQL = await env.DB.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
    ).bind(tableName).first();
    
    return new Response(JSON.stringify({
      success: true,
      tableName: tableName,
      columns: columns.results || [],
      columnCount: columns.results?.length || 0,
      createSQL: tableSQL?.sql || null,
      hasShiftTimeColumn: columns.results?.some(col => col.name === 'shift_time__c') || false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取表格結構失敗:', error);
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
 * 創建工班映射表
 * POST /api/sync/shift-time/create-table
 */
syncRoutes.post('/shift-time/create-table', async (request) => {
  const { env } = request;
  
  try {
    // 創建工班映射表
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_shift_mapping (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT UNIQUE NOT NULL,
        site_name TEXT,
        shift_time_id TEXT,
        shift_time_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 創建索引
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_shift_time_name 
      ON site_shift_mapping(shift_time_name)
    `).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: '工班映射表創建成功'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('創建工班映射表失敗:', error);
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
 * 同步工班資料到映射表
 * POST /api/sync/shift-time
 */
syncRoutes.post('/shift-time', async (request) => {
  const { env } = request;
  
  try {
    // 初始化客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 動態引入 ShiftTimeHandler
    const ShiftTimeHandler = (await import('../sync/shift-time-handler.js')).default;
    const handler = new ShiftTimeHandler(env.DB, fxClient);
    
    // 執行同步
    const result = await handler.syncShiftTimeData();
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('同步工班資料失敗:', error);
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
 * 查詢特定案場的工班
 * GET /api/sync/shift-time/:siteId
 */
syncRoutes.get('/shift-time/:siteId', async (request) => {
  const { env } = request;
  const { siteId } = request.params;
  
  try {
    // 查詢工班映射表
    const result = await env.DB.prepare(`
      SELECT shift_time_name
      FROM site_shift_mapping
      WHERE site_id = ? OR site_name = ?
    `).bind(siteId, siteId).first();
    
    return new Response(JSON.stringify({
      success: true,
      siteId: siteId,
      shift_time: result?.shift_time_name || null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('查詢工班失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});