const puppeteer = require('puppeteer');

async function testTimeTravel() {
  let browser;
  
  try {
    console.log('啟動瀏覽器...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('訪問網站...');
    await page.goto('https://fx-crm-sync.lai-jameslai.workers.dev/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('等待頁面載入...');
    await page.waitForTimeout(3000);
    
    // 截圖首頁
    console.log('截圖首頁...');
    await page.screenshot({ 
      path: '/mnt/c/claude/紛銷資料庫/fx-crm-sync/screenshots/homepage.png',
      fullPage: true 
    });
    
    // 檢查是否有時間旅行分頁
    console.log('檢查時間旅行分頁...');
    const hasTimeTravel = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.el-tabs__item');
      for (let tab of tabs) {
        if (tab.textContent.includes('時間旅行')) {
          return true;
        }
      }
      return false;
    });
    
    if (hasTimeTravel) {
      console.log('✓ 找到時間旅行分頁');
      
      // 點擊時間旅行分頁
      console.log('點擊時間旅行分頁...');
      await page.evaluate(() => {
        const tabs = document.querySelectorAll('.el-tabs__item');
        for (let tab of tabs) {
          if (tab.textContent.includes('時間旅行')) {
            tab.click();
            break;
          }
        }
      });
      
      await page.waitForTimeout(2000);
      
      // 截圖時間旅行分頁
      console.log('截圖時間旅行分頁...');
      await page.screenshot({ 
        path: '/mnt/c/claude/紛銷資料庫/fx-crm-sync/screenshots/time-travel.png',
        fullPage: true 
      });
      
      // 檢查時間旅行頁面元素
      console.log('檢查頁面元素...');
      const elements = await page.evaluate(() => {
        const result = {
          hasBackupStats: false,
          hasCheckpoint: false,
          hasRestoreCommand: false,
          hasCheckpointTable: false,
          visibleContent: [],
          errors: []
        };
        
        // 檢查資料庫統計
        const statsCard = document.querySelector('.el-card');
        if (statsCard && statsCard.textContent.includes('資料庫統計')) {
          result.hasBackupStats = true;
          result.visibleContent.push('資料庫統計卡片');
        }
        
        // 檢查標記檢查點
        const cards = document.querySelectorAll('.el-card');
        cards.forEach(card => {
          if (card.textContent.includes('標記檢查點')) {
            result.hasCheckpoint = true;
            result.visibleContent.push('標記檢查點卡片');
          }
          if (card.textContent.includes('時間旅行指令')) {
            result.hasRestoreCommand = true;
            result.visibleContent.push('時間旅行指令卡片');
          }
          if (card.textContent.includes('重要檢查點記錄')) {
            result.hasCheckpointTable = true;
            result.visibleContent.push('重要檢查點記錄表格');
          }
        });
        
        // 檢查是否有錯誤訊息
        const errorElements = document.querySelectorAll('.el-message--error');
        errorElements.forEach(error => {
          result.errors.push(error.textContent);
        });
        
        // 獲取當前分頁內容
        const activePane = document.querySelector('.el-tab-pane[style*="display"]') || 
                          document.querySelector('.el-tab-pane:not([style*="display: none"])');
        if (activePane) {
          result.activePaneText = activePane.textContent.substring(0, 200);
        }
        
        return result;
      });
      
      console.log('\n測試結果：');
      console.log('====================');
      console.log(`資料庫統計卡片: ${elements.hasBackupStats ? '✓' : '✗'}`);
      console.log(`標記檢查點卡片: ${elements.hasCheckpoint ? '✓' : '✗'}`);
      console.log(`時間旅行指令卡片: ${elements.hasRestoreCommand ? '✓' : '✗'}`);
      console.log(`重要檢查點記錄表格: ${elements.hasCheckpointTable ? '✓' : '✗'}`);
      
      if (elements.visibleContent.length > 0) {
        console.log('\n找到的元素：');
        elements.visibleContent.forEach(content => {
          console.log(`  - ${content}`);
        });
      }
      
      if (elements.errors.length > 0) {
        console.log('\n錯誤訊息：');
        elements.errors.forEach(error => {
          console.log(`  - ${error}`);
        });
      }
      
      if (elements.activePaneText) {
        console.log('\n當前分頁內容預覽：');
        console.log(elements.activePaneText);
      }
      
    } else {
      console.log('✗ 未找到時間旅行分頁');
      
      // 列出所有找到的分頁
      const allTabs = await page.evaluate(() => {
        const tabs = document.querySelectorAll('.el-tabs__item');
        return Array.from(tabs).map(tab => tab.textContent.trim());
      });
      
      console.log('\n找到的分頁：');
      allTabs.forEach(tab => {
        console.log(`  - ${tab}`);
      });
    }
    
    // 檢查控制台錯誤
    console.log('\n檢查控制台錯誤...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
    
  } catch (error) {
    console.error('測試失敗:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 執行測試
testTimeTravel().catch(console.error);