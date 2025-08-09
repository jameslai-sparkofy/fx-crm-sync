/**
 * 比較失敗和成功記錄的欄位差異
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

async function getFailedRecords(corpId, accessToken, currentOpenUserId) {
  // 獲取前 5 條失敗的記錄
  const failedIds = [
    '65effa8aa7f76f0001f078f8',
    '65effa8aa7f76f0001f078f9',
    '65effa8aa7f76f0001f078fa',
    '65effa8aa7f76f0001f078fb',
    '65effa8aa7f76f0001f078fc'
  ];
  
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: 0,
        limit: 5,
        filters: [{
          field_name: '_id',
          operator: 'IN',
          field_values: failedIds
        }]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  return response.data.data?.dataList || [];
}

async function getSuccessRecords(corpId, accessToken, currentOpenUserId) {
  // 獲取能成功同步的記錄（從 offset 2400 開始）
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: 2400,
        limit: 5,
        filters: [{
          field_name: 'life_status',
          operator: 'NEQ',
          field_values: ['作废']
        }],
        orders: [{ fieldName: '_id', isAsc: true }]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  return response.data.data?.dataList || [];
}

async function main() {
  try {
    console.log('=== 比較失敗和成功記錄的欄位差異 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取失敗和成功的記錄
    console.log('📊 獲取失敗的記錄（前 558 條中的）...');
    const failedRecords = await getFailedRecords(corpId, accessToken, currentOpenUserId);
    
    console.log('📊 獲取成功的記錄（offset 2400+ 的）...');
    const successRecords = await getSuccessRecords(corpId, accessToken, currentOpenUserId);
    
    if (failedRecords.length === 0 || successRecords.length === 0) {
      console.log('無法獲取足夠的記錄進行比較');
      return;
    }
    
    const failed = failedRecords[0];
    const success = successRecords[0];
    
    console.log('\n📋 基本信息:');
    console.log('失敗記錄:');
    console.log('  ID:', failed._id);
    console.log('  名稱:', failed.name);
    console.log('  創建時間:', new Date(failed.create_time).toISOString());
    console.log('  欄位數量:', Object.keys(failed).length);
    
    console.log('\n成功記錄:');
    console.log('  ID:', success._id);
    console.log('  名稱:', success.name);
    console.log('  創建時間:', new Date(success.create_time).toISOString());
    console.log('  欄位數量:', Object.keys(success).length);
    
    // 找出欄位差異
    const failedKeys = Object.keys(failed).sort();
    const successKeys = Object.keys(success).sort();
    
    const onlyInFailed = failedKeys.filter(k => !successKeys.includes(k));
    const onlyInSuccess = successKeys.filter(k => !failedKeys.includes(k));
    
    if (onlyInFailed.length > 0) {
      console.log('\n❌ 只在失敗記錄中存在的欄位:');
      onlyInFailed.forEach(k => {
        const val = failed[k];
        console.log(`  - ${k}: ${typeof val}${val === null ? ' (null)' : Array.isArray(val) ? ` array[${val.length}]` : ''}`);
        if (val !== null && val !== undefined) {
          console.log(`    值: ${JSON.stringify(val).substring(0, 100)}`);
        }
      });
    }
    
    if (onlyInSuccess.length > 0) {
      console.log('\n✅ 只在成功記錄中存在的欄位:');
      onlyInSuccess.forEach(k => {
        const val = success[k];
        console.log(`  - ${k}: ${typeof val}${val === null ? ' (null)' : Array.isArray(val) ? ` array[${val.length}]` : ''}`);
        if (val !== null && val !== undefined) {
          console.log(`    值: ${JSON.stringify(val).substring(0, 100)}`);
        }
      });
    }
    
    // 檢查 Worker INSERT 語句中使用的關鍵欄位
    console.log('\n🔍 檢查 Worker INSERT 使用的 44 個欄位:');
    const workerFields = [
      '_id', 'name', 'owner', 'owner__r', 'owner_department_id', 'owner_department',
      'create_time', 'created_by', 'created_by__r',
      'last_modified_time', 'last_modified_by', 'last_modified_by__r',
      'life_status', 'life_status__r', 'lock_status', 'lock_status__r',
      'is_deleted', 'record_type', 'version',
      'data_own_department', 'data_own_department__r',
      'relevant_team', 'total_num',
      'field_k7e6q__c', 'field_k7e6q__c__r', 'field_k7e6q__c__relation_ids',
      'field_1P96q__c', 'field_1P96q__c__r', 'field_1P96q__c__relation_ids',
      'field_npLvn__c', 'field_npLvn__c__r', 'field_npLvn__c__relation_ids',
      'field_WD7k1__c', 'field_XuJP2__c',
      'field_i2Q1g__c', 'field_tXAko__c', 'field_Q6Svh__c',
      'field_23Z5i__c', 'field_23Z5i__c__r',
      'field_dxr31__c', 'field_dxr31__c__r'
    ];
    
    console.log('\n失敗記錄中的欄位狀態:');
    let missingInFailed = 0;
    let differentTypeInFailed = 0;
    
    workerFields.forEach((field, index) => {
      const failedVal = failed[field];
      const successVal = success[field];
      
      if (!(field in failed)) {
        console.log(`  ❌ [${index + 1}] ${field}: 不存在於失敗記錄`);
        missingInFailed++;
      } else if (typeof failedVal !== typeof successVal) {
        console.log(`  ⚠️ [${index + 1}] ${field}: 類型不同`);
        console.log(`      失敗: ${typeof failedVal}${Array.isArray(failedVal) ? ' array' : ''}${failedVal === null ? ' null' : ''}`);
        console.log(`      成功: ${typeof successVal}${Array.isArray(successVal) ? ' array' : ''}${successVal === null ? ' null' : ''}`);
        differentTypeInFailed++;
      }
    });
    
    console.log(`\n📊 統計結果:`);
    console.log(`  缺失欄位: ${missingInFailed} 個`);
    console.log(`  類型不同: ${differentTypeInFailed} 個`);
    
    // 分析多條記錄的共同特徵
    if (failedRecords.length > 1) {
      console.log('\n🔄 分析多條失敗記錄的共同特徵:');
      
      const commonMissing = new Set(workerFields);
      failedRecords.forEach(record => {
        workerFields.forEach(field => {
          if (field in record) {
            commonMissing.delete(field);
          }
        });
      });
      
      if (commonMissing.size > 0) {
        console.log('  所有失敗記錄都缺少的欄位:');
        Array.from(commonMissing).forEach(field => {
          console.log(`    - ${field}`);
        });
      }
    }
    
    console.log('\n💡 結論:');
    if (missingInFailed > 0) {
      console.log('  ❌ 失敗記錄缺少某些必要欄位，這可能是因為:');
      console.log('     1. CRM 在 2024年3-4月後新增了這些欄位');
      console.log('     2. 舊記錄沒有這些欄位的值');
      console.log('     3. Worker 的 INSERT 語句期望所有 44 個欄位都有值');
    }
    
    if (differentTypeInFailed > 0) {
      console.log('  ⚠️ 某些欄位的數據類型不一致，需要在 Worker 中做類型轉換');
    }
    
  } catch (error) {
    console.error('\n❌ 分析失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();