#!/usr/bin/env node
/**
 * 測試動態欄位同步功能
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

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
  return response.data.empList[0].openUserId;
}

async function testDynamicSync() {
  console.log('='.repeat(80));
  console.log('測試動態欄位同步');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 獲取一小批案場數據來測試
    console.log('\n2. 獲取測試數據...');
    const response = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 5,  // 只取5條測試
          offset: 0,
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

    const testData = response.data.data.dataList || [];
    console.log(`  獲取到 ${testData.length} 條測試數據`);

    if (testData.length > 0) {
      // 3. 分析欄位
      console.log('\n3. 分析欄位結構...');
      const firstRecord = testData[0];
      const fields = Object.keys(firstRecord);
      console.log(`  發現 ${fields.length} 個欄位`);
      
      // 顯示一些特殊欄位
      console.log('\n  特殊欄位檢查:');
      console.log(`    shift_time__c: ${firstRecord.shift_time__c || 'null'}`);
      console.log(`    shift_time__c__v: ${firstRecord.shift_time__c__v || 'null'}`);
      console.log(`    field_23Z5i__c: ${firstRecord.field_23Z5i__c || 'null'}`);
      
      // 找出所有 __c 結尾的自定義欄位
      const customFields = fields.filter(f => f.endsWith('__c'));
      console.log(`\n  自定義欄位 (${customFields.length} 個):`);
      customFields.slice(0, 10).forEach(field => {
        console.log(`    - ${field}: ${typeof firstRecord[field]}`);
      });

      // 4. 觸發同步測試
      console.log('\n4. 觸發動態同步測試...');
      const syncResponse = await axios.post(
        `${WORKER_URL}/api/sync/object_8W9cb__c/start`,
        { 
          testMode: true,
          limit: 5
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (syncResponse.data.success) {
        console.log('  ✅ 同步觸發成功');
        console.log('  結果:', syncResponse.data.data);
      } else {
        console.log('  ❌ 同步失敗:', syncResponse.data.error);
      }

      // 5. 檢查數據庫中的欄位
      console.log('\n5. 檢查數據庫欄位...');
      const checkResponse = await axios.get(`${WORKER_URL}/api/debug/table-info/object_8W9cb__c`);
      
      if (checkResponse.data.success) {
        const columns = checkResponse.data.data.columns || [];
        console.log(`  數據庫中有 ${columns.length} 個欄位`);
        
        // 檢查 shift_time 相關欄位
        const shiftColumns = columns.filter(c => c.includes('shift'));
        console.log('\n  shift_time 相關欄位:');
        shiftColumns.forEach(col => console.log(`    - ${col}`));
      }
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('測試完成');
  console.log('='.repeat(80));
}

// 執行測試
testDynamicSync();