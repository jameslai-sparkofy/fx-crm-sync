#!/usr/bin/env node

/**
 * 查詢特定記錄 24-12-11-2895 的 shift_time__c 值
 */

const fetch = require('node-fetch');

const FXIAOKE_BASE_URL = 'https://open.fxiaoke.com';
const credentials = {
  appId: 'FSAID_1320691',
  appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4', 
  permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  const response = await fetch(`${FXIAOKE_BASE_URL}/cgi/corpAccessToken/get/V2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${data.errorMessage}`);
  }
  
  return {
    corpId: data.corpId,
    corpAccessToken: data.corpAccessToken
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await fetch(`${FXIAOKE_BASE_URL}/cgi/user/getByMobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      corpId: corpId,
      corpAccessToken: accessToken,
      mobile: "17675662629"
    })
  });
  
  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`獲取用戶 ID 失敗: ${data.errorMessage}`);
  }
  
  return data.empList?.[0]?.openUserId || data.userId;
}

async function checkRecord() {
  console.log('查詢記錄 24-12-11-2895 的資料...\n');
  
  try {
    // 1. 獲取認證
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    
    console.log('✅ 認證成功\n');
    
    // 2. 查詢特定記錄
    const response = await fetch(`${FXIAOKE_BASE_URL}/cgi/crm/custom/v2/data/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: corpId,
        corpAccessToken: corpAccessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            limit: 1,
            offset: 0,
            filters: [
              {
                field_name: 'name',
                operator: 'EQ',
                field_values: ['24-12-11-2895']
              }
            ]
          }
        }
      })
    });
    
    const result = await response.json();
    
    if (result.errorCode !== 0) {
      console.error('查詢失敗:', result.errorMessage);
      return;
    }
    
    const records = result.data?.dataList || [];
    
    if (records.length === 0) {
      console.log('❌ 找不到記錄 24-12-11-2895');
      
      // 嘗試模糊搜尋
      console.log('\n嘗試模糊搜尋包含 2895 的記錄...');
      const fuzzyResponse = await fetch(`${FXIAOKE_BASE_URL}/cgi/crm/custom/v2/data/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: corpId,
          corpAccessToken: corpAccessToken,
          currentOpenUserId: currentOpenUserId,
          data: {
            dataObjectApiName: 'object_8W9cb__c',
            search_query_info: {
              limit: 5,
              offset: 0,
              filters: [
                {
                  field_name: 'name',
                  operator: 'LIKE',
                  field_values: ['%2895%']
                }
              ]
            }
          }
        })
      });
      
      const fuzzyResult = await fuzzyResponse.json();
      const fuzzyRecords = fuzzyResult.data?.dataList || [];
      
      if (fuzzyRecords.length > 0) {
        console.log(`找到 ${fuzzyRecords.length} 筆相關記錄:`);
        fuzzyRecords.forEach(r => {
          console.log(`  - ${r.name}: shift_time__c = ${r.shift_time__c || '(空)'}`);
        });
      }
      
    } else {
      const record = records[0];
      console.log('✅ 找到記錄！\n');
      console.log('====================================');
      console.log(`編號: ${record.name}`);
      console.log(`shift_time__c (工班): ${record.shift_time__c || '(空值)'}`);
      console.log('====================================\n');
      
      // 顯示其他相關欄位
      console.log('其他欄位:');
      console.log(`- _id: ${record._id}`);
      console.log(`- 棟別: ${record.field_WD7k1__c || 'A'}棟`);
      console.log(`- 樓層: ${record.field_Q6Svh__c || ''}樓`);
      console.log(`- 戶別: ${record.field_XuJP2__c || ''}`);
      console.log(`- 工班師父: ${record.field_u1wpv__c || ''}`);
      console.log(`- 施工完成: ${record.construction_completed__c ? '是' : '否'}`);
      console.log(`- 最後修改時間: ${new Date(record.last_modified_time).toLocaleString('zh-TW')}`);
      
      // 列出所有包含值的欄位
      console.log('\n所有非空欄位:');
      Object.entries(record).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && value !== false) {
          if (key.includes('shift') || key === 'field_u1wpv__c') {
            console.log(`  ✅ ${key}: ${value}`);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('執行失敗:', error.message);
  }
}

// 執行查詢
checkRecord();