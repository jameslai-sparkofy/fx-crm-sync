const fetch = require('node-fetch');

async function checkOpportunityContacts() {
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
    const currentOpenUserId = userData.empList?.[0]?.openUserId;
    console.log('Got user ID:', currentOpenUserId);
    
    if (!currentOpenUserId) {
      console.log('無法獲取用戶ID');
      return;
    }
    
    console.log('\\n=== 檢查商機連絡人 (NewOpportunityContactsObj) ===');
    
    // Query opportunity contacts
    const contactsRes = await fetch('https://open.fxiaoke.com/cgi/crm/v2/data/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: tokenData.corpId,
        corpAccessToken: tokenData.corpAccessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'NewOpportunityContactsObj',
          search_query_info: {
            offset: 0,
            limit: 5
          }
        }
      })
    });
    
    const contactsData = await contactsRes.json();
    
    if (contactsData.errorCode !== 0) {
      console.log('❌ 查詢失敗:', contactsData.errorMessage);
      console.log('Full response:', JSON.stringify(contactsData, null, 2));
      return;
    }
    
    const contacts = contactsData.data?.dataList || [];
    console.log(`找到 ${contacts.length} 條商機連絡人記錄`);
    
    if (contacts.length > 0) {
      const contact = contacts[0];
      console.log('\\n樣本記錄:');
      console.log('- ID:', contact._id);
      console.log('- 商機ID:', contact.opportunity_id);
      console.log('- 連絡人ID:', contact.contact_id);
      console.log('- 角色:', contact.role);
      console.log('- 參與角色:', contact.field_2K1iG__c);
      
      // Show all fields
      console.log('\\n所有欄位:');
      const fields = Object.keys(contact).sort();
      fields.forEach(field => {
        const value = contact[field];
        const displayValue = value === null ? 'null' : 
                           value === '' ? '(empty)' : 
                           typeof value === 'object' ? JSON.stringify(value) : value;
        console.log(`  ${field}: ${displayValue}`);
      });
    }
    
    // Get total count
    const countRes = await fetch('https://open.fxiaoke.com/cgi/crm/v2/data/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: tokenData.corpId,
        corpAccessToken: tokenData.corpAccessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'NewOpportunityContactsObj',
          search_query_info: {
            offset: 0,
            limit: 1000  // Get more to estimate total
          }
        }
      })
    });
    
    const countData = await countRes.json();
    if (countData.errorCode === 0) {
      const totalEstimate = countData.data?.dataList?.length || 0;
      console.log(`\\n估計總記錄數: ${totalEstimate}+ 條`);
    }
    
  } catch (error) {
    console.error('錯誤:', error);
  }
}

checkOpportunityContacts();