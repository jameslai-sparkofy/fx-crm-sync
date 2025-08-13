#!/usr/bin/env node

/**
 * 測試紛享銷客員工 API
 * 探索可用的員工查詢端點和欄位
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

async function testEmployeeAPIs() {
  console.log('🔍 測試員工相關 API...\n');
  
  try {
    // 獲取認證資訊
    const { corpId, corpAccessToken } = await getAccessToken();
    console.log('✅ 獲取 Token 成功');
    console.log(`   Corp ID: ${corpId}\n`);
    
    // 1. 測試通過手機號獲取員工
    console.log('1. 測試 getByMobile API...');
    const mobileResponse = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/getByMobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: corpId,
        corpAccessToken: corpAccessToken,
        mobile: "17675662629"
      })
    });
    
    const mobileData = await mobileResponse.json();
    console.log('   Response:', JSON.stringify(mobileData, null, 2));
    
    if (mobileData.errorCode === 0 && mobileData.empList?.length > 0) {
      const employee = mobileData.empList[0];
      console.log('\n   員工資訊:');
      console.log('   - openUserId:', employee.openUserId);
      console.log('   - name:', employee.name);
      console.log('   - departmentId:', employee.departmentId);
      console.log('   - email:', employee.email);
      console.log('   - mobile:', employee.mobile);
      console.log('   - position:', employee.position);
      console.log('   - isStop:', employee.isStop);
      console.log('   - mainDepartmentId:', employee.mainDepartmentId);
      
      // 儲存 openUserId 供後續使用
      const currentOpenUserId = employee.openUserId;
      
      // 2. 測試獲取所有員工列表 (可能的 API)
      console.log('\n2. 測試獲取員工列表 API...');
      
      // 嘗試方法 1: 使用 user/list
      try {
        const listResponse = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corpId: corpId,
            corpAccessToken: corpAccessToken,
            currentOpenUserId: currentOpenUserId,
            data: {
              limit: 10,
              offset: 0
            }
          })
        });
        
        const listData = await listResponse.json();
        console.log('   user/list Response:', JSON.stringify(listData, null, 2));
      } catch (error) {
        console.log('   user/list API 不存在或失敗:', error.message);
      }
      
      // 嘗試方法 2: 使用 user/getList
      try {
        const getListResponse = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/getList`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corpId: corpId,
            corpAccessToken: corpAccessToken,
            currentOpenUserId: currentOpenUserId,
            departmentId: 0,  // 0 表示獲取所有部門
            fetchChild: true,  // 包含子部門
            limit: 10,
            offset: 0
          })
        });
        
        const getListData = await getListResponse.json();
        console.log('   user/getList Response:', JSON.stringify(getListData, null, 2));
      } catch (error) {
        console.log('   user/getList API 不存在或失敗:', error.message);
      }
      
      // 嘗試方法 3: 使用 department/userList
      try {
        const deptUserResponse = await fetch(`${CRM_CONFIG.baseUrl}/cgi/department/userList`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corpId: corpId,
            corpAccessToken: corpAccessToken,
            departmentId: employee.mainDepartmentId || 0,
            fetchChild: true
          })
        });
        
        const deptUserData = await deptUserResponse.json();
        console.log('   department/userList Response:', JSON.stringify(deptUserData, null, 2));
      } catch (error) {
        console.log('   department/userList API 不存在或失敗:', error.message);
      }
      
      // 3. 測試獲取部門列表
      console.log('\n3. 測試獲取部門列表 API...');
      try {
        const deptResponse = await fetch(`${CRM_CONFIG.baseUrl}/cgi/department/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corpId: corpId,
            corpAccessToken: corpAccessToken
          })
        });
        
        const deptData = await deptResponse.json();
        console.log('   department/list Response:', JSON.stringify(deptData, null, 2));
      } catch (error) {
        console.log('   department/list API 不存在或失敗:', error.message);
      }
      
      // 4. 測試通過 openUserId 獲取員工詳情
      console.log('\n4. 測試通過 openUserId 獲取員工詳情...');
      try {
        const detailResponse = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corpId: corpId,
            corpAccessToken: corpAccessToken,
            openUserId: currentOpenUserId
          })
        });
        
        const detailData = await detailResponse.json();
        console.log('   user/get Response:', JSON.stringify(detailData, null, 2));
      } catch (error) {
        console.log('   user/get API 不存在或失敗:', error.message);
      }
      
      // 5. 測試批量獲取員工
      console.log('\n5. 測試批量獲取員工 API...');
      try {
        const batchResponse = await fetch(`${CRM_CONFIG.baseUrl}/cgi/user/batchGet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corpId: corpId,
            corpAccessToken: corpAccessToken,
            openUserIds: [currentOpenUserId]
          })
        });
        
        const batchData = await batchResponse.json();
        console.log('   user/batchGet Response:', JSON.stringify(batchData, null, 2));
      } catch (error) {
        console.log('   user/batchGet API 不存在或失敗:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

// 執行測試
testEmployeeAPIs().then(() => {
  console.log('\n✅ 測試完成');
}).catch(error => {
  console.error('測試過程中發生錯誤:', error);
  process.exit(1);
});