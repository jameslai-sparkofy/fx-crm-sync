#!/usr/bin/env node
/**
 * 檢查 CRM 中案場的 shift_time__c 相關欄位
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

async function checkShiftTimeFields() {
  console.log('='.repeat(80));
  console.log('檢查 CRM 中案場的 shift_time__c 相關欄位');
  console.log('='.repeat(80));

  try {
    // 1. 獲取訪問令牌
    console.log('\n1. 獲取訪問令牌...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ 認證成功');

    // 2. 查詢案場數據
    console.log('\n2. 查詢案場數據...');
    const queryResponse = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
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
    console.log(`✅ 獲取到 ${records.length} 條案場記錄`);

    if (records.length === 0) {
      console.log('⚠️ 沒有案場數據');
      return;
    }

    // 3. 分析 shift_time 相關欄位
    console.log('\n3. 分析 shift_time 相關欄位...');
    
    // 查找所有包含 shift 的欄位
    const allFields = new Set();
    const shiftFields = new Set();
    
    records.forEach(record => {
      Object.keys(record).forEach(key => {
        allFields.add(key);
        if (key.toLowerCase().includes('shift')) {
          shiftFields.add(key);
        }
      });
    });

    console.log(`\n總欄位數: ${allFields.size}`);
    console.log(`shift 相關欄位數: ${shiftFields.size}`);

    if (shiftFields.size > 0) {
      console.log('\n✅ 找到 shift 相關欄位:');
      Array.from(shiftFields).sort().forEach(field => {
        // 找一個有值的樣本
        const sampleRecord = records.find(r => r[field] != null);
        if (sampleRecord) {
          const value = sampleRecord[field];
          console.log(`  ${field}: ${JSON.stringify(value)}`);
        } else {
          console.log(`  ${field}: (所有記錄都是 null)`);
        }
      });
    } else {
      console.log('\n❌ 沒有找到 shift 相關欄位');
    }

    // 4. 統計 shift_time__c 的填寫率
    console.log('\n4. 統計 shift_time__c 欄位...');
    
    const shiftTimeField = 'shift_time__c';
    const shiftTimeRField = 'shift_time__c__r';
    
    let hasShiftTime = 0;
    let hasShiftTimeR = 0;
    
    records.forEach(record => {
      if (record[shiftTimeField] != null) {
        hasShiftTime++;
      }
      if (record[shiftTimeRField] != null) {
        hasShiftTimeR++;
      }
    });

    console.log(`  shift_time__c 有值: ${hasShiftTime}/${records.length}`);
    console.log(`  shift_time__c__r 有值: ${hasShiftTimeR}/${records.length}`);

    // 5. 顯示有 shift_time 的記錄範例
    console.log('\n5. 有 shift_time 的記錄範例:');
    const sampleWithShift = records.find(r => r[shiftTimeField] != null || r[shiftTimeRField] != null);
    
    if (sampleWithShift) {
      console.log(`  案場名稱: ${sampleWithShift.name}`);
      console.log(`  shift_time__c: ${JSON.stringify(sampleWithShift[shiftTimeField])}`);
      console.log(`  shift_time__c__r: ${JSON.stringify(sampleWithShift[shiftTimeRField])}`);
      
      // 檢查是否有其他相關欄位
      const relatedFields = ['shift_time__c__v', 'shift_time__c__l', 'shift_time__c__relation_ids'];
      relatedFields.forEach(field => {
        if (sampleWithShift[field] !== undefined) {
          console.log(`  ${field}: ${JSON.stringify(sampleWithShift[field])}`);
        }
      });
    } else {
      console.log('  ❌ 沒有找到有 shift_time 值的記錄');
    }

    // 6. 檢查欄位值的類型
    console.log('\n6. 檢查欄位值的類型:');
    const firstRecord = records[0];
    ['shift_time__c', 'shift_time__c__r', 'shift_time__c__v'].forEach(field => {
      if (firstRecord[field] !== undefined) {
        const value = firstRecord[field];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  ${field}: ${type}`);
        if (value != null) {
          console.log(`    範例值: ${JSON.stringify(value).substring(0, 100)}`);
        }
      }
    });

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
checkShiftTimeFields();