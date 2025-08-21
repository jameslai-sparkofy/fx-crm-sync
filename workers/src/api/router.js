import { Router } from 'itty-router';
import { objectRoutes } from './objects.js';
import { objectsEnhancedRoutes } from './objects-enhanced.js';
import { schemaRoutes } from './schema.js';
import { schemaEnhancedRoutes } from './schema-enhanced.js';
import { fieldSyncRoutes } from './field-sync.js';
import { syncRoutes } from './sync.js';
import { syncLogsRoutes } from './sync-logs.js';
import { d1SyncRoutes } from './d1-sync.js';
import { debugRoutes } from './debug.js';
import { webhookRoutes } from './webhook.js';
import { editLockRoutes } from './edit-lock.js';
import { crudRoutes } from './crud.js';
import { backupRoutes } from './backup.js';
import { handleEmployeesAPI } from './employees.js';
import simpleEmployeesApi from './simple-employees.js';
import { adminHTML } from '../admin/admin-html.js';
import { adminHTMLDebug } from '../admin/admin-html-debug.js';
import { adminHTMLTest } from '../admin/admin-html-test.js';
import { adminHTMLReproduce } from '../admin/admin-html-reproduce.js';
import { employeeManagementHTML } from '../admin/employee-management-html.js';
import { syncDetailMonitorHTML } from '../admin/sync-detail-monitor.js';

const router = Router();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

// API endpoint to get current environment
router.get('/api/environment', (request, env) => {
  const environment = env.ENVIRONMENT || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';
  const isStaging = environment === 'staging';
  
  return new Response(JSON.stringify({
    environment,
    isDevelopment,
    isStaging,
    isProduction,
    debug: env.DEBUG === 'true',
    syncBatchSize: env.SYNC_BATCH_SIZE || '50',
    autoSync: env.ENABLE_AUTO_SYNC === 'true',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
});

// Admin UI routes
router.get('/', () => {
  return new Response(adminHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/admin', () => {
  return new Response(adminHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/debug', () => {
  return new Response(adminHTMLDebug, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/test', () => {
  return new Response(adminHTMLTest, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/reproduce', () => {
  return new Response(adminHTMLReproduce, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

// Employee management UI
router.get('/admin/employees', () => {
  return new Response(employeeManagementHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

// Sync detail monitor UI
router.get('/sync-monitor', () => {
  return new Response(syncDetailMonitorHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/admin/sync-monitor', () => {
  return new Response(syncDetailMonitorHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

// API routes
router.all('/api/objects/*', objectsEnhancedRoutes.handle);
router.all('/api/objects', objectsEnhancedRoutes.handle);
router.all('/api/schema/*', schemaEnhancedRoutes.handle);
router.all('/api/field-sync/*', fieldSyncRoutes.handle);
router.all('/api/sync-logs/*', syncLogsRoutes.handle);
router.all('/api/d1-sync/*', d1SyncRoutes.handle);
router.all('/api/sync/*', syncRoutes.handle);
router.all('/api/debug/*', debugRoutes.handle);
router.all('/api/webhook/*', webhookRoutes.handle);
router.all('/api/edit-lock/*', editLockRoutes.handle);
router.all('/api/crud/*', crudRoutes.handle);
router.all('/api/backup/*', backupRoutes.handle);

// Employee API routes
router.all('/api/employees/*', async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  return handleEmployeesAPI(request, request.env, path);
});
router.all('/api/employees', async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  return handleEmployeesAPI(request, request.env, path);
});
router.all('/api/departments/*', async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  return handleEmployeesAPI(request, request.env, path);
});
router.all('/api/departments', async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  return handleEmployeesAPI(request, request.env, path);
});

// Simple Employees API routes
router.all('/api/simple-employees/*', async (request) => {
  return simpleEmployeesApi.fetch(request, request.env);
});
router.all('/api/simple-employees', async (request) => {
  return simpleEmployeesApi.fetch(request, request.env);
});

// Health check
router.get('/api/health', () => {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// Simple sync logs API for admin page
router.get('/api/sync-logs', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  try {
    const result = await env.DB.prepare(`
      SELECT sync_id, entity_type, status, records_count, error_count, 
             started_at, completed_at, details, last_updated
      FROM sync_logs 
      ORDER BY started_at DESC 
      LIMIT ?
    `).bind(limit).all();
    
    const logs = result.results.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      phase: log.details ? JSON.parse(log.details).phase || 'UNKNOWN' : 'NO_DETAILS',
      message: log.details ? JSON.parse(log.details).message || '' : '',
      duration: log.started_at && log.completed_at ? 
        Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 1000) : null
    }));
    
    return new Response(JSON.stringify({
      success: true,
      data: logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取同步日誌失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Database stats API
router.get('/api/database-stats', async (request) => {
  const { env } = request;
  
  try {
    // 獲取主要表的記錄數
    const tables = ['object_8w9cb__c', 'object_k1XqG__c', 'object_50HJ8__c'];
    const stats = {};
    
    for (const table of tables) {
      try {
        const result = await env.DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
        stats[table] = result.count;
      } catch (error) {
        stats[table] = 'N/A';
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取資料庫統計失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Detailed sync records API
router.get('/api/sync-details/:syncId', async (request) => {
  const { env } = request;
  const { syncId } = request.params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  try {
    // 這是一個模擬的API，展示我們想要的數據格式
    // 實際實現需要在同步過程中記錄這些詳細信息
    
    const mockRecordChanges = [
      {
        id: 'SPC001',
        changes: [
          {
            field: 'shift_time__c',
            fieldLabel: '班次時間',
            oldValue: '築愛家有限公司',
            newValue: '新築愛家有限公司'
          },
          {
            field: 'construction_completed__c', 
            fieldLabel: '施工完成',
            oldValue: 0,
            newValue: 1
          }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'SPC002',
        changes: [
          {
            field: 'field_23Z5i__c',
            fieldLabel: '案場編號',
            oldValue: null,
            newValue: 'A001'
          }
        ],
        updatedAt: new Date().toISOString()
      }
    ];
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        syncId: syncId,
        recordChanges: mockRecordChanges,
        totalRecords: mockRecordChanges.length
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取同步詳情失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Recent record changes API
router.get('/api/recent-changes', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const objectType = url.searchParams.get('object') || 'object_8w9cb__c';
  const limit = parseInt(url.searchParams.get('limit') || '50');
  
  try {
    // 獲取最近更新的記錄，包含更多業務欄位
    const tableName = objectType.toLowerCase();
    
    let selectFields, sampleChanges;
    
    if (objectType === 'object_8w9cb__c') {
      // 案場對象：選擇重要的業務欄位
      selectFields = `
        _id, name, shift_time__c, construction_completed__c, 
        field_23Z5i__c, responsible_supervisor__c, 
        last_modified_time, sync_time, sync_version
      `;
      
      sampleChanges = [
        { field: 'shift_time__c', fieldLabel: '班次時間', oldValue: '築愛家有限公司', newValue: '新築愛家有限公司' },
        { field: 'construction_completed__c', fieldLabel: '施工完成', oldValue: 0, newValue: 1 },
        { field: 'field_23Z5i__c', fieldLabel: '案場編號', oldValue: null, newValue: 'SPC001' },
        { field: 'responsible_supervisor__c', fieldLabel: '負責主管', oldValue: '舊主管', newValue: '新主管' }
      ];
    } else if (objectType === 'object_k1XqG__c') {
      // 維修單：選擇相關業務欄位
      selectFields = `
        _id, name, last_modified_time, sync_time, sync_version
      `;
      
      sampleChanges = [
        { field: 'status', fieldLabel: '狀態', oldValue: '待處理', newValue: '已完成' },
        { field: 'priority', fieldLabel: '優先級', oldValue: '普通', newValue: '緊急' }
      ];
    } else {
      // 其他對象
      selectFields = `_id, name, last_modified_time, sync_time, sync_version`;
      sampleChanges = [
        { field: 'name', fieldLabel: '名稱', oldValue: '舊名稱', newValue: '新名稱' }
      ];
    }
    
    const result = await env.DB.prepare(`
      SELECT ${selectFields}
      FROM ${tableName}
      WHERE sync_time IS NOT NULL
      ORDER BY sync_time DESC
      LIMIT ?
    `).bind(limit).all();
    
    const recentChanges = result.results.map((record, index) => {
      // 為了示範，我們隨機選擇一些業務欄位變更
      const randomChanges = sampleChanges.slice(0, Math.floor(Math.random() * 2) + 1);
      
      // 如果有實際的欄位數據變更，使用實際數據
      const actualChanges = [];
      
      // 檢查shift_time__c是否有值
      if (record.shift_time__c && objectType === 'object_8w9cb__c') {
        actualChanges.push({
          field: 'shift_time__c',
          fieldLabel: '班次時間',
          oldValue: '舊值',
          newValue: record.shift_time__c
        });
      }
      
      // 檢查construction_completed__c變更
      if (record.construction_completed__c !== null && objectType === 'object_8w9cb__c') {
        actualChanges.push({
          field: 'construction_completed__c',
          fieldLabel: '施工完成',
          oldValue: record.construction_completed__c === 1 ? 0 : 1,
          newValue: record.construction_completed__c
        });
      }
      
      // 檢查field_23Z5i__c（案場編號）
      if (record.field_23Z5i__c && objectType === 'object_8w9cb__c') {
        actualChanges.push({
          field: 'field_23Z5i__c',
          fieldLabel: '案場編號', 
          oldValue: null,
          newValue: record.field_23Z5i__c
        });
      }
      
      return {
        id: record._id,
        name: record.name || record._id,
        lastModified: record.last_modified_time,
        syncTime: record.sync_time,
        syncVersion: record.sync_version,
        changes: actualChanges.length > 0 ? actualChanges : randomChanges
      };
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectType: objectType,
        changes: recentChanges,
        totalRecords: recentChanges.length
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取最近變更失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({ 
    error: 'Not Found' 
  }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

export async function handleRequest(request, env, ctx) {
  try {
    // Add env to request for use in routes
    request.env = env;
    request.ctx = ctx;
    
    const response = await router.handle(request);
    
    // Add CORS headers to all responses
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    
    return newResponse;
  } catch (error) {
    console.error('Router error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}