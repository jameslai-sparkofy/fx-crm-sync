/**
 * 紛享銷客API客戶端 - 遵循正確做法
 */
export class FxClient {
  constructor(env) {
    this.env = env;
    this.baseUrl = env.FX_API_BASE_URL || 'https://open.fxiaoke.com';
    this.appId = env.FX_APP_ID;
    this.appSecret = env.FX_APP_SECRET;
    this.permanentCode = env.FX_PERMANENT_CODE;
    this.corpId = null;
    this.accessToken = null;
    this.currentOpenUserId = null;
    this.tokenExpiry = null;
  }

  /**
   * 初始化客戶端，獲取access token和用戶ID
   */
  async init() {
    // 檢查是否有有效的token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      // 確保有用戶ID
      if (!this.currentOpenUserId) {
        this.currentOpenUserId = 'FSUID_6D8AAEFBF14B69998CF7D51D21FD8309';
      }
      return;
    }

    // 從KV獲取緩存的token
    const cached = await this.env.KV.get('fx_access_token', { type: 'json' });
    if (cached && cached.expiry > Date.now()) {
      this.accessToken = cached.token;
      this.corpId = cached.corpId;
      this.currentOpenUserId = cached.currentOpenUserId || 'FSUID_6D8AAEFBF14B69998CF7D51D21FD8309';
      this.tokenExpiry = cached.expiry;
      // 確保有用戶ID
      if (!this.currentOpenUserId) {
        this.currentOpenUserId = 'FSUID_6D8AAEFBF14B69998CF7D51D21FD8309';
      }
      return;
    }

    // 獲取新的token
    await this.refreshToken();
  }

  /**
   * 獲取部門列表
   */
  async getDepartmentList() {
    await this.init();
    
    const response = await fetch(`${this.baseUrl}/cgi/department/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: this.corpId,
        corpAccessToken: this.accessToken
      })
    });

    const data = await response.json();
    
    if (data.errorCode !== 0) {
      throw new Error(`獲取部門列表失敗: ${data.errorMessage}`);
    }

    return data.departments || [];
  }

  /**
   * 獲取部門下的員工
   */
  async getDepartmentUsers(departmentId, fetchChild = true) {
    await this.init();
    
    const requestData = {
      corpId: this.corpId,
      corpAccessToken: this.accessToken,
      currentOpenUserId: this.currentOpenUserId,
      departmentId: departmentId,
      fetchChild: fetchChild
    };
    
    console.log(`[FxClient] 獲取部門 ${departmentId} 員工，請求參數:`, JSON.stringify(requestData, null, 2));
    
    const response = await fetch(`${this.baseUrl}/cgi/user/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();
    
    console.log(`[FxClient] 部門 ${departmentId} API 響應:`, JSON.stringify(data, null, 2));
    
    if (data.errorCode !== 0) {
      console.warn(`獲取部門 ${departmentId} 員工失敗: ${data.errorMessage}`);
      return [];
    }

    const employees = data.userList || data.empList || [];
    console.log(`[FxClient] 部門 ${departmentId} 獲取到 ${employees.length} 個員工`);
    
    return employees;
  }

  /**
   * 增量查詢員工列表
   */
  async getEmployeeListIncremental(options = {}) {
    await this.init();
    
    const { 
      lastModified = null, 
      limit = 100, 
      offset = 0,
      departmentId = null 
    } = options;
    
    const requestData = {
      corpId: this.corpId,
      corpAccessToken: this.accessToken,
      currentOpenUserId: this.currentOpenUserId,
      data: {
        limit: limit,
        offset: offset
      }
    };

    // 如果有指定部門，添加部門篩選
    if (departmentId) {
      requestData.data.departmentId = departmentId;
    }

    // 如果有最後修改時間，添加增量查詢條件
    if (lastModified) {
      requestData.data.lastModified = lastModified;
    }
    
    const response = await fetch(`${this.baseUrl}/cgi/user/listIncremental`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();
    
    if (data.errorCode !== 0) {
      // 如果增量 API 不存在，嘗試使用普通列表 API
      console.warn('增量查詢失敗，使用普通列表查詢:', data.errorMessage);
      return await this.getAllEmployees(options);
    }

    return {
      employees: data.userList || data.empList || [],
      hasMore: data.hasMore || false,
      total: data.total || 0
    };
  }

  /**
   * 獲取所有員工（通過部門遍歷）
   */
  async getAllEmployees(options = {}) {
    await this.init();
    
    console.log('[FxClient] 開始獲取所有員工（通過部門遍歷）...');
    let allEmployees = [];
    
    try {
      // 獲取所有部門
      const departments = await this.getDepartmentList();
      console.log(`[FxClient] 獲取到 ${departments.length} 個部門`);
      
      // 遍歷每個部門獲取員工
      for (const dept of departments) {
        try {
          console.log(`[FxClient] 正在獲取部門 "${dept.name}" (ID: ${dept.id}) 的員工...`);
          
          const deptEmployees = await this.getDepartmentUsers(dept.id, false); // 不包含子部門，避免重複
          
          if (deptEmployees && deptEmployees.length > 0) {
            console.log(`[FxClient] 部門 "${dept.name}" 獲取到 ${deptEmployees.length} 個員工`);
            allEmployees = allEmployees.concat(deptEmployees);
          } else {
            console.log(`[FxClient] 部門 "${dept.name}" 沒有員工`);
          }
          
          // 避免請求過於頻繁
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.warn(`[FxClient] 獲取部門 "${dept.name}" 員工失敗:`, error.message);
        }
      }
      
      // 去重（員工可能在多個部門）
      const uniqueEmployees = [];
      const seenIds = new Set();
      
      for (const emp of allEmployees) {
        if (emp.openUserId && !seenIds.has(emp.openUserId)) {
          seenIds.add(emp.openUserId);
          uniqueEmployees.push(emp);
        }
      }
      
      console.log(`[FxClient] 部門遍歷完成！`);
      console.log(`[FxClient] 原始員工數: ${allEmployees.length}`);
      console.log(`[FxClient] 去重後員工數: ${uniqueEmployees.length}`);
      
      return {
        employees: uniqueEmployees,
        hasMore: false,
        total: uniqueEmployees.length
      };
      
    } catch (error) {
      console.error('[FxClient] 獲取員工列表失敗:', error);
      throw error;
    }
  }

  /**
   * 通過手機號獲取員工
   */
  async getUserByMobile(mobile) {
    await this.init();
    
    const response = await fetch(`${this.baseUrl}/cgi/user/getByMobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: this.corpId,
        corpAccessToken: this.accessToken,
        mobile: mobile
      })
    });

    const data = await response.json();
    
    if (data.errorCode !== 0) {
      throw new Error(`獲取員工失敗: ${data.errorMessage}`);
    }

    return data.empList && data.empList[0] ? data.empList[0] : null;
  }

  /**
   * 通過 openUserId 獲取員工詳情
   */
  async getUserById(openUserId) {
    await this.init();
    
    const response = await fetch(`${this.baseUrl}/cgi/user/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: this.corpId,
        corpAccessToken: this.accessToken,
        openUserId: openUserId
      })
    });

    const data = await response.json();
    
    if (data.errorCode !== 0) {
      throw new Error(`獲取員工詳情失敗: ${data.errorMessage}`);
    }

    // 返回員工資料，整合不同的欄位名稱
    return {
      openUserId: data.openUserId,
      name: data.name,
      nickName: data.nickName,
      mobile: data.mobile,
      email: data.email,
      gender: data.gender,
      position: data.position,
      departmentIds: data.departmentIds,
      leaderId: data.leaderId,
      isStop: data.isStop,
      employeeNumber: data.employeeNumber,
      hireDate: data.hireDate,
      birthDate: data.birthDate,
      startWorkDate: data.startWorkDate,
      createTime: data.createTime,
      profileImageUrl: data.profileImageUrl,
      qq: data.qq,
      weixin: data.weixin
    };
  }

  /**
   * 刷新access token並獲取用戶ID
   */
  async refreshToken() {
    try {
      // Step 1: 獲取 Access Token
      const response = await fetch(`${this.baseUrl}/cgi/corpAccessToken/get/V2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: this.appId,
          appSecret: this.appSecret,
          permanentCode: this.permanentCode
        })
      });

      const data = await response.json();

      if (data.errorCode !== 0) {
        throw new Error(`獲取access token失敗: ${data.errorMessage}`);
      }

      this.accessToken = data.corpAccessToken;
      this.corpId = data.corpId;
      this.tokenExpiry = Date.now() + (data.expiresIn || 7200) * 1000;

      // Step 2: 獲取當前用戶ID
      try {
        await this.getCurrentUserId();
      } catch (userError) {
        console.warn('獲取用戶ID失敗，使用默認值:', userError.message);
        // 使用默認的用戶ID（這是從成功的測試中獲取的）
        this.currentOpenUserId = 'FSUID_6D8AAEFBF14B69998CF7D51D21FD8309';
      }

      // 緩存token和相關信息
      await this.env.KV.put('fx_access_token', JSON.stringify({
        token: this.accessToken,
        corpId: this.corpId,
        currentOpenUserId: this.currentOpenUserId,
        expiry: this.tokenExpiry
      }), {
        expirationTtl: 7200
      });

      console.log('Token刷新成功', {
        corpId: this.corpId,
        currentOpenUserId: this.currentOpenUserId,
        expiry: new Date(this.tokenExpiry).toISOString()
      });

    } catch (error) {
      console.error('Token刷新失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取當前用戶ID
   */
  async getCurrentUserId() {
    try {
      const response = await fetch(`${this.baseUrl}/cgi/user/getByMobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: this.corpId,
          corpAccessToken: this.accessToken,
          mobile: "17675662629" // 固定手機號
        })
      });

      const data = await response.json();

      if (data.errorCode !== 0) {
        throw new Error(`獲取用戶ID失敗: ${data.errorMessage}`);
      }

      if (!data.empList || data.empList.length === 0) {
        throw new Error('找不到對應的用戶');
      }

      this.currentOpenUserId = data.empList[0].openUserId;
      console.log('獲取用戶ID成功:', this.currentOpenUserId);

    } catch (error) {
      console.error('獲取用戶ID失敗:', error);
      throw error;
    }
  }

  /**
   * 發送API請求 - 遵循正確的參數格式
   */
  async request(endpoint, method = 'POST', body = {}) {
    // 確保有有效的token
    await this.init();

    // 添加調試日誌
    console.log(`[FxClient] 準備調用 API: ${endpoint}`);
    console.log(`[FxClient] 認證信息:`, {
      corpId: this.corpId,
      hasToken: !!this.accessToken,
      hasUserId: !!this.currentOpenUserId,
      currentOpenUserId: this.currentOpenUserId
    });

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    // 根據不同的端點構造正確的請求體
    let requestBody = body;
    
    // 對於數據查詢類的API，需要包含認證信息
    if (endpoint.includes('/data/query') || endpoint.includes('/data/get') || 
        endpoint.includes('/crm/v2/') || endpoint.includes('/crm/custom/')) {
      requestBody = {
        corpId: this.corpId,
        corpAccessToken: this.accessToken,
        currentOpenUserId: this.currentOpenUserId,
        ...body
      };
      
      console.log(`[FxClient] 數據查詢請求體:`, JSON.stringify(requestBody, null, 2));
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(requestBody) : undefined
      });

      const data = await response.json();
      
      console.log(`[FxClient] API 響應:`, {
        endpoint,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        dataCount: data.data?.dataList?.length || 0,
        total: data.data?.total
      });

      // 檢查token是否過期
      if (data.errorCode === 401 || data.errorCode === 40001 || data.errorCode === 10001) {
        console.log('Token過期，重新獲取...');
        await this.refreshToken();
        // 重試請求
        return this.request(endpoint, method, body);
      }

      return data;
    } catch (error) {
      console.error(`API請求失敗 ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * POST請求
   */
  async post(endpoint, body = {}) {
    return this.request(endpoint, 'POST', body);
  }

  /**
   * GET請求
   */
  async get(endpoint) {
    return this.request(endpoint, 'GET');
  }
}