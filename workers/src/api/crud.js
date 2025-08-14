import { Router } from 'itty-router';
import { FxClient } from '../utils/fx-client.js';
import { withAuth } from '../middleware/auth.js';

export const crudRoutes = Router({ base: '/api/crud' });

/**
 * 創建新記錄並同步到 CRM
 * POST /api/crud/:objectApiName
 */
crudRoutes.post('/:objectApiName', withAuth(async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    const body = await request.json();
    
    // 初始化 FX 客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 準備創建數據 - 需要包裝在 object_data 中
    const createData = {
      data: {
        object_data: {
          dataObjectApiName: objectApiName,
          ...body
        }
      }
    };
    
    // 根據對象類型選擇正確的 API 端點
    const apiPath = objectApiName.includes('__c') ? 
      '/cgi/crm/custom/v2/data/create' : 
      '/cgi/crm/v2/data/create';
    
    console.log(`[CRUD] 創建記錄 - API路徑: ${apiPath}`);
    console.log(`[CRUD] 創建記錄 - 請求數據:`, JSON.stringify(createData, null, 2));
    
    // 調用 CRM API 創建記錄 - FxClient.post 已經處理了外層的 data 包裝
    const response = await fxClient.post(apiPath, createData);
    
    console.log(`[CRUD] 創建回應:`, JSON.stringify(response, null, 2));
    
    if (response.errorCode !== 0) {
      throw new Error(`CRM 創建失敗: ${response.errorMessage}`);
    }
    
    const createdId = response.dataId || response.data?.data_id || response.data?.dataId;
    console.log(`[CRUD] 創建成功，ID: ${createdId}`);
    
    // 獲取完整的創建記錄以同步到 D1
    const getResponse = await fxClient.post(
      objectApiName.includes('__c') ? '/cgi/crm/custom/v2/data/get' : '/cgi/crm/v2/data/get',
      {
        data: {
          dataObjectApiName: objectApiName,
          objectDataId: createdId
        }
      }
    );
    
    console.log(`[CRUD] 獲取記錄回應:`, JSON.stringify(getResponse, null, 2));
    
    if (getResponse.errorCode !== 0) {
      throw new Error(`獲取創建記錄失敗: ${getResponse.errorMessage}`);
    }
    
    // 同步到 D1
    const recordData = getResponse.data?.data || getResponse.data;
    console.log(`[CRUD] 準備同步到 D1，數據:`, JSON.stringify(recordData, null, 2));
    await syncToD1(env.DB, objectApiName, recordData, 'create');
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: createdId,
        record: getResponse.data?.data
      },
      message: '記錄創建成功並已同步'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('創建記錄失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * 更新記錄並同步到 CRM
 * PUT /api/crud/:objectApiName/:recordId
 * 
 * 重要：紛享銷客 API 格式要求
 * - 必須使用 object_data 包裝更新數據
 * - 記錄 ID 必須作為 _id 放在 object_data 內部
 * - dataObjectApiName 也必須在 object_data 內部
 * - 參考官方文檔：https://open.fxiaoke.com/wiki/
 */
crudRoutes.put('/:objectApiName/:recordId', withAuth(async (request) => {
  const { env } = request;
  const { objectApiName, recordId } = request.params;
  
  try {
    const body = await request.json();
    
    // 初始化 FX 客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 準備更新數據
    // 使用官方文檔格式：object_data 包裝
    const updateData = {
      object_data: {
        _id: recordId,  // ID 必須在 object_data 內部
        dataObjectApiName: objectApiName,
        ...body         // 展開用戶提供的更新字段
      }
    };
    
    // 根據對象類型選擇正確的 API 端點
    const apiPath = objectApiName.includes('__c') ? 
      '/cgi/crm/custom/v2/data/update' : 
      '/cgi/crm/v2/data/update';
    
    console.log(`[CRUD] 更新記錄 - API路徑: ${apiPath}`);
    console.log(`[CRUD] 更新請求數據:`, JSON.stringify({ data: updateData }, null, 2));
    
    // 調用 CRM API 更新記錄 - 使用正確的 object_data 格式
    const response = await fxClient.post(apiPath, { data: updateData });
    
    if (response.errorCode !== 0) {
      throw new Error(`CRM 更新失敗: ${response.errorMessage}`);
    }
    
    // 獲取更新後的完整記錄
    const getResponse = await fxClient.post(
      objectApiName.includes('__c') ? '/cgi/crm/custom/v2/data/get' : '/cgi/crm/v2/data/get',
      {
        data: {
          dataObjectApiName: objectApiName,
          objectDataId: recordId
        }
      }
    );
    
    if (getResponse.errorCode !== 0) {
      throw new Error(`獲取更新記錄失敗: ${getResponse.errorMessage}`);
    }
    
    // 同步到 D1
    await syncToD1(env.DB, objectApiName, getResponse.data?.data, 'update');
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: recordId,
        record: getResponse.data?.data
      },
      message: '記錄更新成功並已同步'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('更新記錄失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * 刪除記錄並同步到 CRM
 * DELETE /api/crud/:objectApiName/:recordId
 */
crudRoutes.delete('/:objectApiName/:recordId', withAuth(async (request) => {
  const { env } = request;
  const { objectApiName, recordId } = request.params;
  
  try {
    // 初始化 FX 客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    // 準備刪除數據
    const deleteData = {
      dataObjectApiName: objectApiName,
      objectDataId: recordId
    };
    
    // 根據對象類型選擇正確的 API 端點
    const apiPath = objectApiName.includes('__c') ? 
      '/cgi/crm/custom/v2/data/delete' : 
      '/cgi/crm/v2/data/delete';
    
    // 調用 CRM API 刪除記錄
    const response = await fxClient.post(apiPath, { data: deleteData });
    
    if (response.errorCode !== 0) {
      throw new Error(`CRM 刪除失敗: ${response.errorMessage}`);
    }
    
    // 從 D1 刪除記錄
    await deleteFromD1(env.DB, objectApiName, recordId);
    
    return new Response(JSON.stringify({
      success: true,
      message: '記錄刪除成功並已同步'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('刪除記錄失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * 批量創建記錄
 * POST /api/crud/:objectApiName/batch
 */
crudRoutes.post('/:objectApiName/batch', withAuth(async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    const { records } = await request.json();
    
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('請提供要創建的記錄數組');
    }
    
    // 初始化 FX 客戶端
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const results = {
      success: [],
      failed: []
    };
    
    // 批量處理，每批最多 100 條
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        // 準備批量創建數據
        const batchData = {
          dataObjectApiName: objectApiName,
          dataList: batch
        };
        
        // 根據對象類型選擇正確的 API 端點
        const apiPath = objectApiName.includes('__c') ? 
          '/cgi/crm/custom/v2/data/batchCreate' : 
          '/cgi/crm/v2/data/batchCreate';
        
        // 調用 CRM API 批量創建
        const response = await fxClient.post(apiPath, { data: batchData });
        
        if (response.errorCode !== 0) {
          throw new Error(`批量創建失敗: ${response.errorMessage}`);
        }
        
        // 處理成功的記錄
        if (response.data?.successList) {
          results.success.push(...response.data.successList);
          
          // 同步成功的記錄到 D1
          for (const successItem of response.data.successList) {
            await syncToD1(env.DB, objectApiName, successItem, 'create');
          }
        }
        
        // 處理失敗的記錄
        if (response.data?.failList) {
          results.failed.push(...response.data.failList);
        }
        
      } catch (error) {
        console.error(`批次處理失敗:`, error);
        results.failed.push(...batch.map((record, index) => ({
          index: i + index,
          error: error.message
        })));
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: results,
      message: `批量創建完成: 成功 ${results.success.length} 條，失敗 ${results.failed.length} 條`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('批量創建失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * 獲取單條記錄（從 D1 或 CRM）
 * GET /api/crud/:objectApiName/:recordId
 */
crudRoutes.get('/:objectApiName/:recordId', withAuth(async (request) => {
  const { env } = request;
  const { objectApiName, recordId } = request.params;
  const url = new URL(request.url);
  const source = url.searchParams.get('source') || 'd1'; // 默認從 D1 讀取
  
  try {
    let record;
    
    if (source === 'crm') {
      // 從 CRM 獲取最新數據
      const fxClient = new FxClient(env);
      await fxClient.init();
      
      const apiPath = objectApiName.includes('__c') ? 
        '/cgi/crm/custom/v2/data/get' : 
        '/cgi/crm/v2/data/get';
      
      const response = await fxClient.post(apiPath, {
        data: {
          dataObjectApiName: objectApiName,
          objectDataId: recordId
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取記錄失敗: ${response.errorMessage}`);
      }
      
      record = response.data?.data;
      
      // 同步到 D1
      if (record) {
        await syncToD1(env.DB, objectApiName, record, 'update');
      }
    } else {
      // 從 D1 獲取
      const tableName = objectApiName.toLowerCase();
      const result = await env.DB.prepare(`
        SELECT * FROM ${tableName} WHERE _id = ?
      `).bind(recordId).first();
      
      if (!result) {
        throw new Error('記錄不存在');
      }
      
      record = result;
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: record,
      source: source
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * 查詢記錄列表（從 D1）
 * GET /api/crud/:objectApiName
 */
crudRoutes.get('/:objectApiName', withAuth(async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  const url = new URL(request.url);
  
  // 分頁參數
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;
  
  // 排序參數
  const sortBy = url.searchParams.get('sortBy') || 'fx_updated_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'DESC';
  
  // 搜索參數
  const search = url.searchParams.get('search') || '';
  
  try {
    const tableName = objectApiName.toLowerCase();
    
    // 構建查詢
    let query = `SELECT * FROM ${tableName}`;
    let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    let params = [];
    
    // 添加搜索條件
    if (search) {
      const searchCondition = ` WHERE name LIKE ?`;
      query += searchCondition;
      countQuery += searchCondition;
      params.push(`%${search}%`);
    }
    
    // 添加排序和分頁
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    
    // 獲取總數
    const countResult = await env.DB.prepare(countQuery)
      .bind(...params)
      .first();
    
    // 獲取數據
    const results = await env.DB.prepare(query)
      .bind(...params, pageSize, offset)
      .all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        records: results.results,
        pagination: {
          page,
          pageSize,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / pageSize)
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('查詢記錄失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

/**
 * 同步記錄到 D1
 */
async function syncToD1(db, objectApiName, record, action) {
  const tableName = objectApiName.toLowerCase();
  
  try {
    if (!record || typeof record !== 'object') {
      console.error('無效的記錄數據:', record);
      return;
    }
    
    if (action === 'create' || action === 'update') {
      // 動態構建 INSERT/UPDATE 語句
      const fields = Object.keys(record);
      let placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => {
        const value = record[field];
        // 處理數組和對象類型
        if (Array.isArray(value) || (value && typeof value === 'object')) {
          return JSON.stringify(value);
        }
        return value;
      });
      
      // 添加同步時間戳
      fields.push('sync_time', 'fx_updated_at');
      placeholders += ', ?, ?';
      values.push(new Date().toISOString(), new Date().toISOString());
      
      const sql = `
        INSERT INTO ${tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT(_id) DO UPDATE SET
        ${fields.filter(f => f !== '_id').map(f => `${f} = excluded.${f}`).join(', ')}
      `;
      
      await db.prepare(sql).bind(...values).run();
    }
  } catch (error) {
    console.error(`同步到 D1 失敗:`, error);
    throw error;
  }
}

/**
 * 從 D1 刪除記錄
 */
async function deleteFromD1(db, objectApiName, recordId) {
  const tableName = objectApiName.toLowerCase();
  
  try {
    await db.prepare(`
      DELETE FROM ${tableName} WHERE _id = ?
    `).bind(recordId).run();
  } catch (error) {
    console.error(`從 D1 刪除失敗:`, error);
    throw error;
  }
}