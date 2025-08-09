/**
 * 立即同步所有案場資料到 D1
 */

const axios = require('axios');
require('dotenv').config();

const DB_API = 'https://fx-crm-sync.lai-jameslai.workers.dev/api/crud/batch-insert';
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

async function fetchAllSites(corpId, accessToken, currentOpenUserId) {
  const allData = [];
  let offset = 0;
  const pageSize = 500; // 使用最大批次
  let totalCount = 0;
  
  console.log('開始獲取所有案場資料...\n');
  
  while (true) {
    process.stdout.write(`\r獲取進度: ${offset} / ${totalCount || '?'}`);
    
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: offset,
          limit: pageSize,
          filters: [
            {
              field_name: 'life_status',
              operator: 'NEQ',
              field_values: ['作废']
            }
          ],
          orders: [{ fieldName: '_id', isAsc: true }] // 按 ID 排序確保穩定
        }
      }
    });

    if (response.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${response.data.errorMessage}`);
    }

    const batch = response.data.data.dataList || [];
    totalCount = response.data.data.total;
    allData.push(...batch);
    
    if (batch.length < pageSize || allData.length >= totalCount) {
      break;
    }
    
    offset += pageSize;
  }
  
  console.log(`\n✅ 成功獲取 ${allData.length} 條案場資料`);
  return allData;
}

async function syncToD1(sites) {
  console.log('\n開始同步到 D1 資料庫...');
  
  const batchSize = 50; // 每批 50 條
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);
    process.stdout.write(`\r同步進度: ${i} / ${sites.length} (成功: ${successCount}, 失敗: ${errorCount})`);
    
    try {
      const response = await axios.post(DB_API, {
        objectApiName: 'object_8W9cb__c',
        records: batch
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.data.success) {
        successCount += batch.length;
      } else {
        console.error(`\n批次同步失敗: ${response.data.error}`);
        errorCount += batch.length;
      }
    } catch (error) {
      console.error(`\n批次同步錯誤: ${error.message}`);
      errorCount += batch.length;
    }
    
    // 避免過快請求
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n\n同步完成！`);
  console.log(`✅ 成功: ${successCount} 條`);
  console.log(`❌ 失敗: ${errorCount} 條`);
  
  return { successCount, errorCount };
}

async function main() {
  try {
    console.log('=== 立即同步所有案場資料 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取所有案場資料
    const sites = await fetchAllSites(corpId, accessToken, currentOpenUserId);
    
    // 同步到 D1
    const result = await syncToD1(sites);
    
    console.log('\n=== 同步完成 ===');
    console.log(`CRM 案場總數: ${sites.length}`);
    console.log(`成功同步: ${result.successCount}`);
    console.log(`同步失敗: ${result.errorCount}`);
    
  } catch (error) {
    console.error('\n❌ 同步失敗:', error.message);
    if (error.response?.data) {
      console.error('API 錯誤詳情:', error.response.data);
    }
  }
}

main();