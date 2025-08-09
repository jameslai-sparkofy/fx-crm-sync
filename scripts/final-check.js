/**
 * 最終檢查 - 確認實際狀況
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

async function getCRMStats(corpId, accessToken, currentOpenUserId) {
  // 獲取 CRM 總數
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: 0,
        limit: 1,
        filters: [
          {
            field_name: 'life_status',
            operator: 'NEQ',
            field_values: ['作废']
          }
        ]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  return {
    total: response.data.data.total,
    totalWithoutFilter: await getCRMTotalWithoutFilter(corpId, accessToken, currentOpenUserId)
  };
}

async function getCRMTotalWithoutFilter(corpId, accessToken, currentOpenUserId) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: 0,
        limit: 1
      }
    }
  });

  if (response.data.errorCode !== 0) {
    return 0;
  }

  return response.data.data.total;
}

async function getD1Stats() {
  const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
  const siteTable = response.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
  return {
    recordCount: siteTable?.recordCount || 0,
    lastSync: siteTable?.lastSync
  };
}

async function checkDuplicates(corpId, accessToken, currentOpenUserId) {
  console.log('\n檢查是否有重複記錄...');
  
  const ids = new Set();
  const duplicates = [];
  let offset = 0;
  const limit = 500;
  
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
          ]
        }
      }
    });

    const records = response.data.data?.dataList || [];
    
    for (const record of records) {
      if (ids.has(record._id)) {
        duplicates.push(record._id);
      } else {
        ids.add(record._id);
      }
    }
    
    process.stdout.write(`\r  檢查進度: ${offset + records.length} 條`);
    
    if (records.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  console.log('');
  return {
    uniqueCount: ids.size,
    duplicates: duplicates
  };
}

async function checkSpecialRecords(corpId, accessToken, currentOpenUserId) {
  console.log('\n檢查特殊狀態的記錄...');
  
  const statusCounts = {};
  let offset = 0;
  const limit = 500;
  
  while (true) {
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: offset,
          limit: limit
        }
      }
    });

    const records = response.data.data?.dataList || [];
    
    for (const record of records) {
      const status = record.life_status || '未知';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    
    if (records.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  return statusCounts;
}

async function main() {
  try {
    console.log('=== 最終檢查 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取統計信息
    console.log('📊 獲取統計信息...');
    const crmStats = await getCRMStats(corpId, accessToken, currentOpenUserId);
    const d1Stats = await getD1Stats();
    
    console.log('\n📈 CRM 統計:');
    console.log(`  總記錄數（不含作廢）: ${crmStats.total}`);
    console.log(`  總記錄數（含作廢）: ${crmStats.totalWithoutFilter}`);
    console.log(`  作廢記錄數: ${crmStats.totalWithoutFilter - crmStats.total}`);
    
    console.log('\n💾 D1 統計:');
    console.log(`  記錄數: ${d1Stats.recordCount}`);
    console.log(`  最後同步: ${d1Stats.lastSync || '未知'}`);
    
    console.log('\n📊 差異分析:');
    const difference = crmStats.total - d1Stats.recordCount;
    console.log(`  差異: ${difference} 條`);
    
    if (Math.abs(difference) === 558) {
      console.log('  ⚠️ 確實差異 558 條記錄');
    }
    
    // 檢查重複
    const dupCheck = await checkDuplicates(corpId, accessToken, currentOpenUserId);
    console.log(`  CRM 唯一記錄數: ${dupCheck.uniqueCount}`);
    
    if (dupCheck.duplicates.length > 0) {
      console.log(`  ⚠️ 發現 ${dupCheck.duplicates.length} 個重複 ID`);
    } else {
      console.log('  ✅ 沒有重複記錄');
    }
    
    // 檢查生命狀態分佈
    const statusCounts = await checkSpecialRecords(corpId, accessToken, currentOpenUserId);
    console.log('\n📋 生命狀態分佈:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${status}: ${count} 條`);
    }
    
    // 分析結論
    console.log('\n💡 分析結論:');
    
    if (difference === 0) {
      console.log('✅ 同步已完成！所有記錄都已同步');
    } else if (difference > 0) {
      console.log(`⚠️ D1 缺少 ${difference} 條記錄`);
      
      // 計算百分比
      const syncRate = (d1Stats.recordCount / crmStats.total * 100).toFixed(1);
      console.log(`同步率: ${syncRate}%`);
      
      if (difference === 558) {
        console.log('\n可能的原因:');
        console.log('1. 這 558 條記錄可能在某個特定時間後創建');
        console.log('2. 可能有特殊字符或格式導致同步失敗');
        console.log('3. Worker 的斷點續傳邏輯可能跳過了這些記錄');
        
        console.log('\n建議解決方案:');
        console.log('1. 清除同步進度，重新執行完整同步');
        console.log('2. 檢查這 558 條記錄的創建時間模式');
        console.log('3. 考慮使用增量同步模式');
      }
    } else {
      console.log(`⚠️ D1 有多餘的 ${Math.abs(difference)} 條記錄`);
      console.log('可能存在重複或已刪除的記錄');
    }
    
  } catch (error) {
    console.error('\n❌ 檢查失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();