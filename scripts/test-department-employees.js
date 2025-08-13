#!/usr/bin/env node

/**
 * 測試部門員工獲取API
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

async function getDepartmentList(corpId, corpAccessToken) {
  const response = await fetch(`${CRM_CONFIG.baseUrl}/cgi/department/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      corpId: corpId,
      corpAccessToken: corpAccessToken
    })
  });

  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`獲取部門列表失敗: ${data.errorMessage}`);
  }

  return data.departments || [];
}

async function getDepartmentEmployees(corpId, corpAccessToken, currentOpenUserId, departmentId, fetchChild = false) {
  console.log(`\n📋 測試部門 ${departmentId} 員工獲取...`);
  
  const requestData = {
    corpId: corpId,
    corpAccessToken: corpAccessToken,
    currentOpenUserId: currentOpenUserId,
    departmentId: departmentId,
    fetchChild: fetchChild
  };
  
  console.log('請求參數:', JSON.stringify(requestData, null, 2));
  
  const response = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });

  const data = await response.json();
  console.log('API 響應:', JSON.stringify(data, null, 2));
  
  if (data.errorCode !== 0) {
    console.error(`❌ 獲取失敗: ${data.errorMessage}`);
    return [];
  }

  const employees = data.userList || data.empList || [];
  console.log(`✅ 獲取到 ${employees.length} 個員工`);
  
  // 詳細顯示員工信息
  employees.forEach((emp, index) => {
    console.log(`  [${index + 1}] ${emp.name} (${emp.openUserId})`);
    console.log(`      手機: ${emp.mobile || '無'}`);
    console.log(`      職位: ${emp.position || '無'}`);
    console.log(`      部門: ${emp.departmentIds || '無'}`);
  });
  
  return employees;
}

async function testDepartmentEmployees() {
  console.log('🔍 開始測試部門員工獲取...\n');
  
  try {
    // 獲取認證資訊
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    
    console.log('✅ 獲取認證成功');
    console.log(`   Corp ID: ${corpId}`);
    console.log(`   User ID: ${currentOpenUserId}\n`);
    
    // 獲取部門列表
    const departments = await getDepartmentList(corpId, corpAccessToken);
    console.log(`📂 獲取到 ${departments.length} 個部門:`);
    departments.forEach((dept, index) => {
      console.log(`  [${index + 1}] ${dept.name} (ID: ${dept.id})`);
    });
    
    let totalEmployees = [];
    
    // 遍歷每個部門獲取員工
    for (const dept of departments) {
      try {
        const employees = await getDepartmentEmployees(
          corpId, 
          corpAccessToken, 
          currentOpenUserId, 
          dept.id, 
          false
        );
        
        if (employees.length > 0) {
          totalEmployees = totalEmployees.concat(employees);
        }
        
        // 避免請求過於頻繁
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ 部門 ${dept.name} 處理失敗:`, error.message);
      }
    }
    
    // 去重
    const uniqueEmployees = [];
    const seenIds = new Set();
    
    for (const emp of totalEmployees) {
      if (emp.openUserId && !seenIds.has(emp.openUserId)) {
        seenIds.add(emp.openUserId);
        uniqueEmployees.push(emp);
      }
    }
    
    console.log(`\n📊 測試結果:`);
    console.log(`   原始員工數: ${totalEmployees.length}`);
    console.log(`   去重後員工數: ${uniqueEmployees.length}`);
    
    console.log(`\n👥 所有員工清單:`);
    uniqueEmployees.forEach((emp, index) => {
      console.log(`  [${index + 1}] ${emp.name} - ${emp.mobile || '無手機'} - ${emp.position || '無職位'}`);
    });
    
    return uniqueEmployees;
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    throw error;
  }
}

// 執行測試
testDepartmentEmployees().then((employees) => {
  console.log('\n🎉 測試完成');
  console.log(`總員工數: ${employees.length}`);
}).catch(error => {
  console.error('測試過程中發生錯誤:', error);
  process.exit(1);
});