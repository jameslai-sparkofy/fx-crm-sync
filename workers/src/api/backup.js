import { Router } from 'itty-router';

export const backupRoutes = Router({ base: '/api/backup' });

/**
 * 獲取備份點資訊
 * POST /api/backup/info
 * Body: { timestamp: "2025-08-09T15:00:00Z" }
 */
backupRoutes.post('/info', async (request) => {
  const { env } = request;
  
  try {
    const body = await request.json().catch(() => ({}));
    const timestamp = body.timestamp || new Date().toISOString();
    
    // 這個功能需要通過 Cloudflare API 調用
    // 由於 Worker 中無法直接執行 wrangler 命令，我們返回指導信息
    return new Response(JSON.stringify({
      success: true,
      data: {
        timestamp: timestamp,
        message: '時間旅行功能需要使用 wrangler CLI 工具',
        instructions: {
          查看備份點: `wrangler d1 time-travel info fx-crm-database --timestamp="${timestamp}"`,
          恢復資料庫: `wrangler d1 time-travel restore fx-crm-database --timestamp="${timestamp}"`
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取備份資訊失敗:', error);
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
 * 獲取重要時間點列表
 * GET /api/backup/checkpoints
 */
backupRoutes.get('/checkpoints', async (request) => {
  const { env } = request;
  
  try {
    // 從 sync_logs 獲取重要操作時間點
    const checkpoints = await env.DB.prepare(`
      SELECT 
        completed_at as timestamp,
        entity_type,
        action,
        records_count,
        error_count,
        details
      FROM sync_logs
      WHERE status = 'COMPLETED'
        AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 50
    `).all();
    
    // 從表的修改時間獲取結構變更點
    const tableChanges = await env.DB.prepare(`
      SELECT 
        name as table_name,
        sql,
        tbl_name
      FROM sqlite_master
      WHERE type = 'table'
        AND name LIKE '%__c'
      ORDER BY name
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        syncCheckpoints: checkpoints.results || [],
        tables: tableChanges.results || [],
        currentTime: new Date().toISOString(),
        recommendation: '建議在重大操作前記錄時間點，以便需要時恢復'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取檢查點失敗:', error);
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
 * 記錄重要操作點
 * POST /api/backup/mark
 * Body: { description: "重建工地師父表結構" }
 */
backupRoutes.post('/mark', async (request) => {
  const { env } = request;
  
  try {
    const body = await request.json();
    const description = body.description || '手動標記';
    const timestamp = new Date().toISOString();
    
    // 在 sync_logs 中記錄這個操作
    await env.DB.prepare(`
      INSERT INTO sync_logs (
        sync_id, entity_type, action, status, 
        started_at, completed_at, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `manual_mark_${Date.now()}`,
      'BACKUP_CHECKPOINT',
      'MANUAL_MARK',
      'COMPLETED',
      timestamp,
      timestamp,
      JSON.stringify({ description, timestamp })
    ).run();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        timestamp: timestamp,
        description: description,
        message: '檢查點已記錄'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('標記檢查點失敗:', error);
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
 * 獲取資料庫統計資訊
 * GET /api/backup/stats
 */
backupRoutes.get('/stats', async (request) => {
  const { env } = request;
  
  try {
    // 獲取資料庫大小 - D1 不支援 pragma 查詢，使用替代方法
    // 通過計算所有表的記錄數來估算
    let totalRecords = 0;
    
    // 獲取各表的記錄數
    const tables = [
      'object_8w9cb__c',
      'object_50hj8__c',
      'object_k1xqg__c',
      'newopportunityobj',
      'supplierobj'
    ];
    
    const tableStats = [];
    for (const table of tables) {
      try {
        const count = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM ${table}`
        ).first();
        const recordCount = count.count || 0;
        totalRecords += recordCount;
        tableStats.push({
          table: table,
          records: recordCount
        });
      } catch (e) {
        // 表可能不存在
      }
    }
    
    // 估算資料庫大小（假設每條記錄平均 1KB）
    const estimatedSizeKB = totalRecords;
    const estimatedSizeMB = (estimatedSizeKB / 1024).toFixed(2);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        database: {
          sizeBytes: estimatedSizeKB * 1024,
          sizeMB: estimatedSizeMB,
          totalRecords: totalRecords,
          estimatedSize: true
        },
        tables: tableStats,
        lastBackup: new Date().toISOString()
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取統計失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});