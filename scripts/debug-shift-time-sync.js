#!/usr/bin/env node
/**
 * 調試 shift_time 同步問題
 */

require('dotenv').config();
const axios = require('axios');
const DynamicFieldHandler = require('../workers/src/sync/dynamic-field-handler');

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

async function debugShiftTimeSync() {
  console.log('='.repeat(80));
  console.log('調試 shift_time 同步問題');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 獲取一條有 shift_time 的記錄
    console.log('\n2. 獲取有 shift_time 的記錄...');
    const response = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 1,
          offset: 0,
          filters: [
            {
              field_name: 'name',
              operator: 'EQ',
              field_values: ['25-07-14-3556']
            }
          ]
        }
      }
    });

    if (response.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${response.data.errorMessage}`);
    }

    const sites = response.data.data.dataList || [];
    if (sites.length === 0) {
      console.log('❌ 找不到記錄');
      return;
    }

    const site = sites[0];
    console.log('✅ 找到記錄:');
    console.log(`  _id: ${site._id}`);
    console.log(`  name: ${site.name}`);
    console.log(`  shift_time__c: ${site.shift_time__c}`);
    console.log(`  shift_time__c__v: ${site.shift_time__c__v}`);

    // 3. 測試動態處理器
    console.log('\n3. 測試動態處理器...');
    const handler = new DynamicFieldHandler();
    
    // 提取欄位
    const fields = handler.extractFieldsFromData([site]);
    console.log(`\n  提取到 ${fields.length} 個欄位`);
    
    // 添加 shift_time 相關欄位
    if (!fields.includes('shift_time__c__r')) {
      fields.push('shift_time__c__r');
      console.log('  添加 shift_time__c__r');
    }
    if (!fields.includes('shift_time__c__relation_ids')) {
      fields.push('shift_time__c__relation_ids');
      console.log('  添加 shift_time__c__relation_ids');
    }

    // 處理每個欄位的值
    console.log('\n4. 處理 shift_time 相關欄位值...');
    const shiftFields = fields.filter(f => f.includes('shift'));
    shiftFields.forEach(field => {
      const value = handler.processFieldValue(field, site[field], site);
      console.log(`  ${field}:`);
      console.log(`    原始值: ${site[field]}`);
      console.log(`    處理後: ${value}`);
    });

    // 生成 SQL
    console.log('\n5. 生成 SQL...');
    const sql = handler.generateInsertSQL('object_8w9cb__c', fields);
    console.log('  SQL 語句（前 200 字符）:');
    console.log('  ' + sql.substring(0, 200) + '...');
    
    // 顯示欄位順序
    console.log('\n6. 欄位順序:');
    fields.forEach((field, index) => {
      if (field.includes('shift')) {
        console.log(`  位置 ${index + 1}: ${field}`);
      }
    });

    // 測試綁定數據
    console.log('\n7. 測試綁定數據...');
    const values = [];
    fields.forEach(field => {
      const value = handler.processFieldValue(field, site[field], site);
      values.push(value);
    });
    
    // 顯示 shift_time 相關的綁定值
    fields.forEach((field, index) => {
      if (field.includes('shift')) {
        console.log(`  ${field} (位置 ${index + 1}): ${values[index]}`);
      }
    });

  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('調試完成');
  console.log('='.repeat(80));
}

// 執行調試
debugShiftTimeSync();