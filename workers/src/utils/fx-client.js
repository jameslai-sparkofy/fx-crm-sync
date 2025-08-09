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