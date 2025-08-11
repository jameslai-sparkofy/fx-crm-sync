const fetch = require('node-fetch');

async function triggerFullSync() {
  console.log('觸發案場(SPC)完整同步...');
  
  try {
    const response = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullSync: true
      })
    });
    
    const result = await response.json();
    console.log('同步結果:', JSON.stringify(result, null, 2));
    
    // 等待一下讓同步完成
    console.log('\n等待同步完成...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 檢查數據庫統計
    console.log('\n檢查數據庫統計...');
    const statsResponse = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/database-stats');
    const stats = await statsResponse.json();
    
    const spcTable = stats.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    if (spcTable) {
      console.log('\n案場(SPC)統計:');
      console.log(`- 記錄數: ${spcTable.recordCount}`);
      console.log(`- 最後同步: ${new Date(spcTable.lastSync).toLocaleString('zh-TW')}`);
    }
    
  } catch (error) {
    console.error('錯誤:', error.message);
  }
}

triggerFullSync();