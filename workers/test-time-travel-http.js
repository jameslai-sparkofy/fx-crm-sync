const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

async function httpGet(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: data
                });
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testTimeTravelHTTP() {
    console.log('開始測試時間旅行功能 (HTTP 方式)...');
    
    const baseUrl = 'https://fx-crm-sync.lai-jameslai.workers.dev';
    const report = {
        timestamp: new Date().toISOString(),
        baseUrl: baseUrl,
        tests: [],
        elements: {
            '資料庫統計卡片': [],
            '標記檢查點卡片': [],
            '時間旅行指令卡片': [],
            '重要檢查點記錄表格': []
        },
        errors: [],
        analysis: {}
    };
    
    try {
        // 測試 1: 訪問首頁
        console.log('1. 測試首頁訪問...');
        const homepageResponse = await httpGet(baseUrl);
        
        report.tests.push({
            name: '首頁訪問',
            url: baseUrl,
            statusCode: homepageResponse.statusCode,
            success: homepageResponse.statusCode === 200
        });
        
        if (homepageResponse.statusCode !== 200) {
            console.error(`首頁訪問失敗，狀態碼: ${homepageResponse.statusCode}`);
            report.errors.push(`首頁訪問失敗，狀態碼: ${homepageResponse.statusCode}`);
        } else {
            console.log('首頁訪問成功');
            
            // 分析首頁內容
            const $ = cheerio.load(homepageResponse.body);
            const title = $('title').text();
            console.log(`首頁標題: ${title}`);
            
            // 保存首頁 HTML
            fs.writeFileSync('homepage.html', homepageResponse.body);
            
            // 尋找時間旅行相關連結
            const timeTravelLinks = [];
            $('a, button').each((i, element) => {
                const text = $(element).text().toLowerCase();
                const href = $(element).attr('href') || '';
                
                if (text.includes('時間旅行') || text.includes('time travel') || 
                    href.includes('time') || href.includes('travel')) {
                    timeTravelLinks.push({
                        text: $(element).text().trim(),
                        href: href,
                        element: element.name
                    });
                }
            });
            
            console.log(`找到 ${timeTravelLinks.length} 個潛在的時間旅行連結:`);
            timeTravelLinks.forEach((link, index) => {
                console.log(`  ${index + 1}. ${link.text} (${link.href})`);
            });
            
            report.analysis.homepageTitle = title;
            report.analysis.timeTravelLinks = timeTravelLinks;
        }
        
        // 測試 2: 嘗試訪問時間旅行相關路徑
        console.log('\n2. 測試時間旅行頁面路徑...');
        
        const timeTravelPaths = [
            '/',
            '/admin',
            '/#time-travel',
            '/?tab=time-travel',
            '/time-travel',
            '/timetravel'
        ];
        
        for (const path of timeTravelPaths) {
            try {
                const fullUrl = baseUrl + path;
                console.log(`  測試路徑: ${fullUrl}`);
                
                const response = await httpGet(fullUrl);
                
                const testResult = {
                    name: `時間旅行路徑測試: ${path}`,
                    url: fullUrl,
                    statusCode: response.statusCode,
                    success: response.statusCode === 200
                };
                
                report.tests.push(testResult);
                
                if (response.statusCode === 200) {
                    console.log(`    ✓ 成功 (${response.statusCode})`);
                    
                    // 分析頁面內容
                    const $ = cheerio.load(response.body);
                    const pageTitle = $('title').text();
                    const bodyText = $('body').text().toLowerCase();
                    
                    // 檢查是否包含時間旅行相關內容
                    const hasTimeTravelContent = 
                        bodyText.includes('時間旅行') || 
                        bodyText.includes('time travel') ||
                        bodyText.includes('檢查點') ||
                        bodyText.includes('checkpoint') ||
                        bodyText.includes('database stats') ||
                        bodyText.includes('資料庫統計');
                    
                    if (hasTimeTravelContent) {
                        console.log(`    ✓ 包含時間旅行相關內容`);
                        
                        // 保存這個頁面的 HTML
                        const filename = `timetravel-page-${path.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
                        fs.writeFileSync(filename, response.body);
                        
                        // 分析頁面元素
                        await analyzeTimeTravelElements($, report.elements);
                        
                        testResult.hasTimeTravelContent = true;
                        testResult.pageTitle = pageTitle;
                        testResult.savedFile = filename;
                    }
                } else {
                    console.log(`    ✗ 失敗 (${response.statusCode})`);
                }
                
                // 避免過於頻繁的請求
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`    ✗ 錯誤: ${error.message}`);
                report.errors.push(`路徑 ${path} 測試失敗: ${error.message}`);
            }
        }
        
        // 測試 3: 檢查 API 端點
        console.log('\n3. 測試相關 API 端點...');
        
        const apiPaths = [
            '/api/backup',
            '/api/schema',
            '/api/debug',
            '/admin/api/backup'
        ];
        
        for (const path of apiPaths) {
            try {
                const fullUrl = baseUrl + path;
                console.log(`  測試 API: ${fullUrl}`);
                
                const response = await httpGet(fullUrl);
                
                const testResult = {
                    name: `API 端點測試: ${path}`,
                    url: fullUrl,
                    statusCode: response.statusCode,
                    success: response.statusCode === 200 || response.statusCode === 404
                };
                
                report.tests.push(testResult);
                console.log(`    狀態: ${response.statusCode}`);
                
                if (response.statusCode === 200) {
                    // 檢查是否為 JSON 回應
                    try {
                        const jsonData = JSON.parse(response.body);
                        testResult.isJson = true;
                        testResult.dataKeys = Object.keys(jsonData);
                        console.log(`    ✓ JSON 回應，包含鍵: ${Object.keys(jsonData).join(', ')}`);
                    } catch (e) {
                        testResult.isJson = false;
                        console.log(`    → 非 JSON 回應`);
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.log(`    ✗ 錯誤: ${error.message}`);
                report.errors.push(`API ${path} 測試失敗: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('測試過程中發生錯誤:', error);
        report.errors.push(`主要錯誤: ${error.message}`);
    }
    
    // 生成測試報告
    console.log('\n=== 測試結果總結 ===');
    console.log(`基礎 URL: ${report.baseUrl}`);
    console.log(`測試時間: ${report.timestamp}`);
    console.log(`總測試數: ${report.tests.length}`);
    console.log(`成功測試: ${report.tests.filter(t => t.success).length}`);
    console.log(`失敗測試: ${report.tests.filter(t => !t.success).length}`);
    console.log(`錯誤數量: ${report.errors.length}`);
    
    console.log('\n測試詳情:');
    report.tests.forEach((test, index) => {
        const status = test.success ? '✓' : '✗';
        console.log(`${index + 1}. ${status} ${test.name} (${test.statusCode})`);
        if (test.pageTitle) {
            console.log(`     標題: ${test.pageTitle}`);
        }
        if (test.hasTimeTravelContent) {
            console.log(`     ✓ 包含時間旅行內容`);
        }
    });
    
    console.log('\n發現的時間旅行元素:');
    Object.entries(report.elements).forEach(([key, elements]) => {
        console.log(`${key}: ${elements.length} 個`);
        elements.forEach((element, index) => {
            console.log(`  ${index + 1}. ${element.substring(0, 100)}${element.length > 100 ? '...' : ''}`);
        });
    });
    
    if (report.errors.length > 0) {
        console.log('\n錯誤列表:');
        report.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }
    
    // 保存完整報告
    fs.writeFileSync('time-travel-http-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n完整報告已保存至: time-travel-http-test-report.json');
    
    return report;
}

async function analyzeTimeTravelElements($, elements) {
    // 分析資料庫統計卡片
    $('[class*="stat"], [class*="card"], .database-stats, [data-testid*="stat"]').each((i, element) => {
        const text = $(element).text();
        if (text && (text.includes('資料庫') || text.includes('database') || text.includes('統計') || text.includes('stats'))) {
            elements['資料庫統計卡片'].push(text.trim());
        }
    });
    
    // 分析檢查點相關元素
    $('[class*="checkpoint"], [class*="marker"], button, .btn').each((i, element) => {
        const text = $(element).text();
        if (text && (text.includes('檢查點') || text.includes('checkpoint') || text.includes('標記') || text.includes('mark'))) {
            elements['標記檢查點卡片'].push(text.trim());
        }
    });
    
    // 分析指令相關元素
    $('[class*="command"], [class*="instruction"], code, pre, .code').each((i, element) => {
        const text = $(element).text();
        if (text && (text.includes('指令') || text.includes('command') || text.includes('時間旅行') || text.includes('time travel'))) {
            elements['時間旅行指令卡片'].push(text.trim());
        }
    });
    
    // 分析表格元素
    $('table, [class*="table"], .grid, [role="table"]').each((i, element) => {
        const text = $(element).text();
        if (text && (text.includes('檢查點') || text.includes('checkpoint') || text.includes('記錄') || text.includes('record'))) {
            elements['重要檢查點記錄表格'].push(text.trim());
        }
    });
    
    // 額外檢查：尋找任何可能相關的元素
    $('div, section, article').each((i, element) => {
        const text = $(element).text();
        const className = $(element).attr('class') || '';
        
        if ((text.includes('時間旅行') || text.includes('time travel')) && text.length > 10 && text.length < 500) {
            // 判斷元素類型
            if (className.includes('card') || className.includes('panel')) {
                elements['時間旅行指令卡片'].push(text.trim());
            } else if ($(element).find('table').length > 0) {
                elements['重要檢查點記錄表格'].push(text.trim());
            }
        }
    });
}

// 執行測試
testTimeTravelHTTP()
    .then(report => {
        console.log('\n測試完成！');
        process.exit(0);
    })
    .catch(error => {
        console.error('測試失敗:', error);
        process.exit(1);
    });