// 完整同步案場(SPC)數據
const axios = require('axios');

const API_URL = 'https://fx-crm-sync-dev.lai-jameslai.workers.dev';

async function syncSPC() {
    console.log('🚀 開始同步案場(SPC)數據...');
    console.log('目標：同步 4191 筆記錄');
    console.log('=====================================\n');
    
    try {
        // 1. 先檢查當前狀態
        console.log('📊 檢查當前資料庫狀態...');
        const statsResponse = await axios.get(`${API_URL}/api/sync/database-stats`);
        const currentStats = statsResponse.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
        console.log(`當前記錄數：${currentStats.recordCount}`);
        console.log(`最後同步時間：${currentStats.lastSync}\n`);
        
        // 2. 執行完整同步
        console.log('🔄 開始執行完整同步...');
        console.log('這可能需要幾分鐘時間，請耐心等待...\n');
        
        const syncResponse = await axios.post(
            `${API_URL}/api/sync/object_8W9cb__c/start`,
            {
                fullSync: true,
                batchSize: 500,  // 使用較大批次
                maxBatches: 20   // 允許更多批次
            },
            {
                timeout: 300000,  // 5分鐘超時
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (syncResponse.data.success) {
            const result = syncResponse.data.data;
            console.log('✅ 同步完成！');
            console.log('=====================================');
            console.log(`同步記錄數：${result.syncedCount}`);
            console.log(`總處理數：${result.totalProcessed}`);
            console.log(`執行時間：${result.executionTime}`);
            console.log(`是否還有更多：${result.hasMore ? '是' : '否'}`);
            
            if (result.errors && result.errors.length > 0) {
                console.log('\n⚠️ 同步錯誤：');
                result.errors.forEach(err => console.log(`  - ${err}`));
            }
        } else {
            console.error('❌ 同步失敗：', syncResponse.data.error);
        }
        
        // 3. 再次檢查狀態
        console.log('\n📊 檢查更新後的狀態...');
        const finalStatsResponse = await axios.get(`${API_URL}/api/sync/database-stats`);
        const finalStats = finalStatsResponse.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
        console.log(`最終記錄數：${finalStats.recordCount}`);
        
        if (finalStats.recordCount < 4191) {
            console.log(`\n⚠️ 記錄數少於預期 (4191)，差異：${4191 - finalStats.recordCount}`);
            console.log('可能原因：');
            console.log('  1. 部分記錄狀態為「作廢」被過濾');
            console.log('  2. 同步未完成，需要繼續執行');
        } else {
            console.log('\n✅ 所有記錄同步成功！');
        }
        
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error('❌ 同步超時！請重新執行腳本繼續同步。');
        } else if (error.response) {
            console.error('❌ API 錯誤：', error.response.data);
        } else {
            console.error('❌ 執行錯誤：', error.message);
        }
    }
}

// 執行同步
syncSPC();