import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';
import { FieldSyncManager } from '../sync/field-sync-manager.js';

export const fieldSyncRoutes = Router({ base: '/api/field-sync' });

/**
 * 同步所有對象的欄位
 * POST /api/field-sync/all
 */
fieldSyncRoutes.post('/all', async (request) => {
  const { env } = request;
  
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const fieldSyncManager = new FieldSyncManager(fxClient, env.DB);
    
    // 獲取所有已啟用的對象
    const objects = await env.DB.prepare(`
      SELECT api_name, display_name, table_name 
      FROM fx_object_definitions 
      WHERE is_enabled = TRUE
    `).all();
    
    const results = [];
    
    for (const obj of objects.results) {
      console.log(`\n🔄 開始同步欄位: ${obj.display_name} (${obj.api_name})`);
      
      try {
        // 比對欄位
        const comparison = await fieldSyncManager.compareFields(obj.api_name, obj.table_name);
        
        // 執行同步
        const syncResult = await fieldSyncManager.syncFields(comparison);
        
        // 更新欄位對應表
        if (comparison.crmFields && comparison.crmFields.length > 0) {
          // 從 getCRMFields 獲取完整的欄位資訊
          const crmFields = await fieldSyncManager.getCRMFields(obj.api_name);
          await fieldSyncManager.updateFieldMappings(obj.api_name, crmFields);
        }
        
        results.push({
          objectApiName: obj.api_name,
          displayName: obj.display_name,
          success: true,
          comparison: {
            crmFields: comparison.crmFields,
            d1Fields: comparison.d1Fields,
            fieldsToAdd: comparison.fieldsToAdd.length,
            fieldsToUpdate: comparison.fieldsToUpdate.length,
            fieldsToRemove: comparison.fieldsToRemove.length
          },
          changes: syncResult.changes
        });
        
        console.log(`✅ ${obj.display_name} 欄位同步完成`);
        
      } catch (error) {
        console.error(`❌ ${obj.display_name} 欄位同步失敗:`, error.message);
        results.push({
          objectApiName: obj.api_name,
          displayName: obj.display_name,
          success: false,
          error: error.message
        });
      }
    }
    
    const summary = {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalChanges: results.reduce((sum, r) => sum + (r.changes?.length || 0), 0)
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        summary,
        results
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('欄位同步失敗:', error);
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
 * 同步單一對象的欄位
 * POST /api/field-sync/:objectApiName
 */
fieldSyncRoutes.post('/:objectApiName', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const fieldSyncManager = new FieldSyncManager(fxClient, env.DB);
    
    // 獲取對象資訊
    const object = await env.DB.prepare(`
      SELECT api_name, display_name, table_name 
      FROM fx_object_definitions 
      WHERE api_name = ?
    `).bind(objectApiName).first();
    
    if (!object) {
      return new Response(JSON.stringify({
        success: false,
        error: `對象 ${objectApiName} 不存在`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 比對欄位
    const comparison = await fieldSyncManager.compareFields(object.api_name, object.table_name);
    
    // 執行同步
    const syncResult = await fieldSyncManager.syncFields(comparison);
    
    // 更新欄位對應表
    const crmFields = await fieldSyncManager.getCRMFields(object.api_name);
    await fieldSyncManager.updateFieldMappings(object.api_name, crmFields);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName: object.api_name,
        displayName: object.display_name,
        comparison: {
          crmFields: comparison.crmFields,
          d1Fields: comparison.d1Fields,
          fieldsToAdd: comparison.fieldsToAdd.length,
          fieldsToUpdate: comparison.fieldsToUpdate.length,
          fieldsToRemove: comparison.fieldsToRemove.length
        },
        changes: syncResult.changes
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`欄位同步失敗 ${objectApiName}:`, error);
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
 * 獲取對象的最新欄位定義（從資料庫）
 * GET /api/field-sync/:objectApiName/fields
 */
fieldSyncRoutes.get('/:objectApiName/fields', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 從資料庫獲取最新的欄位定義
    const fields = await env.DB.prepare(`
      SELECT field_api_name, field_label, field_type, is_required, 
             description, options, source, updated_at
      FROM fx_field_definitions
      WHERE object_api_name = ?
      ORDER BY field_api_name
    `).bind(objectApiName).all();
    
    if (!fields.results || fields.results.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `對象 ${objectApiName} 的欄位定義不存在，請先執行欄位同步`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        fieldCount: fields.results.length,
        fields: fields.results.map(field => ({
          apiName: field.field_api_name,
          label: field.field_label,
          dataType: field.field_type,
          required: Boolean(field.is_required),
          description: field.description || '',
          options: field.options,
          source: field.source,
          lastUpdated: field.updated_at
        })),
        source: 'database'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`獲取欄位定義失敗 ${objectApiName}:`, error);
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
 * 獲取欄位同步歷史
 * GET /api/field-sync/:objectApiName/history
 */
fieldSyncRoutes.get('/:objectApiName/history', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    const history = await env.DB.prepare(`
      SELECT action, field_name, field_type, details, created_at
      FROM fx_field_sync_history
      WHERE object_api_name = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(objectApiName).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        history: history.results || []
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`獲取同步歷史失敗 ${objectApiName}:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});