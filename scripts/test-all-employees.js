#!/usr/bin/env node

/**
 * 測試獲取所有員工的 API
 */

const fetch = require('node-fetch');

const CRM_CONFIG = {
  baseUrl: 'https://open.fxiaoke.com',
  appId: 'FSAID_1320691',
  appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  const response = await fetch(`${CRM_CONFIG.baseUrl}/cgi/corpAccessToken/get/V2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: CRM_CONFIG.appId,
      appSecret: CRM_CONFIG.appSecret,
      permanentCode: CRM_CONFIG.permanentCode
    })
  });
  
  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`Token 獲取失敗: ${data.errorMessage}`);
  }
  
  return {
    corpId: data.corpId,
    corpAccessToken: data.corpAccessToken
  };
}

async function getCurrentUserId(corpId, corpAccessToken) {
  const response = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/getByMobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      corpId: corpId,
      corpAccessToken: corpAccessToken,
      mobile: "17675662629"
    })
  });
  
  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`用戶獲取失敗: ${data.errorMessage}`);
  }
  
  return data.empList[0].openUserId;
}

async function getAllEmployees() {
  console.log('🔍 開始獲取所有員工...\n');
  
  try {
    // 獲取認證資訊
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    
    console.log('✅ 獲取認證成功');
    console.log(`   Corp ID: ${corpId}`);
    console.log(`   User ID: ${currentOpenUserId}\n`);
    
    let allEmployees = [];
    let offset = 0;
    const limit = 50;
    let batchCount = 0;
    
    while (batchCount < 10) { // 最多 10 批
      console.log(`📥 獲取第 ${batchCount + 1} 批員工 (offset: ${offset}, limit: ${limit})...`);
      
      const response = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: corpId,
          corpAccessToken: corpAccessToken,
          currentOpenUserId: currentOpenUserId,
          data: {
            limit: limit,
            offset: offset
          }
        })
      });
      
      const data = await response.json();
      console.log(`   API Response:`, JSON.stringify(data, null, 2));
      
      if (data.errorCode !== 0) {
        console.error(`❌ 獲取員工列表失敗:`, data.errorMessage);
        break;
      }
      
      const employees = data.userList || data.empList || [];
      console.log(`   獲取到 ${employees.length} 個員工`);
      
      if (employees.length === 0) {
        console.log('   沒有更多員工，結束查詢');
        break;
      }
      
      // 顯示員工資訊
      employees.forEach((emp, index) => {
        console.log(`   [${index + 1}] ${emp.name} (${emp.openUserId}) - ${emp.mobile || '無手機'} - 部門: ${emp.departmentIds || '無'}`);
      });
      
      allEmployees = allEmployees.concat(employees);
      
      if (employees.length < limit) {
        console.log('   返回數量少於限制，已是最後一批');
        break;
      }
      
      offset += limit;
      batchCount++;
      
      // 避免請求過於頻繁
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ 總共獲取到 ${allEmployees.length} 個員工`);
    
    // 顯示統計
    const deptStats = {};
    allEmployees.forEach(emp => {
      const depts = emp.departmentIds || [];
      depts.forEach(deptId => {
        deptStats[deptId] = (deptStats[deptId] || 0) + 1;
      });
    });
    
    console.log('\n📊 部門統計:');
    Object.entries(deptStats).forEach(([deptId, count]) => {
      console.log(`   部門 ${deptId}: ${count} 人`);
    });
    
    return allEmployees;
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    throw error;
  }
}

// 執行測試
getAllEmployees().then((employees) => {
  console.log('\n🎉 測試完成');
  console.log(`總員工數: ${employees.length}`);
}).catch(error => {
  console.error('測試過程中發生錯誤:', error);
  process.exit(1);
});