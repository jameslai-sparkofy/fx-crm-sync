const axios = require('axios');

async function testTimeTravel() {
  try {
    console.log('測試時間旅行功能...\n');
    
    // 1. 獲取主頁 HTML
    console.log('1. 檢查主頁面...');
    const homeResponse = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/');
    const html = homeResponse.data;
    
    // 檢查時間旅行分頁是否存在
    if (html.includes('時間旅行')) {
      console.log('   ✓ 找到「時間旅行」分頁');
    } else {
      console.log('   ✗ 未找到「時間旅行」分頁');
    }
    
    // 檢查時間旅行相關元素
    const elements = [
      { name: '資料庫統計', found: html.includes('資料庫統計') },
      { name: '標記檢查點', found: html.includes('標記檢查點') },
      { name: '時間旅行指令', found: html.includes('時間旅行指令') },
      { name: '重要檢查點記錄', found: html.includes('重要檢查點記錄') },
      { name: 'backupStats', found: html.includes('backupStats') },
      { name: 'refreshBackupStats', found: html.includes('refreshBackupStats') },
      { name: 'markCheckpoint', found: html.includes('markCheckpoint') },
      { name: 'generateRestoreCommand', found: html.includes('generateRestoreCommand') }
    ];
    
    console.log('\n2. 檢查時間旅行元素：');
    elements.forEach(elem => {
      console.log(`   ${elem.found ? '✓' : '✗'} ${elem.name}`);
    });
    
    // 2. 測試 API 端點
    console.log('\n3. 測試 API 端點：');
    
    // 測試統計 API
    try {
      const statsResponse = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/api/backup/stats');
      console.log('   ✓ /api/backup/stats - 成功');
      console.log(`     - 資料庫大小: ${statsResponse.data.data.database.sizeMB} MB`);
      console.log(`     - 總記錄數: ${statsResponse.data.data.database.totalRecords}`);
    } catch (error) {
      console.log('   ✗ /api/backup/stats - 失敗:', error.message);
    }
    
    // 測試檢查點 API
    try {
      const checkpointsResponse = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/api/backup/checkpoints');
      const checkpoints = checkpointsResponse.data.data.syncCheckpoints || [];
      console.log('   ✓ /api/backup/checkpoints - 成功');
      console.log(`     - 檢查點數量: ${checkpoints.length}`);
      
      // 找出手動標記的檢查點
      const manualCheckpoints = checkpoints.filter(cp => 
        cp.entity_type === 'BACKUP_CHECKPOINT' || 
        (cp.details && cp.details.includes('重建'))
      );
      
      if (manualCheckpoints.length > 0) {
        console.log(`     - 手動標記檢查點: ${manualCheckpoints.length} 個`);
      }
    } catch (error) {
      console.log('   ✗ /api/backup/checkpoints - 失敗:', error.message);
    }
    
    // 3. 檢查 Vue 應用程式設定
    console.log('\n4. 檢查 Vue 應用程式：');
    
    // 檢查 Vue 元件是否正確設定
    const vueChecks = [
      { name: 'Vue 3 引入', found: html.includes('vue@3') },
      { name: 'Element Plus 引入', found: html.includes('element-plus') },
      { name: 'mounted 掛載', found: html.includes('mounted()') },
      { name: '初始化備份統計', found: html.includes('this.refreshBackupStats()') }
    ];
    
    vueChecks.forEach(check => {
      console.log(`   ${check.found ? '✓' : '✗'} ${check.name}`);
    });
    
    // 4. 分析可能的問題
    console.log('\n5. 診斷結果：');
    
    const allElementsFound = elements.every(e => e.found);
    const allVueChecksPass = vueChecks.every(c => c.found);
    
    if (allElementsFound && allVueChecksPass) {
      console.log('   ✓ 所有元件都已正確實現');
      console.log('   建議：清除瀏覽器快取並重新載入頁面');
      console.log('   或使用無痕模式開啟網站');
    } else {
      console.log('   ⚠ 發現以下問題：');
      if (!allElementsFound) {
        console.log('   - 某些時間旅行元素未找到');
      }
      if (!allVueChecksPass) {
        console.log('   - Vue 應用程式設定可能有問題');
      }
    }
    
    console.log('\n6. 建議操作：');
    console.log('   1. 在瀏覽器中按 Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac) 強制刷新');
    console.log('   2. 開啟開發者工具 (F12)，檢查 Console 是否有錯誤');
    console.log('   3. 在 Console 中輸入 app.activeTab = "backup" 手動切換到時間旅行分頁');
    console.log('   4. 檢查 Network 分頁確認所有資源都已載入');
    
  } catch (error) {
    console.error('測試失敗:', error.message);
  }
}

testTimeTravel();