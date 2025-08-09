/**
 * 找出在 CRM 中但不在 D1 中的記錄
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

async function getAllCRMIds(corpId, accessToken, currentOpenUserId) {
  const allIds = [];
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
    records.forEach(r => allIds.push(r._id));
    
    process.stdout.write(`\r已獲取 ${allIds.length} 條記錄`);
    
    if (records.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  console.log(`\n總共獲取 ${allIds.length} 條 CRM 記錄`);
  return allIds;
}

async function getD1Ids() {
  // 獲取 D1 中的所有 ID
  // 由於無法直接查詢，我們通過 API 獲取統計信息
  const response = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/api/crud/object_8W9cb__c', {
    params: {
      pageSize: 1000,
      page: 1
    }
  });
  
  if (response.data.success) {
    return response.data.data.records.map(r => r._id);
  }
  
  return [];
}

async function getRecordDetails(corpId, accessToken, currentOpenUserId, recordId) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/get`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      objectDataId: recordId
    }
  });

  if (response.data.errorCode !== 0) {
    return null;
  }

  return response.data.data?.data;
}

async function main() {
  try {
    console.log('=== 查找缺失的記錄 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取所有 CRM ID
    const crmIds = await getAllCRMIds(corpId, accessToken, currentOpenUserId);
    const crmIdSet = new Set(crmIds);
    
    // 嘗試獲取 D1 ID（這個可能需要多次請求）
    console.log('\n檢查 D1 資料庫...');
    let d1Ids = [];
    
    // 通過批量檢查來找出缺失的記錄
    console.log('\n分析缺失的記錄...');
    
    // 檢查前 100 個 CRM 記錄
    const sampleSize = Math.min(100, crmIds.length);
    const missingRecords = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const recordId = crmIds[i];
      
      // 嘗試從 D1 獲取此記錄
      try {
        const response = await axios.get(
          `https://fx-crm-sync.lai-jameslai.workers.dev/api/crud/object_8W9cb__c/${recordId}`,
          { timeout: 5000 }
        );
        
        if (!response.data.success) {
          missingRecords.push(recordId);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          missingRecords.push(recordId);
        }
      }
      
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\r檢查進度: ${i + 1}/${sampleSize}`);
      }
    }
    
    console.log(`\n\n發現 ${missingRecords.length} 條缺失記錄`);
    
    if (missingRecords.length > 0) {
      console.log('\n分析缺失記錄的特徵...\n');
      
      // 獲取前5條缺失記錄的詳情
      for (let i = 0; i < Math.min(5, missingRecords.length); i++) {
        const recordId = missingRecords[i];
        const record = await getRecordDetails(corpId, accessToken, currentOpenUserId, recordId);
        
        if (record) {
          console.log(`\n記錄 ${i + 1}:`);
          console.log(`- ID: ${record._id}`);
          console.log(`- 名稱: ${record.name}`);
          console.log(`- 創建時間: ${new Date(record.create_time).toISOString()}`);
          console.log(`- 最後修改: ${new Date(record.last_modified_time).toISOString()}`);
          console.log(`- 生命狀態: ${record.life_status}`);
          console.log(`- 欄位數量: ${Object.keys(record).length}`);
          
          // 檢查特殊字符
          const hasSpecialChars = JSON.stringify(record).match(/[\x00-\x1F\x7F]/);
          if (hasSpecialChars) {
            console.log(`- ⚠️ 包含特殊字符`);
          }
          
          // 檢查超長文本
          for (const [key, value] of Object.entries(record)) {
            if (typeof value === 'string' && value.length > 1000) {
              console.log(`- ⚠️ ${key} 欄位過長: ${value.length} 字符`);
            }
          }
        }
      }
    }
    
    // 統計分析
    console.log('\n=== 統計分析 ===');
    console.log(`CRM 總記錄數: ${crmIds.length}`);
    console.log(`檢查樣本數: ${sampleSize}`);
    console.log(`缺失記錄數: ${missingRecords.length}`);
    console.log(`缺失比例: ${(missingRecords.length / sampleSize * 100).toFixed(1)}%`);
    
    if (crmIds.length > 0) {
      console.log(`\n預估總缺失數: ${Math.round(missingRecords.length / sampleSize * crmIds.length)} 條`);
    }
    
  } catch (error) {
    console.error('\n❌ 分析失敗:', error.message);
    if (error.response?.data) {
      console.error('API 錯誤詳情:', error.response.data);
    }
  }
}

main();