#!/usr/bin/env node

/**
 * 測試 Webhook 即時同步功能
 */

const fetch = require('node-fetch');

// Webhook URL（開發環境）
const WEBHOOK_URL = 'https://fx-crm-sync-dev.lai-jameslai.workers.dev/api/webhook/notify';

// 測試案例
const testCases = [
  {
    name: '新增案場記錄',
    payload: {
      event: 'object.created',
      objectApiName: 'object_8W9cb__c',
      objectId: 'test_' + Date.now(),
      timestamp: Date.now(),
      data: {
        name: '測試案場 - ' + new Date().toLocaleString(),
        field_1P96q__c: 'OPP123456'
      }
    }
  },
  {
    name: '更新商機記錄',
    payload: {
      event: 'object.updated',
      objectApiName: 'NewOpportunityObj',
      objectId: 'opp_' + Date.now(),
      timestamp: Date.now(),
      data: {
        opportunity_name: '更新的商機名稱',
        amount: 100000
      }
    }
  },
  {
    name: '刪除維修單記錄',
    payload: {
      event: 'object.deleted',
      objectApiName: 'object_k1XqG__c',
      objectId: 'repair_' + Date.now(),
      timestamp: Date.now()
    }
  }
];

async function testWebhook(testCase) {
  console.log(`\n📝 測試: ${testCase.name}`);
  console.log('   Payload:', JSON.stringify(testCase.payload, null, 2));
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Webhook-Test-Script',
        'X-Forwarded-For': '127.0.0.1'
      },
      body: JSON.stringify(testCase.payload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('   ✅ 成功:', result.message);
      if (result.duration) {
        console.log(`   ⏱️  耗時: ${result.duration}ms`);
      }
    } else {
      console.log('   ❌ 失敗:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('   ❌ 請求失敗:', error.message);
    return null;
  }
}

async function checkLogs() {
  console.log('\n📊 查看同步日誌...');
  
  try {
    const response = await fetch(
      'https://fx-crm-sync-dev.lai-jameslai.workers.dev/api/sync-logs/recent?limit=10',
      {
        headers: {
          'User-Agent': 'Webhook-Test-Script'
        }
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`\n最近 ${result.count} 條同步日誌:`);
      result.data.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.syncTime}`);
        console.log(`   對象: ${log.object.label} (${log.object.apiName})`);
        console.log(`   操作: ${log.operation}`);
        console.log(`   觸發源: ${log.triggerSource} - ${log.triggerDetails}`);
        console.log(`   記錄: 處理 ${log.records.processed}, 成功 ${log.records.success}, 失敗 ${log.records.failed}`);
        console.log(`   狀態: ${log.status}`);
        if (log.error) {
          console.log(`   錯誤: ${log.error}`);
        }
        if (log.fieldsChanged && log.fieldsChanged.length > 0) {
          console.log(`   變更欄位: ${log.fieldsChanged.join(', ')}`);
        }
      });
    } else {
      console.log('獲取日誌失敗:', result.error);
    }
  } catch (error) {
    console.error('查詢日誌失敗:', error.message);
  }
}

async function main() {
  console.log('========================================');
  console.log('Webhook 即時同步測試');
  console.log('========================================');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  
  // 執行測試
  for (const testCase of testCases) {
    await testWebhook(testCase);
    // 等待一秒避免過快請求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 等待 2 秒後查看日誌
  console.log('\n等待 2 秒後查看日誌...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 查看同步日誌
  await checkLogs();
  
  console.log('\n========================================');
  console.log('測試完成！');
  console.log('========================================');
}

// 執行測試
main().catch(console.error);