/**
 * 完成剩餘記錄同步
 * 根據 Cloudflare Worker 限制優化：
 * - 每次執行最多 1 批
 * - 每批 200 條記錄
 * - 需要執行約 3 次來完成 558 條剩餘記錄
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function checkDatabaseStats() {
  const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
  const siteTable = response.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
  return siteTable;
}

async function triggerSync() {
  console.log('📤 觸發同步...');
  try {
    const response = await axios.post(
      `${WORKER_URL}/api/sync/object_8W9cb__c/start`,
      { fullSync: true },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 35000
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Worker 執行時間較長（正常）');
      return { timeout: true, success: true };
    }
    if (error.response?.status === 500) {
      const errorMsg = error.response?.data?.error || '';
      if (errorMsg.includes('Too many API requests')) {
        console.log('❌ 遇到 API 請求限制');
        return { rateLimited: true, success: false };
      }
    }
    console.error('❌ 同步失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function wait(seconds) {
  console.log(`⏳ 等待 ${seconds} 秒...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function main() {
  console.log('=== 完成案場數據同步 ===\n');
  console.log('📝 說明:');
  console.log('  - Cloudflare Worker 限制每次調用最多 1000 個操作');
  console.log('  - 已調整為每次同步 1 批，每批 200 條記錄');
  console.log('  - 需要執行約 3 次來完成剩餘的 558 條記錄\n');
  
  const TARGET_COUNT = 4136;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  
  try {
    // 檢查初始狀態
    console.log('📊 檢查當前狀態...');
    let stats = await checkDatabaseStats();
    const initialCount = stats.recordCount;
    console.log(`  當前記錄數: ${stats.recordCount} / ${TARGET_COUNT}`);
    console.log(`  剩餘: ${TARGET_COUNT - stats.recordCount} 條`);
    console.log(`  預計需要執行: ${Math.ceil((TARGET_COUNT - stats.recordCount) / 200)} 次\n`);
    
    if (stats.recordCount >= TARGET_COUNT) {
      console.log('✅ 同步已完成！所有記錄都已同步到 D1');
      return;
    }
    
    // 循環執行同步
    while (stats.recordCount < TARGET_COUNT && attempts < MAX_ATTEMPTS) {
      attempts++;
      console.log(`\n🔄 第 ${attempts} 次同步`);
      console.log('─'.repeat(40));
      
      // 觸發同步
      const syncResult = await triggerSync();
      
      if (syncResult.rateLimited) {
        console.log('💡 提示: Worker 遇到速率限制');
        console.log('   這通常表示需要等待一段時間');
        console.log('   等待 60 秒後重試...');
        await wait(60);
        continue;
      }
      
      if (!syncResult.success && syncResult.error) {
        console.log(`❌ 同步失敗: ${syncResult.error}`);
        console.log('   等待 30 秒後重試...');
        await wait(30);
        continue;
      }
      
      // 等待同步完成
      console.log('⏳ 等待同步完成...');
      await wait(10);
      
      // 檢查新狀態
      const newStats = await checkDatabaseStats();
      const added = newStats.recordCount - stats.recordCount;
      
      if (added > 0) {
        console.log(`✅ 成功同步 ${added} 條記錄`);
        console.log(`  當前總數: ${newStats.recordCount} / ${TARGET_COUNT}`);
        const progress = (newStats.recordCount / TARGET_COUNT * 100).toFixed(1);
        console.log(`  進度: ${progress}%`);
      } else {
        console.log('⚠️ 本次同步沒有新增記錄');
        
        // 如果連續兩次沒有進展，增加等待時間
        if (attempts > 1) {
          console.log('   可能需要更長的等待時間');
          console.log('   等待 60 秒後重試...');
          await wait(60);
        }
      }
      
      stats = newStats;
      
      // 檢查是否完成
      if (stats.recordCount >= TARGET_COUNT) {
        break;
      }
      
      // 批次間延遲
      if (attempts < MAX_ATTEMPTS && added > 0) {
        console.log('\n準備下一批次...');
        await wait(5);
      }
    }
    
    // 最終檢查
    const finalStats = await checkDatabaseStats();
    console.log('\n' + '='.repeat(50));
    console.log('📊 最終結果:');
    console.log(`  初始記錄數: ${initialCount}`);
    console.log(`  最終記錄數: ${finalStats.recordCount}`);
    console.log(`  新增記錄數: ${finalStats.recordCount - initialCount}`);
    console.log(`  目標數量: ${TARGET_COUNT}`);
    
    if (finalStats.recordCount >= TARGET_COUNT) {
      console.log('\n🎉 同步成功完成！');
      console.log('所有 4136 條案場記錄已成功同步到 D1 資料庫');
    } else {
      const missing = TARGET_COUNT - finalStats.recordCount;
      console.log(`\n⚠️ 同步未完全完成`);
      console.log(`還差 ${missing} 條記錄 (${(missing / TARGET_COUNT * 100).toFixed(1)}%)`);
      
      if (missing <= 200) {
        console.log('\n💡 建議: 再執行一次此腳本應該可以完成同步');
      } else {
        console.log('\n💡 建議:');
        console.log('  1. 檢查 Worker 日誌查看具體錯誤');
        console.log('  2. 可能需要調整批次大小或執行策略');
        console.log('  3. 考慮在非高峰時段執行');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 執行失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 執行
console.log('開始執行同步...\n');
main().catch(console.error);