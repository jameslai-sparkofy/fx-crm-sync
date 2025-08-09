const fetch = require('node-fetch');

/**
 * 同步所有剩餘的對象
 */
async function syncAllRemainingObjects() {
  const baseUrl = 'https://fx-crm-sync.lai-jameslai.workers.dev';
  
  // 要同步的對象列表
  const objects = [
    {
      name: '供應商',
      apiName: 'SupplierObj',
      endpoint: '/api/sync/SupplierObj/start',
      isStandard: true
    },
    {
      name: 'SPC維修單',
      apiName: 'object_k1XqG__c', 
      endpoint: '/api/sync/object_k1XqG__c/start',
      isStandard: false
    },
    {
      name: '案場(浴櫃)',
      apiName: 'site_cabinet__c',
      endpoint: '/api/sync/site_cabinet__c/start', 
      isStandard: false
    },
    {
      name: '進度管理公告',
      apiName: 'progress_management_announ__c',
      endpoint: '/api/sync/progress_management_announ__c/start',
      isStandard: false
    }
  ];
  
  console.log('開始同步所有剩餘對象...\n');
  
  for (const obj of objects) {
    console.log(`=== 正在同步 ${obj.name} (${obj.apiName}) ===`);
    
    try {
      // 手動觸發同步
      const syncResponse = await fetch(`${baseUrl}${obj.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullSync: true
        })
      });
      
      if (syncResponse.ok) {
        const result = await syncResponse.json();
        console.log(`✅ ${obj.name} 同步成功:`, result);
        
        // 等待一下再同步下個對象
        console.log('等待 5 秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } else {
        const error = await syncResponse.text();
        console.log(`❌ ${obj.name} 同步失敗:`, error);
      }
      
    } catch (error) {
      console.log(`❌ ${obj.name} 同步異常:`, error.message);
    }
    
    console.log('');
  }
  
  // 檢查最終狀態
  console.log('=== 檢查最終同步狀態 ===');
  try {
    const statusResponse = await fetch(`${baseUrl}/api/sync/database-stats`);
    if (statusResponse.ok) {
      const stats = await statusResponse.json();
      console.log('資料庫統計:', JSON.stringify(stats, null, 2));
    }
  } catch (error) {
    console.log('獲取統計失敗:', error.message);
  }
}

syncAllRemainingObjects().catch(console.error);