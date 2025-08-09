const fetch = require('node-fetch');

async function getAllFields() {
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
    console.log('Got user ID\n');
    
    // Check both objects
    const objects = [
      { name: '案場(SPC)', apiName: 'object_8W9cb__c' },
      { name: '案場(浴櫃)', apiName: 'site_cabinet__c' }
    ];
    
    for (const obj of objects) {
      console.log(`=== ${obj.name} (${obj.apiName}) ===`);
      
      // Get schema
      const schemaRes = await fetch('https://open.fxiaoke.com/cgi/crm/custom/v2/object/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: tokenData.corpId,
          corpAccessToken: tokenData.corpAccessToken,
          currentOpenUserId: userData.currentOpenUserId,
          apiName: obj.apiName
        })
      });
      const schemaData = await schemaRes.json();
      
      if (schemaData.data?.describe?.fields) {
        const fields = schemaData.data.describe.fields;
        console.log(`Total fields: ${fields.length}`);
        
        // Show all fields with "__c" suffix
        console.log('\nCustom fields (__c):');
        const customFields = fields.filter(f => f.api_name.includes('__c'));
        customFields.forEach(f => {
          console.log(`  ${f.api_name}: ${f.label} (${f.type})`);
        });
        
        // Specifically look for modification
        const modFields = fields.filter(f => 
          f.api_name.toLowerCase().includes('modif') || 
          f.label.includes('修改') ||
          f.label.toLowerCase().includes('modif')
        );
        
        if (modFields.length > 0) {
          console.log('\nModification-related fields:');
          modFields.forEach(f => {
            console.log(`  ${f.api_name}: ${f.label} (${f.type})`);
          });
        }
      }
      
      // Get sample data to see actual fields
      console.log('\nChecking actual data fields:');
      const queryRes = await fetch('https://open.fxiaoke.com/cgi/crm/custom/v2/data/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: tokenData.corpId,
          corpAccessToken: tokenData.corpAccessToken,
          currentOpenUserId: userData.currentOpenUserId,
          data: {
            dataObjectApiName: obj.apiName,
            limit: 1
          }
        })
      });
      const queryData = await queryRes.json();
      
      if (queryData.data?.dataList?.[0]) {
        const record = queryData.data.dataList[0];
        const recordFields = Object.keys(record);
        
        // Check for modification_record__c
        if (recordFields.includes('modification_record__c')) {
          console.log('✅ Found modification_record__c in actual data!');
          console.log('  Value:', record.modification_record__c || '(empty)');
        }
        
        // Show all __c fields in the record
        const customDataFields = recordFields.filter(f => f.includes('__c'));
        console.log(`Custom fields in data (${customDataFields.length}):`, customDataFields.join(', '));
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

getAllFields();