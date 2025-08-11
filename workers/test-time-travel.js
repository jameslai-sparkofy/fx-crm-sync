const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testTimeTravelFunctionality() {
    console.log('開始測試時間旅行功能...');
    
    let browser;
    try {
        // 啟動瀏覽器
        browser = await puppeteer.launch({ 
            headless: true, // 使用 headless 模式
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1200,800'
            ]
        });
        
        const page = await browser.newPage();
        
        // 設定視窗大小
        await page.setViewport({ width: 1200, height: 800 });
        
        // 監聽控制台訊息
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            });
            console.log(`Console ${msg.type()}: ${msg.text()}`);
        });
        
        // 監聽錯誤
        const errors = [];
        page.on('error', error => {
            errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            console.error('頁面錯誤:', error.message);
        });
        
        page.on('pageerror', error => {
            errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            console.error('頁面腳本錯誤:', error.message);
        });
        
        console.log('1. 訪問網站...');
        await page.goto('https://fx-crm-sync.lai-jameslai.workers.dev/', { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // 等待頁面載入
        await page.waitForTimeout(2000);
        
        console.log('2. 截圖首頁...');
        await page.screenshot({ path: 'homepage-screenshot.png', fullPage: true });
        
        // 檢查首頁是否正確載入
        const title = await page.title();
        console.log(`首頁標題: ${title}`);
        
        console.log('3. 尋找並點擊「時間旅行」分頁...');
        
        // 等待導航元素出現
        try {
            await page.waitForSelector('nav, .nav, [role="navigation"], a', { timeout: 10000 });
        } catch (error) {
            console.log('未找到導航元素，嘗試尋找時間旅行相關連結...');
        }
        
        // 多種方式尋找時間旅行連結
        let timeTravelLink = null;
        
        // 方法1: 透過文字內容尋找
        try {
            timeTravelLink = await page.$x("//a[contains(text(), '時間旅行')]");
            if (timeTravelLink.length === 0) {
                timeTravelLink = await page.$x("//a[contains(text(), 'Time Travel')]");
            }
            if (timeTravelLink.length === 0) {
                timeTravelLink = await page.$x("//button[contains(text(), '時間旅行')]");
            }
            if (timeTravelLink.length === 0) {
                timeTravelLink = await page.$x("//button[contains(text(), 'Time Travel')]");
            }
        } catch (error) {
            console.log('XPath 搜尋失敗:', error.message);
        }
        
        // 方法2: 透過 CSS 選擇器尋找
        if (!timeTravelLink || timeTravelLink.length === 0) {
            try {
                const links = await page.$$('a, button');
                for (let link of links) {
                    const text = await page.evaluate(el => el.textContent, link);
                    if (text && (text.includes('時間旅行') || text.includes('Time Travel'))) {
                        timeTravelLink = [link];
                        break;
                    }
                }
            } catch (error) {
                console.log('CSS 選擇器搜尋失敗:', error.message);
            }
        }
        
        // 方法3: 檢查 href 屬性
        if (!timeTravelLink || timeTravelLink.length === 0) {
            try {
                const links = await page.$$('a[href*="time"], a[href*="travel"]');
                if (links.length > 0) {
                    timeTravelLink = links;
                }
            } catch (error) {
                console.log('href 搜尋失敗:', error.message);
            }
        }
        
        if (timeTravelLink && timeTravelLink.length > 0) {
            console.log('找到時間旅行連結，正在點擊...');
            await timeTravelLink[0].click();
            
            console.log('4. 等待時間旅行頁面載入...');
            await page.waitForTimeout(3000);
            
            // 等待可能的導航完成
            try {
                await page.waitForFunction(
                    () => document.readyState === 'complete',
                    { timeout: 10000 }
                );
            } catch (error) {
                console.log('等待頁面完成載入超時，繼續執行...');
            }
            
        } else {
            console.log('未找到時間旅行連結，嘗試透過 URL 直接訪問...');
            
            // 嘗試常見的時間旅行頁面路徑
            const possiblePaths = [
                '/time-travel',
                '/timetravel', 
                '/#time-travel',
                '/?tab=time-travel',
                '/admin#time-travel'
            ];
            
            let found = false;
            for (let path of possiblePaths) {
                try {
                    console.log(`嘗試訪問: https://fx-crm-sync.lai-jameslai.workers.dev${path}`);
                    await page.goto(`https://fx-crm-sync.lai-jameslai.workers.dev${path}`, { 
                        waitUntil: 'networkidle2',
                        timeout: 15000
                    });
                    await page.waitForTimeout(2000);
                    
                    // 檢查頁面是否包含時間旅行相關內容
                    const content = await page.content();
                    if (content.includes('時間旅行') || content.includes('Time Travel') || 
                        content.includes('檢查點') || content.includes('checkpoint')) {
                        found = true;
                        console.log(`成功找到時間旅行頁面: ${path}`);
                        break;
                    }
                } catch (error) {
                    console.log(`路徑 ${path} 訪問失敗:`, error.message);
                }
            }
            
            if (!found) {
                console.log('無法找到時間旅行頁面，將對當前頁面進行分析...');
            }
        }
        
        console.log('5. 截圖時間旅行頁面...');
        await page.screenshot({ path: 'timetravel-screenshot.png', fullPage: true });
        
        console.log('6. 檢查頁面元素...');
        
        // 檢查各種元素
        const elements = {
            '資料庫統計卡片': [],
            '標記檢查點卡片': [],
            '時間旅行指令卡片': [],
            '重要檢查點記錄表格': []
        };
        
        // 尋找資料庫統計相關元素
        try {
            const dbStats = await page.$$('[class*="stat"], [class*="card"], .database-stats, [data-testid*="stat"]');
            for (let element of dbStats) {
                const text = await page.evaluate(el => el.textContent, element);
                if (text && (text.includes('資料庫') || text.includes('database') || text.includes('統計') || text.includes('stats'))) {
                    elements['資料庫統計卡片'].push(text.substring(0, 100));
                }
            }
        } catch (error) {
            console.log('搜尋資料庫統計元素時出錯:', error.message);
        }
        
        // 尋找標記檢查點相關元素
        try {
            const checkpoints = await page.$$('[class*="checkpoint"], [class*="marker"], button, .btn');
            for (let element of checkpoints) {
                const text = await page.evaluate(el => el.textContent, element);
                if (text && (text.includes('檢查點') || text.includes('checkpoint') || text.includes('標記') || text.includes('mark'))) {
                    elements['標記檢查點卡片'].push(text.substring(0, 100));
                }
            }
        } catch (error) {
            console.log('搜尋檢查點元素時出錯:', error.message);
        }
        
        // 尋找時間旅行指令相關元素
        try {
            const commands = await page.$$('[class*="command"], [class*="instruction"], code, pre, .code');
            for (let element of commands) {
                const text = await page.evaluate(el => el.textContent, element);
                if (text && (text.includes('指令') || text.includes('command') || text.includes('時間旅行') || text.includes('time travel'))) {
                    elements['時間旅行指令卡片'].push(text.substring(0, 100));
                }
            }
        } catch (error) {
            console.log('搜尋指令元素時出錯:', error.message);
        }
        
        // 尋找表格相關元素
        try {
            const tables = await page.$$('table, [class*="table"], .grid, [role="table"]');
            for (let table of tables) {
                const text = await page.evaluate(el => el.textContent, table);
                if (text && (text.includes('檢查點') || text.includes('checkpoint') || text.includes('記錄') || text.includes('record'))) {
                    elements['重要檢查點記錄表格'].push(text.substring(0, 200));
                }
            }
        } catch (error) {
            console.log('搜尋表格元素時出錯:', error.message);
        }
        
        // 獲取頁面所有文字內容用於分析
        const pageContent = await page.evaluate(() => document.body.textContent);
        
        // 生成測試報告
        const report = {
            timestamp: new Date().toISOString(),
            url: page.url(),
            title: await page.title(),
            elements: elements,
            consoleMessages: consoleMessages,
            errors: errors,
            pageContent: pageContent.substring(0, 2000), // 只保留前2000字符
            screenshots: ['homepage-screenshot.png', 'timetravel-screenshot.png']
        };
        
        // 保存報告
        fs.writeFileSync('time-travel-test-report.json', JSON.stringify(report, null, 2));
        
        console.log('\n=== 測試結果總結 ===');
        console.log(`網站 URL: ${report.url}`);
        console.log(`頁面標題: ${report.title}`);
        console.log(`截圖檔案: ${report.screenshots.join(', ')}`);
        
        console.log('\n發現的元素:');
        Object.entries(elements).forEach(([key, value]) => {
            console.log(`${key}: ${value.length} 個`);
            value.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item}`);
            });
        });
        
        console.log(`\n控制台訊息: ${consoleMessages.length} 條`);
        console.log(`錯誤訊息: ${errors.length} 條`);
        
        if (errors.length > 0) {
            console.log('\n錯誤詳情:');
            errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
            });
        }
        
        console.log('\n測試完成！詳細報告已保存至 time-travel-test-report.json');
        
        return report;
        
    } catch (error) {
        console.error('測試過程中發生錯誤:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 執行測試
testTimeTravelFunctionality()
    .then(report => {
        console.log('測試成功完成');
        process.exit(0);
    })
    .catch(error => {
        console.error('測試失敗:', error);
        process.exit(1);
    });