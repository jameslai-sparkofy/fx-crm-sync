const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testWebsite() {
    let browser;
    try {
        console.log('啟動瀏覽器...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // 設置視窗大小
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log('步驟 1: 導航到網站...');
        await page.goto('https://fx-crm-sync.lai-jameslai.workers.dev/', { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('步驟 2: 截圖首頁...');
        await page.screenshot({ 
            path: 'homepage-screenshot.png',
            fullPage: true
        });
        console.log('首頁截圖已保存: homepage-screenshot.png');
        
        console.log('步驟 3: 尋找並點擊「時間旅行」分頁...');
        
        // 嘗試多種可能的選擇器
        const timeTabSelectors = [
            '.el-tabs__item:contains("時間旅行")',
            '[data-tab="time_travel"]',
            'a[href*="time_travel"]',
            'button:contains("時間旅行")',
            '.tab:contains("時間旅行")',
            '.nav-item:contains("時間旅行")'
        ];
        
        let tabClicked = false;
        for (const selector of timeTabSelectors) {
            try {
                // 由於 :contains 不是標準 CSS 選擇器，我們需要用 XPath
                if (selector.includes(':contains')) {
                    const xpath = `//button[contains(text(), '時間旅行')] | //a[contains(text(), '時間旅行')] | //div[contains(text(), '時間旅行')] | //span[contains(text(), '時間旅行')]`;
                    const elements = await page.$x(xpath);
                    if (elements.length > 0) {
                        console.log(`找到時間旅行元素，使用 XPath: ${xpath}`);
                        await elements[0].click();
                        tabClicked = true;
                        break;
                    }
                } else {
                    const element = await page.$(selector);
                    if (element) {
                        console.log(`找到時間旅行元素，使用選擇器: ${selector}`);
                        await element.click();
                        tabClicked = true;
                        break;
                    }
                }
            } catch (error) {
                console.log(`嘗試選擇器 ${selector} 失敗:`, error.message);
            }
        }
        
        if (!tabClicked) {
            console.log('無法找到時間旅行分頁，檢查頁面內容...');
            const pageContent = await page.content();
            
            // 保存頁面內容以供調試
            fs.writeFileSync('page-debug.html', pageContent);
            console.log('頁面內容已保存到 page-debug.html');
            
            // 查找包含"時間"的文本
            const timeElements = await page.evaluate(() => {
                const allElements = document.querySelectorAll('*');
                const results = [];
                for (let element of allElements) {
                    if (element.textContent && element.textContent.includes('時間')) {
                        results.push({
                            tagName: element.tagName,
                            className: element.className,
                            textContent: element.textContent.trim(),
                            id: element.id
                        });
                    }
                }
                return results;
            });
            
            console.log('包含"時間"的元素:', timeElements);
            
            // 嘗試點擊第一個包含"時間旅行"的元素
            const timeElement = await page.evaluate(() => {
                const allElements = document.querySelectorAll('*');
                for (let element of allElements) {
                    if (element.textContent && element.textContent.includes('時間旅行')) {
                        element.click();
                        return true;
                    }
                }
                return false;
            });
            
            if (timeElement) {
                console.log('通過 evaluate 點擊了時間旅行元素');
                tabClicked = true;
            }
        }
        
        console.log('步驟 4: 等待 2 秒讓頁面載入...');
        await page.waitForTimeout(2000);
        
        console.log('步驟 5: 截圖時間旅行分頁...');
        await page.screenshot({ 
            path: 'timetravel-screenshot.png',
            fullPage: true
        });
        console.log('時間旅行分頁截圖已保存: timetravel-screenshot.png');
        
        console.log('步驟 6: 檢查頁面元素...');
        const pageAnalysis = await page.evaluate(() => {
            const analysis = {
                url: window.location.href,
                title: document.title,
                hasTimeTravelContent: false,
                elements: {
                    buttons: document.querySelectorAll('button').length,
                    inputs: document.querySelectorAll('input').length,
                    tables: document.querySelectorAll('table').length,
                    forms: document.querySelectorAll('form').length
                },
                timeTravelElements: []
            };
            
            // 檢查是否有時間旅行相關內容
            const allText = document.body.textContent || document.body.innerText || '';
            if (allText.includes('時間旅行') || allText.includes('時間') || allText.includes('旅行')) {
                analysis.hasTimeTravelContent = true;
            }
            
            // 收集所有可見的文本內容
            const visibleElements = document.querySelectorAll('*');
            for (let element of visibleElements) {
                if (element.offsetParent !== null && element.textContent.trim()) {
                    if (element.textContent.includes('時間') || element.textContent.includes('旅行')) {
                        analysis.timeTravelElements.push({
                            tagName: element.tagName,
                            className: element.className,
                            textContent: element.textContent.trim().substring(0, 100),
                            id: element.id
                        });
                    }
                }
            }
            
            return analysis;
        });
        
        console.log('頁面分析結果:');
        console.log(JSON.stringify(pageAnalysis, null, 2));
        
        // 保存分析結果
        fs.writeFileSync('page-analysis.json', JSON.stringify(pageAnalysis, null, 2));
        console.log('頁面分析結果已保存到 page-analysis.json');
        
        console.log('\n=== 測試完成 ===');
        console.log(`分頁點擊狀態: ${tabClicked ? '成功' : '失敗'}`);
        console.log(`時間旅行內容檢測: ${pageAnalysis.hasTimeTravelContent ? '找到' : '未找到'}`);
        console.log(`頁面 URL: ${pageAnalysis.url}`);
        console.log(`頁面標題: ${pageAnalysis.title}`);
        
    } catch (error) {
        console.error('測試過程中發生錯誤:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 執行測試
testWebsite().catch(console.error);