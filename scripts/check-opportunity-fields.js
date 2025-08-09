#!/usr/bin/env node
/**
 * 檢查商機對象的實際CRM欄位
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

async function checkOpportunityFields() {
  console.log('='.repeat(60));
  console.log('檢查商機對象的CRM欄位');
  console.log('='.repeat(60));

  try {
    // 1. 獲取認證
    console.log('\n1. 獲取訪問令牌...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ 認證成功');

    // 2. 查詢商機數據來獲取實際欄位
    console.log('\n2. 查詢商機數據...');
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
    console.log(`✅ 獲取到 ${records.length} 條商機記錄`);

    if (records.length === 0) {
      console.log('⚠️ 沒有商機數據，無法分析欄位');
      return;
    }

    // 3. 分析所有欄位
    console.log('\n3. 分析商機欄位...');
    const allFields = new Set();
    records.forEach(record => {
      Object.keys(record).forEach(key => {
        if (key !== 'searchAfterId' && key !== 'total_num') {
          allFields.add(key);
        }
      });
    });

    const fieldsList = Array.from(allFields).sort();
    console.log(`總欄位數: ${fieldsList.length}`);

    // 4. 檢查是否有浴櫃相關欄位
    console.log('\n4. 查找浴櫃相關欄位...');
    const bathCabinetFields = fieldsList.filter(field => 
      field.toLowerCase().includes('bath') ||
      field.toLowerCase().includes('cabinet') ||
      field.includes('浴櫃') ||
      field.includes('147x8') ||
      field.includes('8EB1')
    );

    if (bathCabinetFields.length > 0) {
      console.log('✅ 找到浴櫃相關欄位:');
      bathCabinetFields.forEach(field => {
        const sampleValue = records.find(r => r[field] != null)?.[field];
        console.log(`  - ${field}: ${JSON.stringify(sampleValue)}`);
      });
    } else {
      console.log('❌ 未找到浴櫃相關欄位');
    }

    // 5. 顯示所有欄位（前30個）
    console.log('\n5. 商機對象所有欄位（前30個）:');
    fieldsList.slice(0, 30).forEach((field, index) => {
      const sampleValue = records.find(r => r[field] != null)?.[field];
      let displayValue = '';
      if (sampleValue !== undefined) {
        displayValue = typeof sampleValue === 'object' ? 
          JSON.stringify(sampleValue).substring(0, 50) + '...' : 
          String(sampleValue).substring(0, 50);
      }
      console.log(`  ${index + 1}. ${field}: ${displayValue}`);
    });

    if (fieldsList.length > 30) {
      console.log(`  ... 還有 ${fieldsList.length - 30} 個欄位`);
    }

    // 6. 檢查特定的price相關欄位
    console.log('\n6. 查找價格相關欄位...');
    const priceFields = fieldsList.filter(field => 
      field.toLowerCase().includes('price') ||
      field.toLowerCase().includes('amount') ||
      field.includes('價格') ||
      field.includes('金額') ||
      field.includes('費用')
    );

    if (priceFields.length > 0) {
      console.log('💰 找到價格相關欄位:');
      priceFields.forEach(field => {
        const sampleValue = records.find(r => r[field] != null)?.[field];
        console.log(`  - ${field}: ${JSON.stringify(sampleValue)}`);
      });
    } else {
      console.log('❌ 未找到價格相關欄位');
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('檢查完成');
  console.log('='.repeat(60));
}

// 執行檢查
checkOpportunityFields();