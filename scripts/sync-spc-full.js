#!/usr/bin/env node
/**
 * 完整同步案場(SPC)數據，包含所有欄位
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  const response = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, credentials);
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${response.data.errorMessage}`);
  }
  return {
    corpId: response.data.corpId,
    corpAccessToken: response.data.corpAccessToken
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
    corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"
  });
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取用戶 ID 失敗: ${response.data.errorMessage}`);
  }
  // 檢查返回的數據結構
  if (!response.data.empList || response.data.empList.length === 0) {
    console.log('Response:', JSON.stringify(response.data, null, 2));
    throw new Error('無法獲取用戶數據');
  }
  return response.data.empList[0].openUserId;
}

async function syncSPCData() {
  console.log('='.repeat(60));
  console.log('開始同步案場(SPC)完整數據');
  console.log('='.repeat(60));

  try {
    // 1. 獲取認證
    console.log('\n1. 獲取訪問令牌...');
    const { corpId, corpAccessToken } = await getAccessToken();
    console.log('✅ 成功獲取訪問令牌');

    // 2. 獲取用戶 ID
    console.log('\n2. 獲取當前用戶 ID...');
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log(`✅ 當前用戶 ID: ${currentOpenUserId}`);

    // 3. 查詢一條完整的 SPC 記錄
    console.log('\n3. 獲取案場數據...');
    const queryResponse = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 5,
          offset: 0,
          filters: [
            {
              field_name: 'life_status',
              operator: 'NEQ',
              field_values: ['作废']
            }
          ],
          orders: [
            {
              fieldName: 'last_modified_time',
              isAsc: false
            }
          ]
        }
      }
    });

    if (queryResponse.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${queryResponse.data.errorMessage}`);
    }

    const records = queryResponse.data.data.dataList;
    console.log(`✅ 獲取到 ${records.length} 條記錄`);

    // 4. 分析欄位
    if (records.length > 0) {
      const firstRecord = records[0];
      console.log('\n4. 第一條記錄的完整欄位:');
      console.log('-'.repeat(60));
      
      const fields = Object.keys(firstRecord).sort();
      console.log(`總欄位數: ${fields.length}`);
      
      // 檢查關鍵欄位
      const keyFields = [
        'shift_time__c',
        'field_3T38o__c',
        'field_u1wpv__c',
        'field_27g6n__c',
        'field_23pFq__c',
        'field_23Z5i__c',
        'field_1P96q__c'
      ];
      
      console.log('\n關鍵欄位檢查:');
      keyFields.forEach(field => {
        if (firstRecord[field] !== undefined) {
          const value = firstRecord[field];
          const displayValue = typeof value === 'object' ? 
            JSON.stringify(value).substring(0, 50) : 
            String(value).substring(0, 50);
          console.log(`✅ ${field}: ${displayValue}`);
        } else {
          console.log(`❌ ${field}: 未找到`);
        }
      });
      
      // 顯示所有欄位名稱
      console.log('\n所有欄位列表:');
      fields.forEach((field, index) => {
        console.log(`  ${index + 1}. ${field}`);
      });
      
      // 準備同步到 D1
      console.log('\n5. 準備同步到 D1 資料庫...');
      console.log('調用 Worker API: https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/batch');
      
      // 這裡可以調用 Worker API 來執行實際的同步
      const syncResponse = await axios.post(
        'https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/batch',
        {
          records: records,
          includeAllFields: true
        }
      );
      
      if (syncResponse.data.success) {
        console.log(`✅ 成功同步 ${syncResponse.data.data.synced} 條記錄`);
      } else {
        console.log(`❌ 同步失敗: ${syncResponse.data.error}`);
      }
    }

  } catch (error) {
    console.error('❌ 同步失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('同步任務完成');
  console.log('='.repeat(60));
}

// 執行同步
syncSPCData();