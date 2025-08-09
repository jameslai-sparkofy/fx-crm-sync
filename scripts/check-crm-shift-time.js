#!/usr/bin/env node
/**
 * 檢查 CRM 中的 shift_time 資料
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

async function checkCRMShiftTime() {
  console.log('='.repeat(80));
  console.log('檢查 CRM 中的 shift_time 資料');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 獲取前 100 條案場數據
    console.log('\n2. 獲取 CRM 案場數據...');
    const response = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 100,
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

    const sites = response.data.data.dataList || [];
    console.log(`  獲取到 ${sites.length} 條記錄`);

    // 3. 分析 shift_time 欄位
    console.log('\n3. 分析 shift_time 欄位...');
    let hasShiftTimeC = 0;
    let hasShiftTimeV = 0;
    let examples = [];

    sites.forEach(site => {
      if (site.shift_time__c) hasShiftTimeC++;
      if (site.shift_time__c__v) hasShiftTimeV++;
      
      if (site.shift_time__c && examples.length < 5) {
        examples.push({
          _id: site._id,
          name: site.name,
          shift_time__c: site.shift_time__c,
          shift_time__c__v: site.shift_time__c__v
        });
      }
    });

    console.log(`  有 shift_time__c 的記錄: ${hasShiftTimeC}/${sites.length}`);
    console.log(`  有 shift_time__c__v 的記錄: ${hasShiftTimeV}/${sites.length}`);

    // 4. 顯示範例
    if (examples.length > 0) {
      console.log('\n4. 範例記錄:');
      examples.forEach((example, index) => {
        console.log(`\n  記錄 ${index + 1}:`);
        console.log(`    _id: ${example._id}`);
        console.log(`    name: ${example.name}`);
        console.log(`    shift_time__c: ${example.shift_time__c}`);
        console.log(`    shift_time__c__v: ${example.shift_time__c__v}`);
      });
    }

    // 5. 檢查所有欄位名稱
    console.log('\n5. 檢查第一條記錄的所有欄位...');
    if (sites.length > 0) {
      const firstSite = sites[0];
      const shiftFields = Object.keys(firstSite).filter(key => key.toLowerCase().includes('shift'));
      console.log(`  找到的 shift 相關欄位: ${shiftFields.join(', ')}`);
      
      // 顯示這些欄位的值
      shiftFields.forEach(field => {
        const value = firstSite[field];
        console.log(`    ${field}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      });
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('檢查完成');
  console.log('='.repeat(80));
}

// 執行檢查
checkCRMShiftTime();