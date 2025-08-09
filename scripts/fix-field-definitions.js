#!/usr/bin/env node
/**
 * 修復欄位定義更新問題
 * 直接通過 CRM API 獲取真實欄位並更新到資料庫
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
  return response.data.empList[0].openUserId;
}

async function getCRMFieldsForOpportunity(corpId, corpAccessToken, currentOpenUserId) {
  console.log('\n🔍 獲取商機對象的真實 CRM 欄位...');
  
  try {
    const queryResponse = await axios.post(`${baseUrl}/cgi/crm/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'NewOpportunityObj',
        search_query_info: {
          limit: 10,
          offset: 0,
          filters: []
        }
      }
    });

    if (queryResponse.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${queryResponse.data.errorMessage}`);
    }

    const records = queryResponse.data.data.dataList || [];
    console.log(`  獲取到 ${records.length} 條商機記錄`);

    if (records.length === 0) {
      throw new Error('沒有商機數據');
    }

    // 分析實際存在的欄位
    const fieldSet = new Set();
    records.forEach(record => {
      Object.keys(record).forEach(key => {
        if (key !== 'searchAfterId' && key !== 'total_num') {
          fieldSet.add(key);
        }
      });
    });

    const fields = Array.from(fieldSet).sort();
    console.log(`  分析得到 ${fields.length} 個實際欄位`);
    
    // 檢查是否有浴櫃相關欄位
    const bathCabinetFields = fields.filter(f => 
      f.includes('147x8') || 
      f.includes('8EB') ||
      f.toLowerCase().includes('cabinet') ||
      f.includes('浴櫃')
    );
    
    if (bathCabinetFields.length > 0) {
      console.log('  ❌ 發現浴櫃相關欄位:', bathCabinetFields);
    } else {
      console.log('  ✅ 確認沒有浴櫃相關欄位');
    }

    return fields;

  } catch (error) {
    console.log('  ❌ 獲取 CRM 欄位失敗:', error.message);
    throw error;
  }
}

async function updateFieldDefinitionsThroughAPI(realFields) {
  console.log('\n🔧 透過 Worker API 更新欄位定義...');
  
  const workerUrl = 'https://fx-crm-sync.lai-jameslai.workers.dev';
  
  try {
    // 1. 先清空商機的舊欄位定義
    console.log('  清空舊的商機欄位定義...');
    const deleteSQL = `DELETE FROM fx_field_definitions WHERE object_api_name = 'NewOpportunityObj'`;
    
    try {
      await axios.post(`${workerUrl}/api/debug/execute-sql`, {
        sql: deleteSQL
      });
      console.log('  ✅ 清空成功');
    } catch (error) {
      console.log('  ⚠️ 清空失敗，繼續執行:', error.message);
    }
    
    // 2. 插入真實的欄位定義
    console.log('  插入真實欄位定義...');
    const fieldValues = realFields.map(field => 
      `('NewOpportunityObj', '${field}', '${field}', 'TEXT', 'Real CRM field', 0, datetime('now'))`
    ).join(',\n');
    
    const insertSQL = `INSERT INTO fx_field_definitions 
      (object_api_name, field_api_name, field_label, field_type, field_description, is_required, created_at) 
      VALUES ${fieldValues}`;
    
    const insertResponse = await axios.post(`${workerUrl}/api/debug/execute-sql`, {
      sql: insertSQL
    });
    
    if (insertResponse.data.success) {
      console.log(`  ✅ 插入 ${realFields.length} 個真實欄位成功`);
      return true;
    } else {
      console.log('  ❌ 插入失敗:', insertResponse.data.error);
      return false;
    }
    
  } catch (error) {
    console.log('  ❌ API 更新失敗:', error.message);
    return false;
  }
}

async function checkShiftTimeField() {
  console.log('\n🔍 檢查 shift_time__c__r 欄位同步狀況...');
  
  try {
    // 檢查 D1 資料庫中的 shift_time__c__r 欄位值
    const workerUrl = 'https://fx-crm-sync.lai-jameslai.workers.dev';
    
    const checkSQL = `SELECT 
      COUNT(*) as total_records,
      COUNT(shift_time__c__r) as non_null_count,
      COUNT(shift_time__c) as shift_time_count
      FROM object_8W9cb__c 
      LIMIT 1`;
    
    const response = await axios.post(`${workerUrl}/api/debug/execute-sql`, {
      sql: checkSQL
    });
    
    if (response.data.success) {
      const result = response.data.data.results[0];
      console.log(`  總記錄數: ${result.total_records}`);
      console.log(`  shift_time__c__r 非 null 數: ${result.non_null_count}`);
      console.log(`  shift_time__c 非 null 數: ${result.shift_time_count}`);
      
      if (result.non_null_count === 0) {
        console.log('  ❌ shift_time__c__r 欄位確實都是 null，需要重新同步');
        return false;
      } else {
        console.log('  ✅ shift_time__c__r 欄位有數據');
        return true;
      }
    } else {
      console.log('  ❌ 檢查失敗:', response.data.error);
      return false;
    }
    
  } catch (error) {
    console.log('  ❌ 檢查異常:', error.message);
    return false;
  }
}

async function fixFieldDefinitions() {
  console.log('='.repeat(80));
  console.log('修復欄位定義和同步問題');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 獲取商機對象的真實欄位
    const realFields = await getCRMFieldsForOpportunity(corpId, corpAccessToken, currentOpenUserId);

    // 3. 更新欄位定義到資料庫
    const updateSuccess = await updateFieldDefinitionsThroughAPI(realFields);
    
    if (updateSuccess) {
      console.log('\n✅ 欄位定義更新成功');
    } else {
      console.log('\n❌ 欄位定義更新失敗');
    }

    // 4. 檢查 shift_time 欄位問題
    const shiftTimeOK = await checkShiftTimeField();
    
    if (!shiftTimeOK) {
      console.log('\n⚠️ shift_time__c__r 欄位需要重新同步');
      console.log('建議執行: node sync-all-data.js');
    }

    // 5. 最終驗證建議
    console.log('\n📋 驗證步驟:');
    console.log('1. 重新整理網頁: https://fx-crm-sync.lai-jameslai.workers.dev/');
    console.log('2. 檢查商機對象是否還有"浴櫃價格"欄位');
    console.log('3. 確認所有欄位都是真實 CRM 數據');

  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('修復任務完成');
  console.log('='.repeat(80));
}

// 執行修復
fixFieldDefinitions();