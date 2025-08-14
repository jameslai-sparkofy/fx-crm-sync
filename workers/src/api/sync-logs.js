import { Router } from 'itty-router';
import { SyncLogger } from '../services/sync-logger.js';

export const syncLogsRoutes = Router({ base: '/api/sync-logs' });

/**
 * 獲取最近的同步日誌
 * GET /api/sync-logs/recent
 */
syncLogsRoutes.get('/recent', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  
  try {
    const syncLogger = new SyncLogger(env.DB);
    const logs = await syncLogger.getRecentLogs(limit);
    
    // 格式化日誌資料
    const formattedLogs = logs.map(log => ({
      id: log.id,
      syncTime: log.sync_time,
      triggerSource: log.trigger_source,
      triggerDetails: log.trigger_details,
      object: {
        apiName: log.object_api_name,
        label: log.object_label,
        id: log.object_id
      },
      operation: log.operation,
      fieldsChanged: log.fields_changed,
      values: {
        old: log.old_values,
        new: log.new_values
      },
      records: {
        processed: log.records_processed,
        success: log.records_success,
        failed: log.records_failed
      },
      performance: {
        durationMs: log.duration_ms,
        durationSec: log.duration_ms ? (log.duration_ms / 1000).toFixed(2) : null
      },
      source: {
        ip: log.ip_address,
        userAgent: log.user_agent
      },
      status: log.status,
      error: log.error_message,
      metadata: log.metadata
    }));
    
    return new Response(JSON.stringify({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取同步日誌失敗:', error);
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
 * 獲取同步統計
 * GET /api/sync-logs/stats
 */
syncLogsRoutes.get('/stats', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const hours = parseInt(url.searchParams.get('hours') || '24');
  
  try {
    const syncLogger = new SyncLogger(env.DB);
    const stats = await syncLogger.getSyncStats(hours);
    
    // 按對象分組統計
    const objectStats = {};
    stats.forEach(stat => {
      const key = stat.object_api_name;
      if (!objectStats[key]) {
        objectStats[key] = {
          apiName: stat.object_api_name,
          label: stat.object_label,
          triggers: {},
          totalSyncs: 0,
          totalRecords: 0,
          totalSuccess: 0,
          totalFailed: 0,
          avgDuration: 0,
          lastSync: null
        };
      }
      
      objectStats[key].triggers[stat.trigger_source] = {
        count: stat.sync_count,
        records: stat.total_records,
        success: stat.total_success,
        failed: stat.total_failed,
        avgDuration: stat.avg_duration
      };
      
      objectStats[key].totalSyncs += stat.sync_count;
      objectStats[key].totalRecords += stat.total_records;
      objectStats[key].totalSuccess += stat.total_success;
      objectStats[key].totalFailed += stat.total_failed;
      
      if (!objectStats[key].lastSync || stat.last_sync > objectStats[key].lastSync) {
        objectStats[key].lastSync = stat.last_sync;
      }
    });
    
    // 計算平均耗時
    Object.values(objectStats).forEach(obj => {
      const totalDuration = Object.values(obj.triggers).reduce(
        (sum, t) => sum + (t.avgDuration * t.count), 0
      );
      obj.avgDuration = obj.totalSyncs > 0 ? 
        Math.round(totalDuration / obj.totalSyncs) : 0;
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        timeRange: {
          hours: hours,
          from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        objects: Object.values(objectStats),
        summary: {
          totalObjects: Object.keys(objectStats).length,
          totalSyncs: Object.values(objectStats).reduce((sum, o) => sum + o.totalSyncs, 0),
          totalRecords: Object.values(objectStats).reduce((sum, o) => sum + o.totalRecords, 0),
          totalSuccess: Object.values(objectStats).reduce((sum, o) => sum + o.totalSuccess, 0),
          totalFailed: Object.values(objectStats).reduce((sum, o) => sum + o.totalFailed, 0)
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取同步統計失敗:', error);
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
 * 獲取特定對象的同步歷史
 * GET /api/sync-logs/object/:objectApiName
 */
syncLogsRoutes.get('/object/:objectApiName', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM sync_logs 
      WHERE object_api_name = ?
      ORDER BY sync_time DESC 
      LIMIT ?
    `).bind(objectApiName, limit).all();
    
    const logs = result.results.map(log => ({
      ...log,
      fields_changed: log.fields_changed ? JSON.parse(log.fields_changed) : null,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
    
    return new Response(JSON.stringify({
      success: true,
      data: logs,
      count: logs.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取對象同步歷史失敗:', error);
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
 * 清理舊日誌
 * DELETE /api/sync-logs/cleanup
 */
syncLogsRoutes.delete('/cleanup', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30');
  
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const result = await env.DB.prepare(`
      DELETE FROM sync_logs 
      WHERE sync_time < ?
    `).bind(cutoffDate).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: `已清理 ${days} 天前的日誌`,
      deleted: result.meta.changes
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('清理日誌失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});