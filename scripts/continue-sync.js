/**
 * 繼續同步剩餘的記錄
 * 通過多次調用 Worker 來完成所有 4136 條記錄的同步
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function checkDatabaseStats() {
  const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
  const siteTable = response.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
  return siteTable;
}

async function triggerSync() {
  console.log('觸發同步...');
  try {
    const response = await axios.post(
      `${WORKER_URL}/api/sync/object_8W9cb__c/start`,
      { fullSync: true },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 35000 // 35秒超時
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('Worker 執行時間較長（正常）');
      return { timeout: true };
    }
    if (error.response?.data?.error?.includes('Too many API requests')) {
      console.log('遇到 API 請求限制，稍後重試');
      return { rateLimited: true };
    }
    throw error;
  }
}

async function wait(seconds) {
  console.log(`等待 ${seconds} 秒...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function main() {
  console.log('=== 繼續同步案場數據 ===\n');
  
  const TARGET_COUNT = 4136;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  
  try {
    // 檢查初始狀態
    console.log('📊 檢查當前狀態...');
    let stats = await checkDatabaseStats();
    console.log(`  當前記錄數: ${stats.recordCount} / ${TARGET_COUNT}`);
    console.log(`  差異: ${TARGET_COUNT - stats.recordCount} 條\n`);
    
    if (stats.recordCount >= TARGET_COUNT) {
      console.log('✅ 同步已完成！所有記錄都已同步到 D1');
      return;
    }
    
    // 循環執行同步直到完成
    while (stats.recordCount < TARGET_COUNT && attempts < MAX_ATTEMPTS) {
      attempts++;
      console.log(`\n🔄 第 ${attempts} 次同步嘗試`);
      console.log('─'.repeat(40));
      
      // 觸發同步
      const syncResult = await triggerSync();
      
      if (syncResult.rateLimited) {
        console.log('⏳ 遇到速率限制，等待 30 秒後重試...');
        await wait(30);
        continue;
      }
      
      // 等待同步完成
      await wait(5);
      
      // 檢查新狀態
      const newStats = await checkDatabaseStats();
      const added = newStats.recordCount - stats.recordCount;
      
      console.log(`📈 同步結果:`);
      console.log(`  之前: ${stats.recordCount} 條`);
      console.log(`  現在: ${newStats.recordCount} 條`);
      console.log(`  新增: ${added} 條`);
      console.log(`  剩餘: ${TARGET_COUNT - newStats.recordCount} 條`);
      
      // 計算進度
      const progress = (newStats.recordCount / TARGET_COUNT * 100).toFixed(1);
      console.log(`  進度: ${progress}%`);
      
      // 檢查是否有進展
      if (added === 0) {
        console.log('\n⚠️ 本次同步沒有新增記錄');
        console.log('可能原因:');
        console.log('  1. 所有記錄都已同步');
        console.log('  2. 遇到錯誤導致同步失敗');
        console.log('  3. 剩餘記錄有問題無法同步');
        
        // 再試一次
        console.log('\n再嘗試一次...');
        await wait(10);
      } else {
        console.log(`\n✅ 成功同步 ${added} 條記錄`);
      }
      
      stats = newStats;
      
      // 檢查是否完成
      if (stats.recordCount >= TARGET_COUNT) {
        console.log('\n🎉 同步完成！');
        console.log(`總記錄數: ${stats.recordCount} / ${TARGET_COUNT}`);
        break;
      }
      
      // 批次間延遲，避免過於頻繁
      if (attempts < MAX_ATTEMPTS) {
        console.log('\n準備下一批次...');
        await wait(3);
      }
    }
    
    // 最終檢查
    const finalStats = await checkDatabaseStats();
    console.log('\n' + '='.repeat(50));
    console.log('📊 最終統計:');
    console.log(`  D1 記錄數: ${finalStats.recordCount}`);
    console.log(`  目標數量: ${TARGET_COUNT}`);
    
    if (finalStats.recordCount >= TARGET_COUNT) {
      console.log('\n✅ 同步成功完成！');
    } else {
      const missing = TARGET_COUNT - finalStats.recordCount;
      console.log(`\n⚠️ 同步未完全完成，還差 ${missing} 條記錄`);
      console.log('\n可能的解決方案:');
      console.log('  1. 檢查 Worker 日誌查看具體錯誤');
      console.log('  2. 檢查這些記錄是否有特殊字符或格式問題');
      console.log('  3. 考慮手動同步失敗的記錄');
      console.log('  4. 聯繫技術支持');
    }
    
  } catch (error) {
    console.error('\n❌ 同步失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

// 執行
main().catch(console.error);