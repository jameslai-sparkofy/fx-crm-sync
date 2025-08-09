#!/usr/bin/env node

/**
 * 測試欄位驗證功能
 * 
 * 功能：
 * 1. 檢查 CRM 和 D1 的欄位差異
 * 2. 列出缺失和多餘的欄位
 * 3. 模擬欄位同步過程
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function testFieldValidation() {
  console.log('====================================');
  console.log('測試欄位驗證功能');
  console.log('====================================\n');
  
  const objects = [
    { name: 'object_8W9cb__c', label: '案場(SPC)' },
    { name: 'object_k1XqG__c', label: 'SPC維修單' },
    { name: 'object_50HJ8__c', label: '工地師父' },
    { name: 'site_cabinet__c', label: '案場(浴櫃)' },
    { name: 'NewOpportunityObj', label: '商機' }
  ];
  
  for (const obj of objects) {
    console.log(`\n檢查 ${obj.label} (${obj.name})...`);
    console.log('----------------------------------------');
    
    try {
      // 1. 呼叫欄位驗證 API
      const response = await fetch(`${API_BASE_URL}/api/sync/validate-fields/${obj.name}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log(`❌ API 返回錯誤: ${response.status}`);
        continue;
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ CRM 欄位數: ${result.data?.crmFieldCount || 0}`);
        console.log(`✅ D1 欄位數: ${result.data?.d1FieldCount || 0}`);
        
        if (result.data?.missingFields?.length > 0) {
          console.log(`⚠️  缺失欄位 (${result.data.missingFields.length}):`);
          result.data.missingFields.forEach(field => {
            console.log(`   - ${field}`);
          });
        } else {
          console.log(`✅ 沒有缺失欄位`);
        }
        
        if (result.data?.extraFields?.length > 0) {
          console.log(`ℹ️  多餘欄位 (${result.data.extraFields.length}):`);
          result.data.extraFields.forEach(field => {
            console.log(`   - ${field}`);
          });
        }
        
        if (result.data?.fieldsAdded > 0) {
          console.log(`✅ 已自動添加 ${result.data.fieldsAdded} 個欄位`);
        }
        
      } else {
        console.log(`❌ 驗證失敗: ${result.error || '未知錯誤'}`);
      }
      
    } catch (error) {
      console.log(`❌ 請求失敗: ${error.message}`);
    }
  }
  
  console.log('\n====================================');
  console.log('測試特定欄位: shift_time__c');
  console.log('====================================');
  
  try {
    // 檢查 shift_time__c 欄位的狀態
    const response = await fetch(`${API_BASE_URL}/api/sync/check-field/object_8W9cb__c/shift_time__c`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('shift_time__c 欄位狀態:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('無法檢查 shift_time__c 欄位');
    }
    
  } catch (error) {
    console.log(`檢查失敗: ${error.message}`);
  }
  
  console.log('\n====================================');
  console.log('建議');
  console.log('====================================');
  console.log('1. 如果發現缺失欄位，系統會自動添加');
  console.log('2. 建議執行完整同步以確保數據完整性');
  console.log('3. 定期檢查欄位變更日誌');
  console.log('\n執行完整同步: npm run sync:sites-full');
}

// 執行測試
testFieldValidation().catch(console.error);