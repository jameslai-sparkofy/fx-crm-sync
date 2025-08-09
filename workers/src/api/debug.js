import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';

export const debugRoutes = Router({ base: '/api/debug' });

/**
 * 檢查 D1 數據
 * GET /api/debug/d1-stats
 */
debugRoutes.get('/d1-stats', async (request) => {
  const { env } = request;
  
  try {
    // 查詢各表的記錄數
    const oppCount = await env.DB.prepare('SELECT COUNT(*) as count FROM newopportunityobj').first();
    const siteCount = await env.DB.prepare('SELECT COUNT(*) as count FROM object_8w9cb__c').first();
    const syncLogCount = await env.DB.prepare('SELECT COUNT(*) as count FROM sync_logs').first();
    
    // 最近的同步記錄
    const recentSyncs = await env.DB.prepare(`
      SELECT entity_type, status, records_count, error_count, completed_at 
      FROM sync_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        tables: {
          opportunities: oppCount.count,
          sites: siteCount.count,
          syncLogs: syncLogCount.count
        },
        recentSyncs: recentSyncs.results
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
 * 測試認證流程
 * GET /api/debug/auth
 */
debugRoutes.get('/auth', async (request) => {
  const { env } = request;
  
  try {
    const fxClient = new FxClient(env);
    
    // 測試獲取 token
    console.log('開始測試認證流程...');
    await fxClient.init();
    
    // 返回認證信息
    return new Response(JSON.stringify({
      success: true,
      data: {
        hasToken: !!fxClient.accessToken,
        hasCorpId: !!fxClient.corpId,
        hasUserId: !!fxClient.currentOpenUserId,
        corpId: fxClient.corpId,
        currentOpenUserId: fxClient.currentOpenUserId,
        tokenExpiry: fxClient.tokenExpiry ? new Date(fxClient.tokenExpiry).toISOString() : null
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 測試簡單查詢
 * GET /api/debug/test-query
 */
debugRoutes.get('/test-query', async (request) => {
  const { env } = request;
  
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 測試查詢一條商機
    const response = await fxClient.post('/cgi/crm/v2/data/query', {
      data: {
        dataObjectApiName: 'NewOpportunityObj',
        search_query_info: {
          limit: 1,
          offset: 0
        }
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        hasData: !!response.data,
        recordCount: response.data?.dataList?.length || 0,
        total: response.data?.total || 0
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 測試單條案場保存
 * GET /api/debug/test-single-site
 */
debugRoutes.get('/test-single-site', async (request) => {
  const { env } = request;
  
  try {
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    console.log('[Debug] 開始測試單條案場保存...');
    
    // 1. 獲取一條案場數據
    const response = await fxClient.post('/cgi/crm/custom/v2/data/query', {
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 1,
          offset: 0,
          filters: [
            {
              field_name: 'life_status',
              operator: 'NEQ',
              field_values: ['作废']
            }
          ],
          orders: [{ fieldName: 'create_time', isAsc: 'false' }]
        }
      }
    });
    
    if (response.errorCode !== 0 || !response.data?.dataList?.length) {
      throw new Error(`獲取案場數據失敗: ${response.errorMessage}`);
    }
    
    const site = response.data.dataList[0];
    console.log('[Debug] 獲取到案場:', site._id, site.name);
    
    // 2. 嘗試保存到 D1
    try {
      // 準備數據（處理數組類型）
      const preparedSite = {
        _id: site._id,
        name: site.name,
        owner: Array.isArray(site.owner) ? site.owner[0] : site.owner,
        owner__r: typeof site.owner__r === 'object' ? site.owner__r?.name : site.owner__r,
        owner_department_id: site.owner_department_id || null,
        owner_department: site.owner_department || null,
        create_time: site.create_time,
        created_by: Array.isArray(site.created_by) ? site.created_by[0] : site.created_by,
        created_by__r: typeof site.created_by__r === 'object' ? site.created_by__r?.name : site.created_by__r,
        last_modified_time: site.last_modified_time,
        last_modified_by: Array.isArray(site.last_modified_by) ? site.last_modified_by[0] : site.last_modified_by,
        last_modified_by__r: typeof site.last_modified_by__r === 'object' ? site.last_modified_by__r?.name : site.last_modified_by__r,
        life_status: site.life_status || 'normal',
        life_status__r: site.life_status__r || null,
        lock_status: site.lock_status || '0',
        lock_status__r: site.lock_status__r || null,
        is_deleted: site.is_deleted || false,
        record_type: site.record_type || 'default__c',
        version: site.version || null,
        data_own_department: Array.isArray(site.data_own_department) ? site.data_own_department[0] : site.data_own_department,
        data_own_department__r: typeof site.data_own_department__r === 'object' ? site.data_own_department__r?.deptName : site.data_own_department__r,
        relevant_team: JSON.stringify(site.relevant_team || []),
        field_23Z5i__c: JSON.stringify(site.field_23Z5i__c || [])
      };
      
      console.log('[Debug] 準備保存的數據:', JSON.stringify(preparedSite, null, 2));
      
      // 插入到 D1
      // 44 個欄位
      const result = await env.DB.prepare(`
        INSERT INTO object_8w9cb__c (
          _id, name, owner, owner__r, owner_department_id, owner_department,
          create_time, created_by, created_by__r,
          last_modified_time, last_modified_by, last_modified_by__r,
          life_status, life_status__r, lock_status, lock_status__r,
          is_deleted, record_type, version,
          data_own_department, data_own_department__r,
          relevant_team, total_num,
          field_k7e6q__c, field_k7e6q__c__r, field_k7e6q__c__relation_ids,
          field_1P96q__c, field_1P96q__c__r, field_1P96q__c__relation_ids,
          field_npLvn__c, field_npLvn__c__r, field_npLvn__c__relation_ids,
          field_WD7k1__c, field_XuJP2__c,
          field_i2Q1g__c, field_tXAko__c, field_Q6Svh__c,
          field_23Z5i__c, field_23Z5i__c__r,
          field_dxr31__c, field_dxr31__c__r,
          fx_created_at, fx_updated_at, sync_version
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
          ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
          ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30,
          ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40,
          ?41, ?42, ?43, ?44
        )
        ON CONFLICT(_id) DO UPDATE SET
          name = excluded.name,
          last_modified_time = excluded.last_modified_time,
          fx_updated_at = excluded.fx_updated_at,
          sync_version = sync_version + 1,
          sync_time = CURRENT_TIMESTAMP
      `).bind(
        preparedSite._id,                          // 1
        preparedSite.name,                         // 2
        preparedSite.owner,                        // 3
        preparedSite.owner__r,                     // 4
        preparedSite.owner_department_id,          // 5
        preparedSite.owner_department,             // 6
        preparedSite.create_time,                  // 7
        preparedSite.created_by,                   // 8
        preparedSite.created_by__r,                // 9
        preparedSite.last_modified_time,           // 10
        preparedSite.last_modified_by,             // 11
        preparedSite.last_modified_by__r,          // 12
        preparedSite.life_status,                  // 13
        preparedSite.life_status__r,               // 14
        preparedSite.lock_status,                  // 15
        preparedSite.lock_status__r,               // 16
        preparedSite.is_deleted,                   // 17
        preparedSite.record_type,                  // 18
        preparedSite.version,                      // 19
        preparedSite.data_own_department,          // 20
        preparedSite.data_own_department__r,       // 21
        preparedSite.relevant_team,                // 22
        site.total_num || null,                    // 23
        site.field_k7e6q__c || null,              // 24
        site.field_k7e6q__c__r || null,           // 25
        site.field_k7e6q__c__relation_ids || null, // 26
        site.field_1P96q__c || null,              // 27
        site.field_1P96q__c__r || null,           // 28
        site.field_1P96q__c__relation_ids || null, // 29
        site.field_npLvn__c || null,              // 30
        site.field_npLvn__c__r || null,           // 31
        site.field_npLvn__c__relation_ids || null, // 32
        site.field_WD7k1__c || null,              // 33
        site.field_XuJP2__c || null,              // 34
        site.field_i2Q1g__c || null,              // 35
        site.field_tXAko__c || null,              // 36
        site.field_Q6Svh__c || null,              // 37
        preparedSite.field_23Z5i__c,              // 38
        site.field_23Z5i__c__r || null,           // 39
        site.field_dxr31__c || null,              // 40
        site.field_dxr31__c__r || null,           // 41
        preparedSite.create_time,                  // 42
        preparedSite.last_modified_time,           // 43
        0                                          // 44
      ).run();
      
      console.log('[Debug] 保存成功!', result);
      
      // 驗證保存
      const saved = await env.DB.prepare('SELECT * FROM object_8w9cb__c WHERE _id = ?').bind(site._id).first();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          message: '單條案場保存測試成功',
          site: {
            _id: site._id,
            name: site.name
          },
          saved: !!saved,
          result: result
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (dbError) {
      console.error('[Debug] D1 保存失敗:', dbError);
      return new Response(JSON.stringify({
        success: false,
        error: dbError.message,
        stack: dbError.stack,
        site: {
          _id: site._id,
          name: site.name
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('[Debug] 測試失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 獲取案場數據樣本
 * GET /api/debug/sites-sample
 */
debugRoutes.get('/sites-sample', async (request) => {
  const { env } = request;
  
  try {
    // 獲取最新的 10 條案場數據
    const sites = await env.DB.prepare(`
      SELECT _id, name, field_k7e6q__c, field_WD7k1__c, field_npLvn__c, field_XuJP2__c,
             fx_created_at, fx_updated_at
      FROM object_8w9cb__c
      ORDER BY fx_created_at DESC
      LIMIT 10
    `).all();
    
    // 獲取有重複鍵的記錄統計
    const duplicates = await env.DB.prepare(`
      SELECT 
        field_k7e6q__c, field_WD7k1__c, field_npLvn__c, field_XuJP2__c,
        COUNT(*) as count
      FROM object_8w9cb__c
      WHERE field_k7e6q__c IS NOT NULL 
        AND field_WD7k1__c IS NOT NULL 
        AND field_npLvn__c IS NOT NULL 
        AND field_XuJP2__c IS NOT NULL
      GROUP BY field_k7e6q__c, field_WD7k1__c, field_npLvn__c, field_XuJP2__c
      HAVING COUNT(*) > 1
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        totalSites: await env.DB.prepare('SELECT COUNT(*) as count FROM object_8w9cb__c').first().then(r => r.count),
        latestSites: sites.results,
        duplicateKeys: duplicates.results.length,
        duplicates: duplicates.results.slice(0, 5) // 只顯示前 5 個重複
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});