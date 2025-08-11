const cheerio = require('cheerio');
const fs = require('fs');

function analyzeTimeTravelPage() {
    console.log('分析時間旅行頁面結構...\n');
    
    const htmlContent = fs.readFileSync('timetravel-page-_.html', 'utf-8');
    const $ = cheerio.load(htmlContent);
    
    const analysis = {
        timestamp: new Date().toISOString(),
        pageStructure: {},
        timeTravelFeatures: {},
        elements: [],
        scripts: [],
        errors: []
    };
    
    console.log('=== 頁面基本資訊 ===');
    const title = $('title').text();
    console.log(`頁面標題: ${title}`);
    analysis.pageStructure.title = title;
    
    // 分析 Vue.js 應用程式結構
    console.log('\n=== Vue.js 應用程式結構 ===');
    
    // 尋找時間旅行相關的 Tab
    const timeTravelTab = $('el-tab-pane[name="backup"]');
    if (timeTravelTab.length > 0) {
        console.log('✓ 發現時間旅行分頁 (name="backup")');
        const tabLabel = timeTravelTab.attr('label');
        console.log(`  分頁標籤: ${tabLabel}`);
        analysis.timeTravelFeatures.tabExists = true;
        analysis.timeTravelFeatures.tabLabel = tabLabel;
    } else {
        console.log('✗ 未發現時間旅行分頁');
        analysis.timeTravelFeatures.tabExists = false;
    }
    
    console.log('\n=== 時間旅行功能元素分析 ===');
    
    // 1. 資料庫統計卡片
    console.log('\n1. 資料庫統計卡片:');
    const dbStatsCard = $('el-card:contains("資料庫統計")');
    if (dbStatsCard.length > 0) {
        console.log('  ✓ 發現資料庫統計卡片');
        
        // 尋找統計項目
        const statsItems = [];
        dbStatsCard.find('el-descriptions-item').each((i, el) => {
            const label = $(el).attr('label') || $(el).find('[label]').attr('label');
            if (label) {
                statsItems.push(label);
                console.log(`    - ${label}`);
            }
        });
        
        analysis.timeTravelFeatures.databaseStats = {
            exists: true,
            items: statsItems
        };
        
        // 尋找重新整理按鈕
        const refreshBtn = dbStatsCard.find('el-button:contains("重新整理")');
        if (refreshBtn.length > 0) {
            console.log('    ✓ 包含重新整理按鈕');
            analysis.timeTravelFeatures.databaseStats.hasRefreshButton = true;
        }
    } else {
        console.log('  ✗ 未發現資料庫統計卡片');
        analysis.timeTravelFeatures.databaseStats = { exists: false };
    }
    
    // 2. 標記檢查點卡片
    console.log('\n2. 標記檢查點卡片:');
    const checkpointCard = $('el-card:contains("標記檢查點")');
    if (checkpointCard.length > 0) {
        console.log('  ✓ 發現標記檢查點卡片');
        
        // 檢查描述輸入框
        const descriptionInput = checkpointCard.find('el-input[placeholder*="例如"]');
        if (descriptionInput.length > 0) {
            const placeholder = descriptionInput.attr('placeholder');
            console.log(`    ✓ 描述輸入框: ${placeholder}`);
        }
        
        // 檢查標記按鈕
        const markBtn = checkpointCard.find('el-button:contains("標記當前時間點")');
        if (markBtn.length > 0) {
            console.log('    ✓ 標記當前時間點按鈕');
        }
        
        // 檢查提示資訊
        const alertInfo = checkpointCard.find('el-alert[type="info"]');
        if (alertInfo.length > 0) {
            console.log('    ✓ 包含使用提示');
        }
        
        analysis.timeTravelFeatures.checkpointMarker = {
            exists: true,
            hasDescriptionInput: descriptionInput.length > 0,
            hasMarkButton: markBtn.length > 0,
            hasInfoAlert: alertInfo.length > 0
        };
    } else {
        console.log('  ✗ 未發現標記檢查點卡片');
        analysis.timeTravelFeatures.checkpointMarker = { exists: false };
    }
    
    // 3. 時間旅行指令卡片
    console.log('\n3. 時間旅行指令卡片:');
    const commandCard = $('el-card:contains("時間旅行指令")');
    if (commandCard.length > 0) {
        console.log('  ✓ 發現時間旅行指令卡片');
        
        // 檢查時間選擇器
        const datePicker = commandCard.find('el-date-picker');
        if (datePicker.length > 0) {
            console.log('    ✓ 時間選擇器');
        }
        
        // 檢查生成指令按鈕
        const generateBtn = commandCard.find('el-button:contains("生成恢復指令")');
        if (generateBtn.length > 0) {
            console.log('    ✓ 生成恢復指令按鈕');
        }
        
        // 檢查指令顯示區域
        const commandAlert = commandCard.find('el-alert[type="warning"]');
        if (commandAlert.length > 0) {
            console.log('    ✓ 指令顯示區域');
        }
        
        analysis.timeTravelFeatures.commandGenerator = {
            exists: true,
            hasDatePicker: datePicker.length > 0,
            hasGenerateButton: generateBtn.length > 0,
            hasCommandDisplay: commandAlert.length > 0
        };
    } else {
        console.log('  ✗ 未發現時間旅行指令卡片');
        analysis.timeTravelFeatures.commandGenerator = { exists: false };
    }
    
    // 4. 重要檢查點記錄表格
    console.log('\n4. 重要檢查點記錄表格:');
    const checkpointTable = $('el-card:contains("重要檢查點記錄")');
    if (checkpointTable.length > 0) {
        console.log('  ✓ 發現重要檢查點記錄表格');
        
        // 檢查表格欄位
        const tableColumns = [];
        checkpointTable.find('el-table-column').each((i, el) => {
            const label = $(el).attr('label');
            if (label && label !== '操作') {
                tableColumns.push(label);
                console.log(`    - 欄位: ${label}`);
            }
        });
        
        // 檢查操作按鈕
        const actionBtn = checkpointTable.find('el-button:contains("查看恢復指令")');
        if (actionBtn.length > 0) {
            console.log('    ✓ 查看恢復指令按鈕');
        }
        
        analysis.timeTravelFeatures.checkpointTable = {
            exists: true,
            columns: tableColumns,
            hasActionButtons: actionBtn.length > 0
        };
    } else {
        console.log('  ✗ 未發現重要檢查點記錄表格');
        analysis.timeTravelFeatures.checkpointTable = { exists: false };
    }
    
    // 分析 JavaScript 功能
    console.log('\n=== JavaScript 功能分析 ===');
    
    const scriptTags = $('script:not([src])');
    let scriptContent = '';
    if (scriptTags.length > 0) {
        scriptContent = scriptTags.text();
        
        // 檢查 Vue 應用程式的資料屬性
        if (scriptContent.includes('checkpoints:')) {
            console.log('✓ 包含檢查點資料陣列');
        }
        if (scriptContent.includes('checkpointDescription:')) {
            console.log('✓ 包含檢查點描述欄位');
        }
        if (scriptContent.includes('restoreTimestamp:')) {
            console.log('✓ 包含恢復時間戳欄位');
        }
        if (scriptContent.includes('backupStats:')) {
            console.log('✓ 包含備份統計資料');
        }
        
        // 檢查相關方法
        if (scriptContent.includes('loadCheckpoints')) {
            console.log('✓ 包含載入檢查點方法');
        }
        if (scriptContent.includes('markCheckpoint')) {
            console.log('✓ 包含標記檢查點方法');
        }
        if (scriptContent.includes('generateRestoreCommand')) {
            console.log('✓ 包含生成恢復指令方法');
        }
        if (scriptContent.includes('refreshBackupStats')) {
            console.log('✓ 包含重新整理統計方法');
        }
        
        // 檢查 API 端點
        if (scriptContent.includes('/api/backup/checkpoints')) {
            console.log('✓ 使用檢查點 API 端點');
        }
        if (scriptContent.includes('wrangler d1 time-travel')) {
            console.log('✓ 生成 Wrangler 時間旅行指令');
        }
    }
    
    // 生成總結
    console.log('\n=== 功能完整性總結 ===');
    
    const features = [
        { name: '資料庫統計卡片', exists: analysis.timeTravelFeatures.databaseStats?.exists },
        { name: '標記檢查點卡片', exists: analysis.timeTravelFeatures.checkpointMarker?.exists },
        { name: '時間旅行指令卡片', exists: analysis.timeTravelFeatures.commandGenerator?.exists },
        { name: '重要檢查點記錄表格', exists: analysis.timeTravelFeatures.checkpointTable?.exists }
    ];
    
    const existingFeatures = features.filter(f => f.exists).length;
    const totalFeatures = features.length;
    
    console.log(`功能實現狀況: ${existingFeatures}/${totalFeatures} (${Math.round(existingFeatures/totalFeatures*100)}%)`);
    
    features.forEach(feature => {
        const status = feature.exists ? '✓' : '✗';
        console.log(`${status} ${feature.name}`);
    });
    
    // 檢查可能的錯誤或問題
    console.log('\n=== 潛在問題檢查 ===');
    
    // 檢查是否有未定義的 API 路徑
    if (!scriptContent.includes('/api/backup')) {
        console.log('⚠ 可能缺少備份 API 實現');
        analysis.errors.push('缺少備份 API 實現');
    }
    
    // 檢查是否有適當的錯誤處理
    if (!scriptContent.includes('catch')) {
        console.log('⚠ 可能缺少錯誤處理機制');
        analysis.errors.push('缺少錯誤處理機制');
    }
    
    if (analysis.errors.length === 0) {
        console.log('✓ 未發現明顯問題');
    }
    
    // 保存分析結果
    fs.writeFileSync('time-travel-analysis-report.json', JSON.stringify(analysis, null, 2));
    console.log('\n詳細分析報告已保存至: time-travel-analysis-report.json');
    
    return analysis;
}

// 執行分析
try {
    analyzeTimeTravelPage();
    console.log('\n✓ 分析完成！');
} catch (error) {
    console.error('分析過程中發生錯誤:', error);
    process.exit(1);
}