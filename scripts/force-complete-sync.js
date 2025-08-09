/**
 * 強制完整同步 - 利用新的 5 分鐘 CPU 限制
 * 清除所有進度，重新同步所有記錄
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function clearAllProgress() {
  console.log('🧹 清除所有同步進度...');
  
  try {
    // 嘗試清除 sync_progress 表的記錄
    await axios.post(`${WORKER_URL}/api/database/execute`, {
      sql: "DELETE FROM sync_progress WHERE entity_type = 'object_8W9cb__c'"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log('✅ 進度已清除');
  } catch (error) {
    console.log('⚠️ 無法清除進度表（可能不存在）');
  }
  
  try {
    // 嘗試將表重置
    await axios.post(`${WORKER_URL}/api/database/execute`, {
      sql: "DROP TABLE IF EXISTS sync_progress"
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log('✅ 進度表已刪除');
  } catch (error) {
    // 忽略錯誤
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
    console.error('無法獲取統計:', error.message);
    return 0;
  }
}

async function triggerFullSync(attempt) {
  console.log(`\n🚀 第 ${attempt} 次觸發完整同步...`);
  
  try {
    const response = await axios.post(
      `${WORKER_URL}/api/sync/object_8W9cb__c/start`,
      { 
        fullSync: true,
        force: true,  // 強制同步
        clearProgress: true  // 清除進度
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000  // 5 分鐘超時（配合新的 CPU 限制）
      }
    );
    
    console.log('✅ 同步請求完成');
    if (response.data.success && response.data.data) {
      console.log(`  處理記錄: ${response.data.data.total || 0}`);
      console.log(`  成功: ${response.data.data.success || 0}`);
      console.log(`  失敗: ${response.data.data.errors || 0}`);
      console.log(`  完成: ${response.data.data.isCompleted ? '是' : '否'}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Worker 執行超時（正常，可能在處理大量數據）');
      return { timeout: true };
    }
    
    console.error('❌ 同步失敗:', error.response?.data?.error || error.message);
    return { success: false, error: error.message };
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
  console.log('=== 強制完整同步（利用 5 分鐘 CPU 限制）===\n');
  console.log('📝 說明:');
  console.log('  - Cloudflare Workers 現在支援 5 分鐘 CPU 時間');
  console.log('  - 子請求限制：1,000 個（付費版）');
  console.log('  - D1 並發連接：6 個');
  console.log('  - 目標：同步所有 4,136 條記錄\n');
  
  const TARGET = 4136;
  
  try {
    // 清除所有進度
    await clearAllProgress();
    
    // 檢查初始狀態
    console.log('\n📊 初始狀態:');
    let currentCount = await getStats();
    console.log(`  當前記錄數: ${currentCount} / ${TARGET}`);
    console.log(`  需要同步: ${TARGET - currentCount} 條`);
    
    // 執行同步循環
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    
    while (currentCount < TARGET && attempts < MAX_ATTEMPTS) {
      attempts++;
      
      // 觸發同步
      const result = await triggerFullSync(attempts);
      
      // 等待較長時間讓 Worker 完成處理
      if (result.timeout) {
        console.log('💭 Worker 正在處理，等待更長時間...');
        await wait(60);  // 等待 1 分鐘
      } else if (result.success === false) {
        console.log('⚠️ 同步失敗，等待後重試...');
        await wait(30);
      } else {
        console.log('✅ 同步請求成功，等待處理完成...');
        await wait(30);
      }
      
      // 檢查新狀態
      const newCount = await getStats();
      const added = newCount - currentCount;
      
      console.log('\n📈 進度更新:');
      console.log(`  新增記錄: ${added}`);
      console.log(`  當前總數: ${newCount} / ${TARGET}`);
      console.log(`  完成率: ${(newCount / TARGET * 100).toFixed(1)}%`);
      
      currentCount = newCount;
      
      // 如果已完成，退出
      if (currentCount >= TARGET) {
        break;
      }
      
      // 如果沒有進展，可能需要更長等待
      if (added === 0 && attempts < MAX_ATTEMPTS) {
        console.log('\n😴 沒有進展，等待 2 分鐘後重試...');
        await wait(120);
      }
    }
    
    // 最終結果
    console.log('\n' + '='.repeat(50));
    console.log('📊 最終結果:');
    console.log(`  最終記錄數: ${currentCount} / ${TARGET}`);
    
    if (currentCount >= TARGET) {
      console.log('\n🎉 同步成功完成！');
      console.log('所有 4,136 條記錄已同步到 D1');
    } else {
      const missing = TARGET - currentCount;
      console.log(`\n⚠️ 還差 ${missing} 條記錄`);
      
      if (missing === 558) {
        console.log('\n💡 仍然是 558 條差異，可能需要：');
        console.log('  1. 檢查 Worker 代碼的斷點續傳邏輯');
        console.log('  2. 修改 Worker 增加批次大小');
        console.log('  3. 使用增量同步模式');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 執行失敗:', error.message);
  }
}

// 執行
console.log('開始強制完整同步...\n');
main().catch(console.error);