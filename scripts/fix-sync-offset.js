/**
 * 修復同步偏移量問題
 * 問題：同步進度卡在 offset 2400，導致前面的記錄被跳過
 * 解決：清除進度，從頭開始同步
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function clearSyncProgress() {
  console.log('🧹 清除同步進度...');
  
  try {
    // 方法1：通過 API 清除
    const response = await axios.post(`${WORKER_URL}/api/database/execute`, {
      sql: "DELETE FROM sync_progress WHERE entity_type = 'object_8W9cb__c'"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log('✅ 進度已清除（通過 DELETE）');
      return true;
    }
  } catch (error) {
    console.log('⚠️ 無法通過 DELETE 清除，嘗試其他方法...');
  }
  
  try {
    // 方法2：設置 offset 為 0
    const response = await axios.post(`${WORKER_URL}/api/database/execute`, {
      sql: "UPDATE sync_progress SET current_offset = 0, updated_at = datetime('now') WHERE entity_type = 'object_8W9cb__c'"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log('✅ 進度已重置為 0');
      return true;
    }
  } catch (error) {
    console.log('⚠️ 無法更新進度');
  }
  
  return false;
}

async function checkCurrentProgress() {
  console.log('\n📊 檢查當前進度...');
  
  try {
    const response = await axios.post(`${WORKER_URL}/api/database/query`, {
      sql: "SELECT * FROM sync_progress WHERE entity_type = 'object_8W9cb__c'"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    if (response.data.success && response.data.data.length > 0) {
      const progress = response.data.data[0];
      console.log(`  當前 offset: ${progress.current_offset}`);
      console.log(`  更新時間: ${progress.updated_at}`);
      return progress.current_offset;
    } else {
      console.log('  沒有找到進度記錄');
      return 0;
    }
  } catch (error) {
    console.log('  無法獲取進度（表可能不存在）');
    return 0;
  }
}

async function getStats() {
  try {
    const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`, {
      timeout: 10000
    });
    const siteTable = response.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    return siteTable?.recordCount || 0;
  } catch (error) {
    return 0;
  }
}

async function triggerSync(forceFromStart = false) {
  console.log('\n🚀 觸發同步...');
  
  const payload = {
    fullSync: true,
    forceFromStart: forceFromStart  // 強制從頭開始
  };
  
  try {
    const response = await axios.post(
      `${WORKER_URL}/api/sync/object_8W9cb__c/start`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 35000
      }
    );
    
    if (response.data.success) {
      console.log('✅ 同步請求成功');
      const result = response.data.data?.result;
      if (result) {
        console.log(`  處理: ${result.total} 條`);
        console.log(`  成功: ${result.success} 條`);
        console.log(`  失敗: ${result.errors} 條`);
        console.log(`  下一個 offset: ${result.nextOffset || '無'}`);
      }
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Worker 執行超時（正常）');
      return true;
    }
    console.error('❌ 同步失敗:', error.response?.data?.error || error.message);
    return false;
  }
}

async function wait(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r⏳ 等待 ${i} 秒...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\r' + ' '.repeat(30) + '\r');
}

async function main() {
  console.log('=== 修復同步偏移量問題 ===\n');
  console.log('📝 問題診斷:');
  console.log('  - 同步進度卡在 offset 2400');
  console.log('  - 導致前 2400 條記錄被跳過');
  console.log('  - 需要清除進度從頭開始\n');
  
  try {
    // 1. 檢查初始狀態
    console.log('步驟 1：檢查初始狀態');
    const initialCount = await getStats();
    const initialOffset = await checkCurrentProgress();
    console.log(`  D1 記錄數: ${initialCount} / 4136`);
    
    if (initialOffset > 0) {
      console.log(`\n⚠️ 發現問題：offset 不是從 0 開始！`);
      
      // 2. 清除進度
      console.log('\n步驟 2：清除同步進度');
      const cleared = await clearSyncProgress();
      
      if (cleared) {
        // 驗證清除成功
        await wait(2);
        const newOffset = await checkCurrentProgress();
        if (newOffset === 0) {
          console.log('✅ 進度已成功清除');
        } else {
          console.log(`⚠️ 進度可能未完全清除，當前: ${newOffset}`);
        }
      }
    }
    
    // 3. 從頭開始同步
    console.log('\n步驟 3：從頭開始同步');
    
    // 執行多次同步以處理所有記錄
    const TOTAL_RECORDS = 4136;
    const BATCH_SIZE = 600;  // 每次 600 條
    const REQUIRED_RUNS = Math.ceil(TOTAL_RECORDS / BATCH_SIZE);
    
    console.log(`  需要執行約 ${REQUIRED_RUNS} 次同步`);
    console.log(`  每次處理 ${BATCH_SIZE} 條記錄\n`);
    
    for (let i = 1; i <= REQUIRED_RUNS; i++) {
      console.log(`\n第 ${i}/${REQUIRED_RUNS} 次同步`);
      console.log('─'.repeat(40));
      
      const success = await triggerSync(i === 1);  // 第一次強制從頭開始
      
      if (!success) {
        console.log('⚠️ 同步失敗，等待後重試...');
        await wait(30);
        continue;
      }
      
      // 等待處理完成
      await wait(20);
      
      // 檢查進度
      const currentCount = await getStats();
      const currentOffset = await checkCurrentProgress();
      const added = currentCount - initialCount;
      
      console.log(`\n📈 進度更新:`);
      console.log(`  當前記錄數: ${currentCount} / ${TOTAL_RECORDS}`);
      console.log(`  新增: ${added} 條`);
      console.log(`  當前 offset: ${currentOffset}`);
      console.log(`  完成率: ${(currentCount / TOTAL_RECORDS * 100).toFixed(1)}%`);
      
      // 檢查是否完成
      if (currentCount >= TOTAL_RECORDS) {
        console.log('\n🎉 同步完成！');
        break;
      }
      
      // 如果沒有進展，可能需要清除進度重試
      if (added === 0 && currentOffset > 0) {
        console.log('\n⚠️ 檢測到可能的進度問題，嘗試修復...');
        await clearSyncProgress();
        await wait(5);
      }
    }
    
    // 4. 最終驗證
    console.log('\n步驟 4：最終驗證');
    const finalCount = await getStats();
    const finalOffset = await checkCurrentProgress();
    
    console.log('─'.repeat(50));
    console.log('📊 最終結果:');
    console.log(`  D1 記錄數: ${finalCount} / ${TOTAL_RECORDS}`);
    console.log(`  同步率: ${(finalCount / TOTAL_RECORDS * 100).toFixed(1)}%`);
    console.log(`  最終 offset: ${finalOffset}`);
    
    if (finalCount >= TOTAL_RECORDS) {
      console.log('\n✅ 問題已解決！所有記錄已同步');
    } else {
      const missing = TOTAL_RECORDS - finalCount;
      console.log(`\n⚠️ 還有 ${missing} 條記錄未同步`);
      console.log('\n建議:');
      console.log('  1. 再次運行此腳本');
      console.log('  2. 檢查 Worker 日誌');
      console.log('  3. 考慮手動同步特定批次');
    }
    
  } catch (error) {
    console.error('\n❌ 執行失敗:', error.message);
  }
}

// 執行修復
main().catch(console.error);