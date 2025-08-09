#!/usr/bin/env node
/**
 * 通過 API 檢查 shift_time 狀態
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function checkViaAPI() {
  console.log('='.repeat(80));
  console.log('通過 API 檢查 shift_time 狀態');
  console.log('='.repeat(80));

  try {
    // 1. 獲取資料庫統計
    console.log('\n1. 獲取資料庫統計...');
    const statsResponse = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    
    if (statsResponse.data.success) {
      const tables = statsResponse.data.data.tables;
      const object8W9cb = tables.find(t => t.tableName === 'object_8w9cb__c');
      if (object8W9cb) {
        console.log(`  案場表記錄數: ${object8W9cb.recordCount}`);
        console.log(`  最後同步時間: ${object8W9cb.lastSync}`);
      }
    }

    // 2. 通過 Web 介面查看欄位對應
    console.log('\n2. 訪問 Web 介面查看欄位...');
    console.log(`  請訪問: ${WORKER_URL}/`);
    console.log('  點擊「欄位對應表」查看案場欄位');
    console.log('  檢查 shift_time__c 是否有值');

  } catch (error) {
    console.error('❌ API 調用失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('檢查完成');
  console.log('='.repeat(80));
}

// 執行檢查
checkViaAPI();