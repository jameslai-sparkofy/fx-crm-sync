/**
 * 檢查 CRM 各批次的實際數據
 */

const axios = require('axios');
require('dotenv').config();

const FX_CONFIG = {
  baseUrl: process.env.FX_API_BASE_URL || 'https://open.fxiaoke.com',
  appId: process.env.FXIAOKE_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FXIAOKE_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FXIAOKE_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/corpAccessToken/get/V2`, {
    appId: FX_CONFIG.appId,
    appSecret: FX_CONFIG.appSecret,
    permanentCode: FX_CONFIG.permanentCode
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${response.data.errorMessage}`);
  }

  return {
    accessToken: response.data.corpAccessToken,
    corpId: response.data.corpId
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/user/getByMobile`, {
    corpId: corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`獲取用戶失敗: ${response.data.errorMessage}`);
  }

  return response.data.empList?.[0]?.openUserId;
}

async function fetchBatch(corpId, accessToken, currentOpenUserId, offset, limit) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: offset,
        limit: limit,
        filters: [
          {
            field_name: 'life_status',
            operator: 'NEQ',
            field_values: ['作废']
          }
        ],
        orders: [{ fieldName: '_id', isAsc: true }]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  return response.data.data;
}

async function main() {
  try {
    console.log('=== 檢查 CRM 各批次數據 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 檢查每個批次
    const batchSize = 500;
    const batches = [];
    let totalRecords = 0;
    
    console.log('批次檢查:\n');
    
    for (let batch = 0; batch < 10; batch++) {
      const offset = batch * batchSize;
      const data = await fetchBatch(corpId, accessToken, currentOpenUserId, offset, batchSize);
      const records = data.dataList || [];
      
      batches.push({
        batch: batch + 1,
        offset: offset,
        expected: batchSize,
        actual: records.length,
        total: data.total,
        firstId: records[0]?._id,
        lastName: records[0]?.name,
        lastId: records[records.length - 1]?._id,
        lastRecord: records[records.length - 1]?.name
      });
      
      totalRecords += records.length;
      
      console.log(`批次 ${batch + 1}:`);
      console.log(`  偏移量: ${offset}`);
      console.log(`  期望記錄數: ${batchSize}`);
      console.log(`  實際記錄數: ${records.length}`);
      console.log(`  總記錄數: ${data.total}`);
      
      if (records.length > 0) {
        console.log(`  第一條: ${records[0].name} (${records[0]._id})`);
        console.log(`  最後一條: ${records[records.length - 1].name} (${records[records.length - 1]._id})`);
      }
      
      console.log('');
      
      // 如果返回記錄少於期望，說明已經到達末尾
      if (records.length < batchSize) {
        console.log(`✅ 已到達數據末尾，共 ${batch + 1} 個批次\n`);
        break;
      }
    }
    
    // 統計分析
    console.log('=== 統計分析 ===\n');
    console.log(`總批次數: ${batches.length}`);
    console.log(`總記錄數: ${totalRecords}`);
    console.log(`CRM 聲明總數: ${batches[0]?.total || 0}`);
    
    // 找出未滿批次
    const incompleteBatches = batches.filter(b => b.actual < b.expected && b.batch < batches.length);
    if (incompleteBatches.length > 0) {
      console.log('\n⚠️ 發現未滿批次:');
      for (const batch of incompleteBatches) {
        console.log(`  批次 ${batch.batch}: 只有 ${batch.actual} 條記錄（期望 ${batch.expected}）`);
      }
    }
    
    // 計算理論上的記錄數
    const fullBatches = batches.filter(b => b.actual === batchSize).length;
    const lastBatchRecords = batches[batches.length - 1]?.actual || 0;
    const calculatedTotal = fullBatches * batchSize + lastBatchRecords;
    
    console.log(`\n計算總數: ${calculatedTotal}`);
    console.log(`實際總數: ${totalRecords}`);
    
    if (calculatedTotal !== totalRecords) {
      console.log('❌ 總數不匹配！');
    }
    
    // 特別檢查第 7-9 批（問題區域）
    console.log('\n=== 問題區域詳細檢查 (批次 7-9) ===\n');
    
    for (let batch = 6; batch < 9; batch++) {
      const offset = batch * batchSize;
      console.log(`\n檢查批次 ${batch + 1} (offset: ${offset}):`)
      
      const data = await fetchBatch(corpId, accessToken, currentOpenUserId, offset, 10);
      const records = data.dataList || [];
      
      console.log(`返回記錄數: ${records.length}`);
      
      for (let i = 0; i < Math.min(3, records.length); i++) {
        const record = records[i];
        console.log(`  ${i + 1}. ${record.name} (${record._id})`);
        console.log(`     創建: ${new Date(record.create_time).toISOString()}`);
        console.log(`     修改: ${new Date(record.last_modified_time).toISOString()}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ 檢查失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();