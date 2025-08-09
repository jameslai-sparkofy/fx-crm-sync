const fetch = require('node-fetch');

async function checkModificationField() {
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
    console.log('Got user ID');
    
    // Check 案場(SPC) object_8W9cb__c
    console.log('\n=== Checking 案場(SPC) object_8W9cb__c ===');
    await checkObjectForField(tokenData, userData, 'object_8W9cb__c');
    
    // Check 案場(浴櫃) site_cabinet__c
    console.log('\n=== Checking 案場(浴櫃) site_cabinet__c ===');
    await checkObjectForField(tokenData, userData, 'site_cabinet__c');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function checkObjectForField(tokenData, userData, apiName) {
  try {
    // Get schema
    const schemaRes = await fetch('https://open.fxiaoke.com/cgi/crm/custom/v2/object/describe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: tokenData.corpId,
        corpAccessToken: tokenData.corpAccessToken,
        currentOpenUserId: userData.currentOpenUserId,
        apiName: apiName
      })
    });
    const schemaData = await schemaRes.json();
    
    const modField = schemaData.data?.describe?.fields?.find(f => f.api_name === 'modification_record__c');
    if (modField) {
      console.log('✅ Found modification_record__c field:');
      console.log('  - Label:', modField.label);
      console.log('  - Type:', modField.type);
      console.log('  - Length:', modField.length);
      console.log('  - Required:', modField.is_required);
    } else {
      console.log('❌ modification_record__c field NOT found');
      console.log('Available custom fields:');
      const customFields = schemaData.data?.describe?.fields?.filter(f => f.api_name.endsWith('__c'));
      customFields?.forEach(f => {
        console.log(`  - ${f.api_name}: ${f.label} (${f.type})`);
      });
    }
    
    // Get one record to check field value
    const queryRes = await fetch('https://open.fxiaoke.com/cgi/crm/custom/v2/data/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: tokenData.corpId,
        corpAccessToken: tokenData.corpAccessToken,
        currentOpenUserId: userData.currentOpenUserId,
        data: {
          dataObjectApiName: apiName,
          limit: 1
        }
      })
    });
    const queryData = await queryRes.json();
    
    if (queryData.data?.dataList?.[0]) {
      const record = queryData.data.dataList[0];
      console.log('Sample record check:');
      console.log('  - Has modification_record__c:', 'modification_record__c' in record);
      if ('modification_record__c' in record) {
        console.log('  - Value:', record.modification_record__c || '(empty)');
      }
    }
    
  } catch (error) {
    console.error(`Error checking ${apiName}:`, error.message);
  }
}

checkModificationField();