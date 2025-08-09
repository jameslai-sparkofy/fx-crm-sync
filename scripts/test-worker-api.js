#!/usr/bin/env node
/**
 * 直接測試 Worker API 同步單筆記錄
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function testWorkerAPI() {
  console.log('='.repeat(80));
  console.log('測試 Worker API 同步單筆記錄');
  console.log('='.repeat(80));

  try {
    // 觸發同步，只同步一筆有 shift_time 的記錄
    console.log('\n觸發同步特定記錄...');
    
    // 使用特定的過濾條件
    const response = await axios.post(
      `${WORKER_URL}/api/sync/object_8W9cb__c/test-single`,
      {
        recordName: '25-07-14-3556'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\nAPI 回應:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ API 調用失敗:');
    console.error('錯誤訊息:', error.message);
    
    if (error.response) {
      console.error('狀態碼:', error.response.status);
      console.error('回應資料:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('測試完成');
  console.log('='.repeat(80));
}

// 執行測試
testWorkerAPI();