import { Router } from 'itty-router';
import { SchemaManager } from '../sync/schema-manager.js';
import { SchemaSyncService } from '../sync/schema-sync.js';
import { ObjectDiscoveryService } from '../sync/object-discovery.js';
import { FxClient } from '../utils/fx-client.js';

export const schemaRoutes = Router({ base: '/api/schema' });

/**
 * 創建對象的資料表
 * POST /api/schema/:objectApiName/create
 */
schemaRoutes.post('/:objectApiName/create', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 檢查對象是否存在
    const object = await env.DB.prepare(`
      SELECT * FROM fx_object_definitions WHERE api_name = ?
    `).bind(objectApiName).first();
    
    if (!object) {
      return new Response(JSON.stringify({
        success: false,
        error: `對象 ${objectApiName} 不存在，請先執行對象發現`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (object.is_synced) {
      return new Response(JSON.stringify({
        success: false,
        error: `對象 ${objectApiName} 的表已存在`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 初始化Schema管理器
    const schemaManager = new SchemaManager(env.DB);
    
    // 創建表
    const tableName = await schemaManager.createTableForObject(objectApiName);
    
    // 啟用對象
    await env.DB.prepare(`
      UPDATE fx_object_definitions
      SET is_enabled = TRUE
      WHERE api_name = ?
    `).bind(objectApiName).run();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        tableName,
        message: `成功創建表 ${tableName}`
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('創建表失敗:', error);
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
 * 同步對象的schema變更
 * POST /api/schema/:objectApiName/sync
 */
schemaRoutes.post('/:objectApiName/sync', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 初始化服務
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    const schemaManager = new SchemaManager(env.DB);
    const schemaSyncService = new SchemaSyncService(objectDiscovery, schemaManager, env.DB);
    
    // 執行schema同步
    const changes = await schemaSyncService.syncObjectSchema(objectApiName);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        changes,
        message: `Schema同步完成，共 ${changes.length} 個變更`
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Schema同步失敗:', error);
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
 * 檢測schema變更（不應用）
 * GET /api/schema/:objectApiName/changes
 */
schemaRoutes.get('/:objectApiName/changes', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 初始化服務
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    const schemaManager = new SchemaManager(env.DB);
    const schemaSyncService = new SchemaSyncService(objectDiscovery, schemaManager, env.DB);
    
    // 同步最新欄位定義
    await objectDiscovery.syncFieldDefinitions(objectApiName);
    
    // 獲取表名
    const object = await schemaManager.getObjectDefinition(objectApiName);
    if (!object.table_name) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          objectApiName,
          changes: [],
          message: '對象尚未創建表'
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 檢測變更
    const crmFields = await schemaSyncService.getCRMFields(objectApiName);
    const dbColumns = await schemaSyncService.getTableColumns(object.table_name);
    const changes = schemaSyncService.compareSchemas(crmFields, dbColumns);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        changes,
        crmFieldsCount: crmFields.length,
        dbColumnsCount: dbColumns.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('檢測變更失敗:', error);
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
 * 獲取schema變更歷史
 * GET /api/schema/:objectApiName/history
 */
schemaRoutes.get('/:objectApiName/history', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    const limit = parseInt(request.query.limit) || 50;
    
    const result = await env.DB.prepare(`
      SELECT * FROM schema_change_logs 
      WHERE object_api_name = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(objectApiName, limit).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: result.results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取變更歷史失敗:', error);
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
 * 獲取表結構信息
 * GET /api/schema/:objectApiName/structure
 */
schemaRoutes.get('/:objectApiName/structure', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 獲取對象信息
    const object = await env.DB.prepare(`
      SELECT * FROM fx_object_definitions WHERE api_name = ?
    `).bind(objectApiName).first();
    
    if (!object || !object.table_name) {
      return new Response(JSON.stringify({
        success: false,
        error: '對象尚未創建表'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 獲取表結構
    const columns = await env.DB.prepare(`
      PRAGMA table_info(${object.table_name})
    `).all();
    
    // 獲取索引信息
    const indexes = await env.DB.prepare(`
      PRAGMA index_list(${object.table_name})
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        tableName: object.table_name,
        columns: columns.results,
        indexes: indexes.results
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取表結構失敗:', error);
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
 * 獲取所有數據庫表結構信息 - 為 Claude Code 優化
 * GET /api/schema/all-tables
 */
schemaRoutes.get('/all-tables', async (request) => {
  const { env } = request;
  
  try {
    // 獲取所有表名（排除系統表）
    const tables = await env.DB.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name NOT LIKE '_cf_%'
      ORDER BY name
    `).all();
    
    const tableStructures = {};
    
    // 遍歷每個表獲取結構信息
    for (const table of tables.results) {
      const tableName = table.name;
      
      try {
        // 獲取表結構
        const columns = await env.DB.prepare(`
          PRAGMA table_info(${tableName})
        `).all();
        
        // 獲取記錄數量
        const count = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM ${tableName}
        `).first();
        
        // 格式化列信息
        const formattedColumns = columns.results.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          defaultValue: col.dflt_value,
          primaryKey: col.pk === 1
        }));
        
        tableStructures[tableName] = {
          tableName,
          recordCount: count.count,
          columns: formattedColumns,
          columnCount: formattedColumns.length,
          primaryKeys: formattedColumns.filter(col => col.primaryKey).map(col => col.name)
        };
        
      } catch (error) {
        console.error(`獲取表 ${tableName} 結構失敗:`, error);
        tableStructures[tableName] = {
          tableName,
          error: error.message
        };
      }
    }
    
    // 添加摘要信息
    const summary = {
      totalTables: tables.results.length,
      successfulTables: Object.keys(tableStructures).filter(t => !tableStructures[t].error).length,
      failedTables: Object.keys(tableStructures).filter(t => tableStructures[t].error).length,
      generatedAt: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
      success: true,
      summary,
      tables: tableStructures
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('獲取所有表結構失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});