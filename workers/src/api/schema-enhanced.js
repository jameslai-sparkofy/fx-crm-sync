import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';
import { fieldMappingsAll, getFieldMapping, getFieldLabel, getFieldType } from '../data/field-mappings-all.js';

export const schemaEnhancedRoutes = Router({ base: '/api/schema' });

/**
 * 獲取對象的欄位資訊
 * GET /api/schema/:objectApiName/fields
 */
schemaEnhancedRoutes.get('/:objectApiName/fields', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    // 首先嘗試從資料庫獲取最新的欄位定義
    const dbFields = await env.DB.prepare(`
      SELECT field_api_name, field_label, field_type, is_required, 
             description, options, source, updated_at
      FROM fx_field_definitions
      WHERE object_api_name = ?
      ORDER BY field_api_name
    `).bind(objectApiName).all();
    
    if (dbFields.results && dbFields.results.length > 0) {
      console.log(`使用資料庫的欄位映射: ${objectApiName}`);
      
      const fields = dbFields.results.map(field => ({
        apiName: field.field_api_name,
        label: field.field_label,
        dataType: field.field_type,
        required: Boolean(field.is_required),
        description: field.description || '',
        options: field.options,
        source: field.source,
        lastUpdated: field.updated_at
      }));
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          objectApiName: objectApiName,
          fieldCount: fields.length,
          fields: fields,
          source: 'database',
          lastUpdated: Math.max(...dbFields.results.map(f => new Date(f.updated_at).getTime()))
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 如果資料庫沒有，檢查是否有預定義的欄位映射（向後相容）
    const predefinedMapping = getFieldMapping(objectApiName);
    
    if (predefinedMapping) {
      console.log(`使用預定義的欄位映射: ${objectApiName} - 建議執行欄位同步以獲取最新數據`);
      
      const fields = predefinedMapping.fields.map(field => ({
        apiName: field.apiName,
        label: field.label,
        dataType: getFieldType(objectApiName, field.apiName),
        required: field.required,
        description: field.description || '',
        options: field.description // 選項值可能在 description 中
      }));
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          objectApiName: objectApiName,
          objectDisplayName: predefinedMapping.displayName,
          fieldCount: fields.length,
          fields: fields,
          source: 'predefined',
          warning: '建議執行欄位同步以獲取最新的CRM欄位定義'
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 如果沒有預定義映射，嘗試從 API 獲取
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 判斷是標準對象還是自定義對象
    const isCustom = objectApiName.endsWith('__c');
    
    let fields = [];
    
    if (isCustom) {
      // 自定義對象 - 使用 describe API
      try {
        const response = await fxClient.post('/cgi/crm/custom/v2/object/describe', {
          apiName: objectApiName
        });
        
        if (response.errorCode === 0 && response.data?.fields) {
          fields = response.data.fields.map(field => ({
            apiName: field.apiName,
            label: field.label || field.apiName,
            dataType: field.dataType || 'TEXT',
            required: field.required || false,
            description: field.description || '',
            maxLength: field.maxLength,
            defaultValue: field.defaultValue
          }));
        }
      } catch (describeError) {
        console.log(`Describe API 失敗，嘗試從樣本數據推斷: ${describeError.message}`);
        
        // 如果 describe API 失敗，從實際數據推斷
        const queryResponse = await fxClient.post('/cgi/crm/custom/v2/data/query', {
          data: {
            dataObjectApiName: objectApiName,
            search_query_info: {
              limit: 1,
              offset: 0,
              filters: []
            }
          }
        });
        
        if (queryResponse.errorCode === 0 && queryResponse.data?.dataList?.length > 0) {
          const sample = queryResponse.data.dataList[0];
          fields = Object.keys(sample)
            .filter(key => key !== 'searchAfterId' && key !== 'total_num')
            .map(key => ({
              apiName: key,
              label: formatFieldLabel(key),
              dataType: inferDataType(sample[key]),
              required: false,
              description: '',
              sampleValue: typeof sample[key] === 'object' ? JSON.stringify(sample[key]).substring(0, 100) : String(sample[key]).substring(0, 100)
            }));
        }
      }
    } else {
      // 標準對象 - 從樣本數據推斷
      const queryResponse = await fxClient.post('/cgi/crm/v2/data/query', {
        data: {
          dataObjectApiName: objectApiName,
          search_query_info: {
            limit: 1,
            offset: 0,
            filters: []
          }
        }
      });
      
      if (queryResponse.errorCode === 0 && queryResponse.data?.dataList?.length > 0) {
        const sample = queryResponse.data.dataList[0];
        fields = Object.keys(sample)
          .filter(key => key !== 'searchAfterId' && key !== 'total_num')
          .map(key => ({
            apiName: key,
            label: formatFieldLabel(key),
            dataType: inferDataType(sample[key]),
            required: false,
            description: '',
            sampleValue: typeof sample[key] === 'object' ? JSON.stringify(sample[key]).substring(0, 100) : String(sample[key]).substring(0, 100)
          }));
      }
    }
    
    // 加入常見的系統欄位描述
    const systemFieldDescriptions = {
      '_id': '記錄唯一標識符',
      'name': '記錄名稱',
      'owner': '記錄擁有者',
      'owner__r': '記錄擁有者詳情',
      'created_by': '創建者',
      'created_by__r': '創建者詳情',
      'create_time': '創建時間',
      'last_modified_by': '最後修改者',
      'last_modified_by__r': '最後修改者詳情',
      'last_modified_time': '最後修改時間',
      'life_status': '生命週期狀態',
      'life_status__r': '生命週期狀態詳情',
      'lock_status': '鎖定狀態',
      'lock_status__r': '鎖定狀態詳情',
      'owner_department': '所屬部門',
      'owner_department_id': '所屬部門ID',
      'data_own_department__r': '數據所屬部門詳情',
      'relevant_team': '相關團隊成員',
      'relevant_team__r': '相關團隊成員詳情'
    };
    
    // 添加系統欄位描述
    fields = fields.map(field => ({
      ...field,
      description: field.description || systemFieldDescriptions[field.apiName] || ''
    }));
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName: objectApiName,
        fieldCount: fields.length,
        fields: fields
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取欄位資訊失敗:', error);
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
schemaEnhancedRoutes.get('/all-tables', async (request) => {
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

/**
 * 獲取定時同步狀態
 * GET /api/sync/cron-status
 */
schemaEnhancedRoutes.get('/sync/cron-status', async (request) => {
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

// 輔助函數：格式化欄位標籤
function formatFieldLabel(apiName) {
  // 移除特殊字符和格式化
  return apiName
    .replace(/__c$/, '')
    .replace(/__r$/, '_關聯')
    .replace(/__l$/, '_列表')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// 輔助函數：推斷數據類型
function inferDataType(value) {
  if (value === null || value === undefined) return 'TEXT';
  if (typeof value === 'number') return 'NUMBER';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (Array.isArray(value)) return 'ARRAY';
  if (typeof value === 'object') return 'OBJECT';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'DATETIME';
    if (/^\d+$/.test(value) && value.length > 10) return 'TIMESTAMP';
    return 'TEXT';
  }
  return 'TEXT';
}

// 輔助函數：獲取下次執行時間
function getNextCronTime() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next.toISOString();
}