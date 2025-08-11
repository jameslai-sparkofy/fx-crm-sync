const puppeteer = require('puppeteer');

async function testWithSystemChrome() {
  let browser;
  
  try {
    console.log('嘗試使用系統瀏覽器...');
    
    // 嘗試不同的瀏覽器路徑
    const chromePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    ];
    
    let executablePath = null;
    for (const path of chromePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(path)) {
          console.log(`找到瀏覽器: ${path}`);
          executablePath = path;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
      console.log(`使用系統瀏覽器: ${executablePath}`);
    } else {
      console.log('未找到系統瀏覽器，使用 Puppeteer 內建瀏覽器');
    }
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    console.log('設置視窗...');
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('訪問網站...');
    await page.goto('https://fx-crm-sync.lai-jameslai.workers.dev/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('等待頁面載入...');
    await page.waitForTimeout(3000);
    
    console.log('截圖首頁...');
    await page.screenshot({ 
      path: 'homepage-test.png',
      fullPage: true 
    });
    
    console.log('檢查時間旅行分頁...');
    const tabs = await page.evaluate(() => {
      const tabElements = document.querySelectorAll('.el-tabs__item');
      return Array.from(tabElements).map(tab => ({
        text: tab.textContent.trim(),
        id: tab.id,
        className: tab.className
      }));
    });
    
    console.log('找到的分頁:', tabs);
    
    // 尋找時間旅行分頁
    const timeTravelTab = tabs.find(tab => tab.text.includes('時間旅行'));
    if (timeTravelTab) {
      console.log('✓ 找到時間旅行分頁');
      
      // 點擊時間旅行分頁
      await page.evaluate(() => {
        const tabs = document.querySelectorAll('.el-tabs__item');
        for (let tab of tabs) {
          if (tab.textContent.includes('時間旅行')) {
            tab.click();
            break;
          }
        }
      });
      
      console.log('等待分頁切換...');
      await page.waitForTimeout(2000);
      
      console.log('截圖時間旅行分頁...');
      await page.screenshot({ 
        path: 'timetravel-test.png',
        fullPage: true 
      });
      
      // 檢查時間旅行內容
      const content = await page.evaluate(() => {
        const backupPane = document.querySelector('[name="backup"]') || 
                          document.querySelector('.el-tab-pane');
        
        if (backupPane) {
          const cards = backupPane.querySelectorAll('.el-card');
          const cardTitles = Array.from(cards).map(card => {
            const header = card.querySelector('.el-card__header');
            return header ? header.textContent.trim() : '';
          });
          
          return {
            hasContent: true,
            cardCount: cards.length,
            cardTitles: cardTitles,
            fullText: backupPane.textContent.substring(0, 500)
          };
        }
        
        return { hasContent: false };
      });
      
      console.log('時間旅行分頁內容:', content);
      
      if (content.hasContent) {
        console.log(`✓ 找到 ${content.cardCount} 個卡片`);
        console.log('✓ 卡片標題:', content.cardTitles);
      } else {
        console.log('✗ 時間旅行分頁沒有內容');
      }
      
    } else {
      console.log('✗ 未找到時間旅行分頁');
    }
    
    console.log('\n測試完成！');
    console.log('截圖已保存:');
    console.log('- homepage-test.png (首頁)');
    console.log('- timetravel-test.png (時間旅行分頁)');
    
  } catch (error) {
    console.error('測試失敗:', error.message);
    
    if (error.message.includes('libnspr4.so')) {
      console.log('\n建議解決方案:');
      console.log('1. 重新啟動終端');
      console.log('2. 或者安裝缺少的套件:');
      console.log('   sudo apt install libnss3-dev libatk-bridge2.0-dev libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2');
    }
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testWithSystemChrome();