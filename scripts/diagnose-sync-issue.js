/**
 * 診斷同步問題
 * 找出為什麼 558 條記錄無法同步
 */

const axios = require('axios');
require('dotenv').config();

const FX_CONFIG = {
  baseUrl: process.env.FX_API_BASE_URL || 'https://open.fxiaoke.com',
  appId: process.env.FXIAOKE_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FXIAOKE_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FXIAOKE_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

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

async function getAllCRMIds(corpId, accessToken, currentOpenUserId) {
  const allIds = new Set();
  let offset = 0;
  const limit = 500;
  
  console.log('從 CRM 獲取所有記錄 ID...');
  
  while (true) {
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

    const records = response.data.data?.dataList || [];
    records.forEach(r => allIds.add(r._id));
    
    process.stdout.write(`\r  已獲取 ${allIds.size} 條記錄`);
    
    if (records.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  console.log('');
  return allIds;
}

async function getAllD1Ids() {
  const allIds = new Set();
  let page = 1;
  const pageSize = 1000;
  
  console.log('從 D1 獲取所有記錄 ID...');
  
  while (true) {
    try {
      const response = await axios.get(`${WORKER_URL}/api/crud/object_8W9cb__c`, {
        params: {
          page: page,
          pageSize: pageSize,
          fields: '_id'  // 只獲取 ID
        },
        timeout: 30000
      });
      
      if (!response.data.success) {
        break;
      }
      
      const records = response.data.data.records || [];
      records.forEach(r => allIds.add(r._id));
      
      process.stdout.write(`\r  已獲取 ${allIds.size} 條記錄`);
      
      if (records.length < pageSize) {
        break;
      }
      
      page++;
    } catch (error) {
      console.error('\n  獲取 D1 記錄時出錯:', error.message);
      break;
    }
  }
  
  console.log('');
  return allIds;
}

async function analyzeMissingRecords(missingIds, corpId, accessToken, currentOpenUserId) {
  console.log('\n分析缺失記錄的分佈...');
  
  // 按批次分組
  const batchSize = 500;
  const batchGroups = {};
  const idArray = Array.from(missingIds);
  
  // 獲取每個缺失記錄的詳細信息
  const sampleSize = Math.min(10, idArray.length);
  const samples = [];
  
  for (let i = 0; i < sampleSize; i++) {
    const recordId = idArray[i];
    
    try {
      const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/get`, {
        corpId,
        corpAccessToken: accessToken,
        currentOpenUserId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          objectDataId: recordId
        }
      });
      
      if (response.data.errorCode === 0) {
        const record = response.data.data?.data;
        samples.push({
          id: record._id,
          name: record.name,
          createTime: new Date(record.create_time).toISOString(),
          modifyTime: new Date(record.last_modified_time).toISOString()
        });
      }
    } catch (error) {
      // 忽略單個記錄的錯誤
    }
  }
  
  // 獲取所有記錄以確定它們在哪個批次
  let allRecords = [];
  let offset = 0;
  
  console.log('\n確定缺失記錄的批次位置...');
  
  while (true) {
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: offset,
          limit: batchSize,
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
    
    const records = response.data.data?.dataList || [];
    records.forEach((r, index) => {
      if (missingIds.has(r._id)) {
        const batchNum = Math.floor((offset + index) / batchSize) + 1;
        const positionInBatch = (offset + index) % batchSize;
        
        if (!batchGroups[batchNum]) {
          batchGroups[batchNum] = [];
        }
        batchGroups[batchNum].push({
          id: r._id,
          name: r.name,
          position: offset + index,
          positionInBatch: positionInBatch
        });
      }
    });
    
    process.stdout.write(`\r  已檢查 ${offset + records.length} 條記錄`);
    
    if (records.length < batchSize) {
      break;
    }
    
    offset += batchSize;
  }
  
  console.log('\n');
  
  return {
    samples: samples,
    batchDistribution: batchGroups
  };
}

async function main() {
  try {
    console.log('=== 診斷同步問題 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取所有 ID
    const crmIds = await getAllCRMIds(corpId, accessToken, currentOpenUserId);
    const d1Ids = await getAllD1Ids();
    
    console.log(`\n📊 統計:`);
    console.log(`  CRM 記錄數: ${crmIds.size}`);
    console.log(`  D1 記錄數: ${d1Ids.size}`);
    
    // 找出缺失的記錄
    const missingIds = new Set();
    for (const id of crmIds) {
      if (!d1Ids.has(id)) {
        missingIds.add(id);
      }
    }
    
    console.log(`  缺失記錄數: ${missingIds.size}`);
    
    if (missingIds.size > 0) {
      // 分析缺失記錄
      const analysis = await analyzeMissingRecords(missingIds, corpId, accessToken, currentOpenUserId);
      
      console.log('\n📍 缺失記錄的批次分佈:');
      const batchNums = Object.keys(analysis.batchDistribution).sort((a, b) => a - b);
      
      for (const batchNum of batchNums) {
        const records = analysis.batchDistribution[batchNum];
        const startPos = Math.min(...records.map(r => r.position));
        const endPos = Math.max(...records.map(r => r.position));
        
        console.log(`\n  批次 ${batchNum} (位置 ${startPos}-${endPos}):`);
        console.log(`    缺失數量: ${records.length} 條`);
        
        // 顯示前3條
        for (let i = 0; i < Math.min(3, records.length); i++) {
          const r = records[i];
          console.log(`    - ${r.name} (位置: ${r.position}, 批內位置: ${r.positionInBatch})`);
        }
        
        if (records.length > 3) {
          console.log(`    ... 還有 ${records.length - 3} 條`);
        }
      }
      
      console.log('\n💡 診斷結果:');
      
      // 分析問題模式
      if (batchNums.length === 1) {
        console.log(`  ✓ 所有缺失記錄都在批次 ${batchNums[0]}`);
        console.log(`  → 這個批次可能從未被同步`);
      } else {
        console.log(`  ✓ 缺失記錄分佈在 ${batchNums.length} 個批次`);
        console.log(`  → 批次: ${batchNums.join(', ')}`);
      }
      
      // 計算需要的偏移量
      const firstMissingBatch = parseInt(batchNums[0]);
      const suggestedOffset = (firstMissingBatch - 1) * 500;
      
      console.log('\n🔧 建議解決方案:');
      console.log(`  1. 從偏移量 ${suggestedOffset} 開始同步`);
      console.log(`  2. 需要處理約 ${batchNums.length} 個批次`);
      console.log(`  3. 每批 200 條，需要執行約 ${Math.ceil(missingIds.size / 200)} 次`);
      
      // 顯示樣本記錄
      if (analysis.samples.length > 0) {
        console.log('\n📝 缺失記錄樣本:');
        for (const sample of analysis.samples.slice(0, 5)) {
          console.log(`  - ${sample.name}`);
          console.log(`    ID: ${sample.id}`);
          console.log(`    創建: ${sample.createTime}`);
          console.log(`    修改: ${sample.modifyTime}`);
        }
      }
    } else {
      console.log('\n✅ 沒有發現缺失的記錄！');
      console.log('所有 CRM 記錄都已同步到 D1');
    }
    
  } catch (error) {
    console.error('\n❌ 診斷失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();