const axios = require('axios');

async function testWebPage() {
  try {
    console.log('直接測試網頁內容...\n');
    
    // 1. 獲取網頁
    console.log('獲取網頁 HTML...');
    const response = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/');
    const html = response.data;
    
    console.log(`網頁大小: ${html.length} 字元\n`);
    
    // 2. 檢查分頁
    console.log('檢查分頁：');
    const tabs = ['儀表板', '欄位對應', '時間旅行'];
    tabs.forEach(tab => {
      const exists = html.includes(tab);
      console.log(`  ${exists ? '✓' : '✗'} ${tab}`);
    });
    
    // 3. 檢查時間旅行相關的 Vue 代碼
    console.log('\n檢查時間旅行功能代碼：');
    const features = [
      { name: '資料庫統計', code: 'backupStats' },
      { name: '標記檢查點', code: 'markCheckpoint' },
      { name: '時間旅行指令', code: 'generateRestoreCommand' },
      { name: '檢查點記錄', code: 'syncCheckpoints' },
      { name: 'backup 分頁', code: "activeTab === 'backup'" },
      { name: 'refreshBackupStats 函數', code: 'refreshBackupStats()' }
    ];
    
    features.forEach(f => {
      const exists = html.includes(f.code);
      console.log(`  ${exists ? '✓' : '✗'} ${f.name} (${f.code})`);
    });
    
    // 4. 提取分頁內容
    console.log('\n提取時間旅行分頁內容：');
    
    // 找到時間旅行分頁的開始和結束
    const backupStart = html.indexOf("v-show=\"activeTab === 'backup'\"");
    if (backupStart > -1) {
      const backupSection = html.substring(backupStart, backupStart + 2000);
      
      // 檢查關鍵元素
      const elements = [
        '資料庫統計',
        '資料庫大小',
        '總頁數',
        '總記錄數',
        '標記檢查點',
        '描述',
        '標記當前時間點',
        '時間旅行指令',
        '選擇時間',
        '生成恢復指令',
        '重要檢查點記錄'
      ];
      
      console.log('  時間旅行分頁包含的元素：');
      elements.forEach(elem => {
        const exists = backupSection.includes(elem);
        console.log(`    ${exists ? '✓' : '✗'} ${elem}`);
      });
    } else {
      console.log('  ✗ 未找到時間旅行分頁定義');
    }
    
    // 5. 測試 API
    console.log('\n測試 API 端點：');
    
    try {
      const statsRes = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/api/backup/stats');
      console.log('  ✓ /api/backup/stats 回應正常');
      if (statsRes.data?.data?.database) {
        console.log(`    - 資料庫大小: ${statsRes.data.data.database.sizeMB} MB`);
        console.log(`    - 總記錄數: ${statsRes.data.data.database.totalRecords}`);
      }
    } catch (e) {
      console.log('  ✗ /api/backup/stats 失敗:', e.message);
    }
    
    try {
      const checkpointsRes = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/api/backup/checkpoints');
      console.log('  ✓ /api/backup/checkpoints 回應正常');
      if (checkpointsRes.data?.data?.syncCheckpoints) {
        console.log(`    - 檢查點數量: ${checkpointsRes.data.data.syncCheckpoints.length}`);
      }
    } catch (e) {
      console.log('  ✗ /api/backup/checkpoints 失敗:', e.message);
    }
    
    // 6. 診斷
    console.log('\n診斷結果：');
    
    // 檢查是否有 Vue 錯誤
    if (html.includes('{{ ')) {
      console.log('  ⚠️ 發現未編譯的 Vue 模板語法');
    }
    
    if (!html.includes('createApp')) {
      console.log('  ⚠️ 未找到 Vue 應用初始化代碼');
    }
    
    if (!html.includes('mounted()')) {
      console.log('  ⚠️ 未找到 mounted 生命週期');
    }
    
    // 檢查時間旅行分頁是否默認隱藏
    if (html.includes("activeTab: 'overview'")) {
      console.log('  ℹ️ 默認顯示儀表板分頁（需要手動切換到時間旅行）');
    }
    
    console.log('\n建議操作：');
    console.log('1. 開啟瀏覽器訪問: https://fx-crm-sync.lai-jameslai.workers.dev/');
    console.log('2. 點擊「時間旅行」分頁');
    console.log('3. 如果沒有數據顯示，按 F12 開啟開發者工具');
    console.log('4. 在 Console 中輸入: app.activeTab = "backup"');
    console.log('5. 再輸入: app.refreshBackupStats()');
    console.log('6. 檢查 Network 分頁看 API 請求是否成功');
    
  } catch (error) {
    console.error('測試失敗:', error.message);
  }
}

testWebPage();