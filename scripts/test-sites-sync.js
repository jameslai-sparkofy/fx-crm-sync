/**
 * 測試案場同步 - 使用正確的時間戳格式
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

async function fetchSites(corpId, accessToken, currentOpenUserId, lastSyncTime = null) {
  const allData = [];
  let offset = 0;
  let hasMore = true;
  const pageSize = 100;
  
  // 構建查詢條件
  const filters = [
    {
      field_name: 'life_status',
      operator: 'NEQ',
      field_values: ['作废']
    }
  ];
  
  // 增量同步：只獲取更新的記錄
  if (lastSyncTime) {
    console.log(`使用增量同步，最後同步時間戳: ${lastSyncTime}`);
    filters.push({
      field_name: 'last_modified_time',
      operator: 'GTE',
      field_values: [lastSyncTime] // 直接使用時間戳數字
    });
  } else {
    console.log('執行完整同步');
  }
  
  console.log('過濾條件:', JSON.stringify(filters, null, 2));
  
  while (hasMore && offset < 5000) { // 限制最多獲取 5000 條
    console.log(`\n獲取第 ${offset / pageSize + 1} 批，offset: ${offset}`);
    
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: offset,
          limit: pageSize,
          filters: filters,
          orders: [{ fieldName: 'last_modified_time', isAsc: false }]
        }
      }
    });

    if (response.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${response.data.errorMessage}`);
    }

    const batch = response.data.data.dataList || [];
    console.log(`獲取到 ${batch.length} 條記錄，總計: ${response.data.data.total}`);
    
    allData.push(...batch);
    
    // 檢查是否還有更多數據
    hasMore = batch.length === pageSize && offset + pageSize < response.data.data.total;
    offset += pageSize;
  }
  
  return allData;
}

async function main() {
  try {
    console.log('=== 測試案場同步 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 測試 1: 完整同步（前 100 條）
    console.log('\n--- 測試完整同步（前 100 條）---');
    const fullSyncData = await fetchSites(corpId, accessToken, currentOpenUserId, null);
    console.log(`\n✅ 完整同步獲取到 ${fullSyncData.length} 條記錄`);
    
    // 測試 2: 增量同步（最近 7 天）
    console.log('\n--- 測試增量同步（最近 7 天）---');
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const incrementalData = await fetchSites(corpId, accessToken, currentOpenUserId, sevenDaysAgo);
    console.log(`\n✅ 增量同步獲取到 ${incrementalData.length} 條記錄`);
    
    // 測試 3: 增量同步（最近 1 小時）
    console.log('\n--- 測試增量同步（最近 1 小時）---');
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentData = await fetchSites(corpId, accessToken, currentOpenUserId, oneHourAgo);
    console.log(`\n✅ 最近 1 小時同步獲取到 ${recentData.length} 條記錄`);
    
    // 顯示最新的記錄
    if (fullSyncData.length > 0) {
      const latestRecord = fullSyncData[0];
      console.log('\n最新記錄資訊:');
      console.log('- ID:', latestRecord._id);
      console.log('- 名稱:', latestRecord.name);
      console.log('- 最後修改時間:', new Date(latestRecord.last_modified_time).toISOString());
      console.log('- 創建時間:', new Date(latestRecord.create_time).toISOString());
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.response?.data) {
      console.error('API 錯誤詳情:', error.response.data);
    }
  }
}

main();