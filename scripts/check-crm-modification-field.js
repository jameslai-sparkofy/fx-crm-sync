const fetch = require('node-fetch');

async function checkCRMModificationField() {
  try {
    // Get token
    const tokenRes = await fetch('https://open.fxiaoke.com/cgi/corpAccessToken/get/V2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: 'FSAID_1320691',
        appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
        permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
      })
    });
    const tokenData = await tokenRes.json();
    console.log('Got token for corp:', tokenData.corpId);
    
    // Get user ID
    const userRes = await fetch('https://open.fxiaoke.com/cgi/user/getByMobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: tokenData.corpId,
        corpAccessToken: tokenData.corpAccessToken,
        mobile: '17675662629'
      })
    });
    const userData = await userRes.json();
    
    if (userData.errorCode) {
      console.log('Error getting user:', userData.errorMessage);
      return;
    }
    
    const currentOpenUserId = userData.empList?.[0]?.openUserId;
    console.log('Got user ID:', currentOpenUserId, '\n');
    
    if (!currentOpenUserId) {
      console.log('Full user response:', JSON.stringify(userData, null, 2));
      return;
    }
    
    // Query 案場(SPC) data directly from CRM
    console.log('=== Checking 案場(SPC) from CRM ===');
    const spcRes = await fetch('https://open.fxiaoke.com/cgi/crm/custom/v2/data/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: tokenData.corpId,
        corpAccessToken: tokenData.corpAccessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          limit: 2
        }
      })
    });
    const spcData = await spcRes.json();
    
    if (spcData.errorCode) {
      console.log('Error querying object_8W9cb__c:', spcData.errorMessage);
      console.log('Full response:', JSON.stringify(spcData, null, 2));
    } else if (spcData.data?.dataList?.[0]) {
      const record = spcData.data.dataList[0];
      console.log('Sample record from CRM:');
      console.log('- Record ID:', record._id);
      
      // Check all fields
      const allFields = Object.keys(record).sort();
      console.log(`\nTotal fields: ${allFields.length}`);
      
      // Look for modification_record__c
      if ('modification_record__c' in record) {
        console.log('\n✅ Found modification_record__c field!');
        console.log('Value:', JSON.stringify(record.modification_record__c, null, 2));
      } else {
        console.log('\n❌ modification_record__c not found in CRM data');
      }
      
      // Show all custom fields
      console.log('\nAll custom fields (__c):');
      const customFields = allFields.filter(f => f.includes('__c'));
      customFields.forEach(f => {
        const value = record[f];
        const displayValue = value === null ? 'null' : 
                           value === '' ? '(empty)' : 
                           typeof value === 'object' ? JSON.stringify(value) : value;
        console.log(`  ${f}: ${displayValue}`);
      });
    } else {
      console.log('No data returned from CRM');
      console.log('Full response:', JSON.stringify(spcData, null, 2));
    }
    
    // Query 案場(浴櫃) data
    console.log('\n=== Checking 案場(浴櫃) from CRM ===');
    const cabinetRes = await fetch('https://open.fxiaoke.com/cgi/crm/custom/v2/data/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: tokenData.corpId,
        corpAccessToken: tokenData.corpAccessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'site_cabinet__c',
          limit: 2
        }
      })
    });
    const cabinetData = await cabinetRes.json();
    
    if (cabinetData.errorCode) {
      console.log('Error querying site_cabinet__c:', cabinetData.errorMessage);
    } else if (cabinetData.data?.dataList?.[0]) {
      const record = cabinetData.data.dataList[0];
      console.log('Sample record from CRM:');
      console.log('- Record ID:', record._id);
      
      if ('modification_record__c' in record) {
        console.log('\n✅ Found modification_record__c field!');
        console.log('Value:', JSON.stringify(record.modification_record__c, null, 2));
      } else {
        console.log('\n❌ modification_record__c not found in CRM data');
      }
    } else {
      console.log('No data found for site_cabinet__c');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCRMModificationField();