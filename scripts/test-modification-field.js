import fetch from 'node-fetch';

async function testModificationFieldSync() {
  const workerUrl = 'https://fx-crm-sync.lai-jameslai.workers.dev';
  console.log('Testing modification_record__c field sync...');

  try {
    // Test site_cabinet__c sync
    console.log('\n1. Testing site_cabinet__c sync...');
    const siteCabinetResponse = await fetch(`${workerUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectName: 'site_cabinet__c',
        fullSync: false,
        limit: 10
      })
    });

    if (siteCabinetResponse.ok) {
      const result = await siteCabinetResponse.json();
      console.log('✅ Site cabinet sync:', result);
    } else {
      console.error('❌ Site cabinet sync failed:', await siteCabinetResponse.text());
    }

    // Test object_8w9cb__c (sites) sync  
    console.log('\n2. Testing object_8w9cb__c sync...');
    const sitesResponse = await fetch(`${workerUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectName: 'object_8w9cb__c', 
        fullSync: false,
        limit: 10
      })
    });

    if (sitesResponse.ok) {
      const result = await sitesResponse.json();
      console.log('✅ Sites sync:', result);
    } else {
      console.error('❌ Sites sync failed:', await sitesResponse.text());
    }

    // Check if modification_record__c field exists in synced records
    console.log('\n3. Verifying modification_record__c field in database...');
    
    // Check site_cabinet__c table
    const checkCabinetResponse = await fetch(`${workerUrl}/api/debug/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT _id, name, modification_record__c FROM site_cabinet__c LIMIT 5`
      })
    });

    if (checkCabinetResponse.ok) {
      const result = await checkCabinetResponse.json();
      console.log('✅ site_cabinet__c modification_record__c field check:', result);
    } else {
      console.error('❌ site_cabinet__c field check failed:', await checkCabinetResponse.text());
    }

    // Check object_8w9cb__c table  
    const checkSitesResponse = await fetch(`${workerUrl}/api/debug/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT _id, name, modification_record__c FROM object_8w9cb__c LIMIT 5`
      })
    });

    if (checkSitesResponse.ok) {
      const result = await checkSitesResponse.json();
      console.log('✅ object_8w9cb__c modification_record__c field check:', result);
    } else {
      console.error('❌ object_8w9cb__c field check failed:', await checkSitesResponse.text());
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testModificationFieldSync();