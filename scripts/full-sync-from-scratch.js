/**
 * 從頭開始完整同步所有案場數據
 * D1 資料庫實際是空的，需要同步所有 4136 條記錄
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

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
    
    if (response.data.success) {
      console.log('✅ 同步請求成功');
      if (response.data.data) {
        console.log(`  處理記錄: ${response.data.data.totalRecords || 0}`);
        console.log(`  成功: ${response.data.data.success || 0}`);
        console.log(`  失敗: ${response.data.data.errors || 0}`);
      }
    }
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Worker 執行時間較長（正常，處理中）');
      return { timeout: true, processing: true };
    }
    if (error.response?.status === 500) {
      console.log('❌ Worker 錯誤:', error.response?.data?.error || '未知錯誤');
      return { success: false };
    }
    console.error('❌ 請求失敗:', error.message);
    return { success: false };
  }
}

async function checkProgress() {
  try {
    const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`, {
      timeout: 10000
    });
    
    if (response.data.success) {
      const siteTable = response.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
      return siteTable?.recordCount || 0;
    }
  } catch (error) {
    console.error('無法獲取進度:', error.message);
  }
  return 0;
}

async function wait(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r⏳ 等待 ${i} 秒...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\r' + ' '.repeat(30) + '\r');
}

async function main() {
  console.log('=== 從頭開始完整同步案場數據 ===\n');
  console.log('📝 說明:');
  console.log('  - D1 資料庫目前是空的');
  console.log('  - 需要同步所有 4136 條記錄');
  console.log('  - 每次執行處理 1 批 200 條');
  console.log('  - 預計需要執行約 21 次\n');
  
  const TARGET_COUNT = 4136;
  const BATCH_SIZE = 200;
  const EXPECTED_RUNS = Math.ceil(TARGET_COUNT / BATCH_SIZE);
  
  let currentCount = 0;
  let attempts = 0;
  const MAX_ATTEMPTS = 30;
  let consecutiveFailures = 0;
  
  try {
    // 檢查初始狀態
    console.log('📊 檢查初始狀態...');
    currentCount = await checkProgress();
    console.log(`  當前記錄數: ${currentCount} / ${TARGET_COUNT}`);
    
    if (currentCount >= TARGET_COUNT) {
      console.log('\n✅ 同步已完成！');
      return;
    }
    
    console.log(`  需要同步: ${TARGET_COUNT - currentCount} 條`);
    console.log(`  預計執行: ${Math.ceil((TARGET_COUNT - currentCount) / BATCH_SIZE)} 次\n`);
    
    // 開始同步循環
    while (currentCount < TARGET_COUNT && attempts < MAX_ATTEMPTS) {
      attempts++;
      console.log(`\n🔄 第 ${attempts} 次執行`);
      console.log('─'.repeat(40));
      
      // 觸發同步
      const result = await triggerSync();
      
      // 根據結果決定等待時間
      let waitTime = 15; // 默認等待時間
      
      if (result.timeout || result.processing) {
        console.log('💭 Worker 正在處理數據...');
        waitTime = 30; // 處理中需要更長等待時間
        consecutiveFailures = 0;
      } else if (result.success === false) {
        consecutiveFailures++;
        console.log(`⚠️ 連續失敗 ${consecutiveFailures} 次`);
        
        if (consecutiveFailures >= 3) {
          console.log('😴 多次失敗，等待較長時間...');
          waitTime = 120; // 2分鐘
          consecutiveFailures = 0;
        } else {
          waitTime = 60; // 1分鐘
        }
      } else {
        consecutiveFailures = 0;
        waitTime = 20; // 成功後的正常等待
      }
      
      // 等待
      await wait(waitTime);
      
      // 檢查進度
      console.log('📈 檢查進度...');
      const newCount = await checkProgress();
      const added = newCount - currentCount;
      
      if (added > 0) {
        console.log(`✅ 成功同步 ${added} 條記錄`);
        consecutiveFailures = 0; // 重置失敗計數
      } else {
        console.log('⚠️ 本次沒有新增記錄');
      }
      
      currentCount = newCount;
      console.log(`  當前總數: ${currentCount} / ${TARGET_COUNT}`);
      
      const progress = (currentCount / TARGET_COUNT * 100).toFixed(1);
      const remaining = TARGET_COUNT - currentCount;
      const estimatedRuns = Math.ceil(remaining / BATCH_SIZE);
      
      console.log(`  完成進度: ${progress}%`);
      console.log(`  剩餘記錄: ${remaining}`);
      
      if (remaining > 0) {
        console.log(`  預計還需: ${estimatedRuns} 次執行`);
      }
      
      // 檢查是否完成
      if (currentCount >= TARGET_COUNT) {
        break;
      }
      
      // 如果有進展，短暫等待後繼續
      if (added > 0) {
        console.log('\n🚀 有進展，準備下一批...');
        await wait(5);
      } else if (attempts < MAX_ATTEMPTS) {
        // 沒有進展，根據情況調整策略
        if (attempts % 5 === 0) {
          console.log('\n😴 暫停一下，避免過於頻繁...');
          await wait(60);
        }
      }
    }
    
    // 最終結果
    console.log('\n' + '='.repeat(50));
    console.log('📊 最終結果:');
    console.log(`  總執行次數: ${attempts}`);
    console.log(`  最終記錄數: ${currentCount} / ${TARGET_COUNT}`);
    
    if (currentCount >= TARGET_COUNT) {
      console.log('\n🎉 同步成功完成！');
      console.log('所有 4136 條案場記錄已成功同步到 D1 資料庫');
      
      // 計算效率
      const efficiency = (currentCount / (attempts * BATCH_SIZE) * 100).toFixed(1);
      console.log(`\n📈 同步效率: ${efficiency}%`);
    } else {
      const missing = TARGET_COUNT - currentCount;
      console.log(`\n⚠️ 同步未完成`);
      console.log(`還差 ${missing} 條記錄`);
      
      if (attempts >= MAX_ATTEMPTS) {
        console.log('\n已達到最大嘗試次數限制');
      }
      
      console.log('\n💡 建議:');
      console.log('  1. 檢查 Worker 日誌了解具體錯誤');
      console.log('  2. 確認 D1 資料庫配置正確');
      console.log('  3. 稍後再次執行此腳本繼續同步');
    }
    
  } catch (error) {
    console.error('\n❌ 執行失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

// 執行
console.log('開始完整同步...\n');
main().catch(console.error);