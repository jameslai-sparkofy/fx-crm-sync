#!/usr/bin/env node
/**
 * 直接執行所有對象的欄位同步
 * 繞過API問題，直接使用CRM API
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

// 所有要同步的對象
const objects = [
  { apiName: 'object_8W9cb__c', displayName: '案場(SPC)', isCustom: true },
  { apiName: 'object_k1XqG__c', displayName: 'SPC維修單', isCustom: true },
  { apiName: 'object_50HJ8__c', displayName: '工地師父', isCustom: true },
  { apiName: 'site_cabinet__c', displayName: '案場(浴櫃)', isCustom: true },
  { apiName: 'progress_management_announ__c', displayName: '進度管理公告', isCustom: true },
  { apiName: 'NewOpportunityObj', displayName: '商機', isCustom: false },
  { apiName: 'SupplierObj', displayName: '供應商', isCustom: false }
];

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

async function getCRMFields(objectApiName, fxClient) {
  const isCustom = objectApiName.endsWith('__c');
  let fields = [];

  try {
    if (isCustom) {
      // 自定義對象 - 從實際數據推斷
      const queryResponse = await fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: objectApiName,
          search_query_info: {
            limit: 5,
            offset: 0,
            filters: []
          }
        }
      });
      
      if (queryResponse.errorCode === 0 && queryResponse.data?.dataList?.length > 0) {
        const allFields = new Set();
        queryResponse.data.dataList.forEach(record => {
          Object.keys(record).forEach(key => {
            if (key !== 'searchAfterId' && key !== 'total_num') {
              allFields.add(key);
            }
          });
        });
        
        fields = Array.from(allFields).map(key => {
          let sampleValue = null;
          for (const record of queryResponse.data.dataList) {
            if (record[key] != null) {
              sampleValue = record[key];
              break;
            }
          }
          
          return {
            apiName: key,
            label: formatFieldLabel(key),
            dataType: inferDataType(sampleValue),
            required: false,
            description: '',
            source: 'data_inference'
          };
        });
      }
    } else {
      // 標準對象
      const queryResponse = await fxClient.post('/cgi/crm/v2/data/query', {
        data: {
          dataObjectApiName: objectApiName,
          search_query_info: {
            limit: 5,
            offset: 0,
            filters: []
          }
        }
      });
      
      if (queryResponse.errorCode === 0 && queryResponse.data?.dataList?.length > 0) {
        const allFields = new Set();
        queryResponse.data.dataList.forEach(record => {
          Object.keys(record).forEach(key => {
            if (key !== 'searchAfterId' && key !== 'total_num') {
              allFields.add(key);
            }
          });
        });
        
        fields = Array.from(allFields).map(key => {
          let sampleValue = null;
          for (const record of queryResponse.data.dataList) {
            if (record[key] != null) {
              sampleValue = record[key];
              break;
            }
          }
          
          return {
            apiName: key,
            label: formatFieldLabel(key),
            dataType: inferDataType(sampleValue),
            required: false,
            description: '',
            source: 'data_inference'
          };
        });
      }
    }
    
    console.log(`✅ 從CRM獲取到 ${fields.length} 個欄位: ${objectApiName}`);
    return fields;
    
  } catch (error) {
    console.error(`❌ 獲取CRM欄位失敗 ${objectApiName}:`, error.message);
    return [];
  }
}

function formatFieldLabel(apiName) {
  return apiName
    .replace(/__c$/, '')
    .replace(/__r$/, '_關聯')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function inferDataType(value) {
  if (value === null || value === undefined) return 'TEXT';
  if (typeof value === 'number') return 'NUMBER';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (Array.isArray(value)) return 'MULTISELECT';
  if (typeof value === 'object') return 'OBJECT';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'DATETIME';
    if (/^\d+$/.test(value) && value.length > 10) return 'TIMESTAMP';
    return 'TEXT';
  }
  return 'TEXT';
}

// FxClient 模擬類
class FxClient {
  constructor(corpId, corpAccessToken, currentOpenUserId) {
    this.corpId = corpId;
    this.corpAccessToken = corpAccessToken;
    this.currentOpenUserId = currentOpenUserId;
  }
  
  async post(endpoint, data = {}) {
    const payload = {
      corpId: this.corpId,
      corpAccessToken: this.corpAccessToken,
      currentOpenUserId: this.currentOpenUserId,
      ...data
    };
    
    const response = await axios.post(`${baseUrl}${endpoint}`, payload);
    return response.data;
  }
}

async function syncAllFields() {
  console.log('='.repeat(60));
  console.log('開始同步所有對象欄位');
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

    // 3. 初始化客戶端
    const fxClient = new FxClient(corpId, corpAccessToken, currentOpenUserId);
    
    // 4. 處理每個對象
    const results = [];
    
    for (const obj of objects) {
      console.log(`\n🔄 處理對象: ${obj.displayName} (${obj.apiName})`);
      
      try {
        // 獲取CRM欄位
        const crmFields = await getCRMFields(obj.apiName, fxClient);
        
        if (crmFields.length > 0) {
          results.push({
            objectApiName: obj.apiName,
            displayName: obj.displayName,
            fieldCount: crmFields.length,
            success: true,
            fields: crmFields.map(f => ({
              apiName: f.apiName,
              label: f.label,
              dataType: f.dataType,
              required: f.required,
              description: f.description
            }))
          });
          
          console.log(`✅ ${obj.displayName}: ${crmFields.length} 個欄位`);
        } else {
          results.push({
            objectApiName: obj.apiName,
            displayName: obj.displayName,
            fieldCount: 0,
            success: false,
            error: '無法獲取欄位'
          });
          console.log(`❌ ${obj.displayName}: 無法獲取欄位`);
        }
        
      } catch (error) {
        console.error(`❌ ${obj.displayName} 處理失敗:`, error.message);
        results.push({
          objectApiName: obj.apiName,
          displayName: obj.displayName,
          fieldCount: 0,
          success: false,
          error: error.message
        });
      }
    }
    
    // 5. 輸出結果摘要
    console.log('\n' + '='.repeat(60));
    console.log('欄位同步結果摘要');
    console.log('='.repeat(60));
    
    const successCount = results.filter(r => r.success).length;
    const totalFields = results.reduce((sum, r) => sum + r.fieldCount, 0);
    
    console.log(`處理對象數: ${results.length}`);
    console.log(`成功: ${successCount}`);
    console.log(`失敗: ${results.length - successCount}`);
    console.log(`總欄位數: ${totalFields}`);
    
    console.log('\n詳細結果:');
    results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      console.log(`${status} ${r.displayName}: ${r.fieldCount} 個欄位`);
      if (!r.success) {
        console.log(`   錯誤: ${r.error}`);
      }
    });
    
    // 6. 導出結果到JSON文件
    const fs = require('fs');
    const outputFile = `field-sync-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 結果已導出到: ${outputFile}`);

  } catch (error) {
    console.error('❌ 欄位同步失敗:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('欄位同步任務完成');
  console.log('='.repeat(60));
}

// 執行同步
syncAllFields();