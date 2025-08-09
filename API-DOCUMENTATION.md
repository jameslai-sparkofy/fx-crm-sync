# 紛享銷客 CRM 同步系統 API 文檔

## 目錄
- [概述](#概述)
- [快速開始](#快速開始)
- [認證](#認證)
- [API 端點](#api-端點)
  - [D1 REST API](#d1-rest-api)
  - [CRUD API](#crud-api)
  - [同步管理 API](#同步管理-api)
  - [系統管理 API](#系統管理-api)
- [數據模型](#數據模型)
- [錯誤處理](#錯誤處理)
- [範例代碼](#範例代碼)
- [最佳實踐](#最佳實踐)

## 概述

紛享銷客 CRM 同步系統提供了兩套 API 服務：

1. **D1 REST API** - 提供對同步數據的只讀訪問
2. **CRUD API** - 提供完整的創建、讀取、更新、刪除功能，並自動同步到紛享銷客

### 服務端點

| 服務 | 端點 | 說明 |
|------|------|------|
| D1 REST API | https://fx-d1-rest-api.lai-jameslai.workers.dev | 只讀數據訪問 |
| CRUD API | https://fx-crm-sync.lai-jameslai.workers.dev/api | 完整 CRUD 操作 |

### 支援的數據對象

- **商機 (NewOpportunityObj)** - 銷售商機管理
- **案場 (object_8w9cb__c)** - 建案和案場資料

## 快速開始

### 1. 獲取訪問憑證

聯繫系統管理員獲取：
- D1 REST API Token
- CRUD API Token

### 2. 測試連接

```bash
# 測試 D1 REST API
curl "https://fx-d1-rest-api.lai-jameslai.workers.dev/rest/newopportunityobj?limit=1" \
  -H "Authorization: Bearer YOUR_REST_API_TOKEN"

# 測試 CRUD API
curl "https://fx-crm-sync.lai-jameslai.workers.dev/api/health" \
  -H "Authorization: Bearer YOUR_CRUD_API_TOKEN"
```

### 3. 開始使用

選擇適合的 API：
- **只需讀取數據**：使用 D1 REST API
- **需要修改數據**：使用 CRUD API

## 認證

### D1 REST API 認證

使用 Bearer Token 認證：

```http
Authorization: Bearer fx-crm-api-secret-2025
```

### CRUD API 認證

使用 Bearer Token 認證：

```http
Authorization: Bearer YOUR_CRUD_API_TOKEN
```

### 認證錯誤

未提供或無效的 Token 將返回：

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authorization token",
  "status": 401
}
```

## API 端點

### D1 REST API

#### 1. 查詢列表

獲取數據列表，支援篩選、排序和分頁。

```http
GET /rest/{tableName}
```

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| limit | number | 否 | 返回記錄數，預設 50，最大 1000 |
| offset | number | 否 | 跳過記錄數，預設 0 |
| sort_by | string | 否 | 排序欄位 |
| order | string | 否 | 排序方向：asc 或 desc |
| {field} | any | 否 | 欄位篩選條件 |

**範例：**

```bash
# 獲取前 10 筆商機
GET /rest/newopportunityobj?limit=10

# 查詢贏單商機，按金額降序
GET /rest/newopportunityobj?sales_stage__r=贏單&sort_by=amount&order=desc

# 分頁查詢
GET /rest/newopportunityobj?limit=20&offset=40
```

**回應：**

```json
{
  "success": true,
  "results": [
    {
      "id": "650c09e8dc044f0001973eab",
      "name": "XX建案銷售商機",
      "amount": 5000000,
      "sales_stage__r": "贏單",
      "created_at": "2024-09-21T08:30:00Z"
    }
  ],
  "total": 506,
  "limit": 10,
  "offset": 0
}
```

#### 2. 獲取單筆記錄

```http
GET /rest/{tableName}/{id}
```

**範例：**

```bash
GET /rest/newopportunityobj/650c09e8dc044f0001973eab
```

**回應：**

```json
{
  "success": true,
  "result": {
    "id": "650c09e8dc044f0001973eab",
    "name": "XX建案銷售商機",
    "amount": 5000000,
    "sales_stage__r": "贏單",
    "account_id__r": "勝美建設股份有限公司",
    "close_date": 1735228800000,
    "created_at": "2024-09-21T08:30:00Z",
    "updated_at": "2024-12-15T14:20:00Z"
  }
}
```

#### 3. 執行 SQL 查詢

執行自定義 SQL 查詢（只支援 SELECT）。

```http
POST /query
```

**請求體：**

```json
{
  "query": "SELECT sales_stage__r, COUNT(*) as count FROM newopportunityobj GROUP BY sales_stage__r",
  "params": []
}
```

**範例：**

```bash
# 統計各階段商機數量
curl -X POST "https://fx-d1-rest-api.lai-jameslai.workers.dev/query" \
  -H "Authorization: Bearer fx-crm-api-secret-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT sales_stage__r, COUNT(*) as count FROM newopportunityobj WHERE is_deleted = 0 GROUP BY sales_stage__r",
    "params": []
  }'
```

**回應：**

```json
{
  "success": true,
  "results": [
    {"sales_stage__r": "初步接洽", "count": 125},
    {"sales_stage__r": "需求確認", "count": 89},
    {"sales_stage__r": "方案報價", "count": 67},
    {"sales_stage__r": "談判審核", "count": 45},
    {"sales_stage__r": "贏單", "count": 180}
  ]
}
```

### CRUD API

#### 1. 創建記錄

創建新記錄並同步到紛享銷客。

```http
POST /api/crud/{objectApiName}
```

**請求體：**

商機範例：
```json
{
  "name": "新商機測試",
  "amount": 100000,
  "close_date": 1735228800000,
  "account_id": "6508f92086a6c8000190db97",
  "sales_stage": "1",
  "sales_process_id": "64ec36f86815cf000178aec1",
  "owner": ["FSUID_6D8AAEFBF14B69998CF7D51D21FD8309"],
  "probability": 20,
  "field_SdEgv__c": "需求描述",
  "field_lmjjf__c": "TvP3c4kMA"
}
```

**回應：**

```json
{
  "success": true,
  "data": {
    "id": "650c09e8dc044f0001973eac",
    "dataObjectApiName": "NewOpportunityObj",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "sync": {
    "fx_id": "650c09e8dc044f0001973eac",
    "synced": true
  }
}
```

#### 2. 更新記錄

更新現有記錄並同步到紛享銷客。

```http
PUT /api/crud/{objectApiName}/{id}
```

**請求體：**

```json
{
  "amount": 150000,
  "sales_stage": "2",
  "probability": 40
}
```

**回應：**

```json
{
  "success": true,
  "data": {
    "id": "650c09e8dc044f0001973eac",
    "updated_at": "2025-01-15T11:00:00Z"
  },
  "sync": {
    "synced": true
  }
}
```

#### 3. 刪除記錄

軟刪除記錄（設置 is_deleted = 1）。

```http
DELETE /api/crud/{objectApiName}/{id}
```

**回應：**

```json
{
  "success": true,
  "message": "Record deleted successfully"
}
```

#### 4. 讀取記錄

```http
GET /api/crud/{objectApiName}/{id}
```

功能與 D1 REST API 的單筆查詢相同。

### 同步管理 API

#### 1. 查看同步狀態

```http
GET /api/sync/status
```

**回應：**

```json
{
  "success": true,
  "status": {
    "lastSync": {
      "opportunities": "2025-01-15T09:00:00Z",
      "sites": "2025-01-15T09:00:30Z"
    },
    "nextSync": {
      "opportunities": "2025-01-15T10:00:00Z",
      "sites": "2025-01-15T10:00:30Z"
    },
    "counts": {
      "opportunities": 506,
      "sites": 2904
    }
  }
}
```

#### 2. 手動觸發同步

```http
POST /api/sync/{objectApiName}/start
```

**支援的對象：**
- `NewOpportunityObj` - 商機
- `object_8W9cb__c` - 案場

**範例：**

```bash
# 觸發商機同步
curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/NewOpportunityObj/start" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**回應：**

```json
{
  "success": true,
  "message": "Sync started",
  "syncId": "opp_sync_1754211626475"
}
```

#### 3. 查看同步日誌

```http
GET /api/sync/logs?limit=10
```

**回應：**

```json
{
  "success": true,
  "logs": [
    {
      "id": 51,
      "sync_id": "site_sync_1754211629630",
      "entity_type": "object_8W9cb__c",
      "status": "COMPLETED",
      "records_count": 0,
      "error_count": 0,
      "started_at": "2025-01-15T09:00:29.630Z",
      "completed_at": "2025-01-15T09:00:32Z"
    }
  ]
}
```

### 系統管理 API

#### 1. 健康檢查

```http
GET /api/health
```

**回應：**

```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "fx_api": "connected",
    "r2_storage": "connected"
  },
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

#### 2. 獲取對象定義

```http
GET /api/objects
```

**回應：**

```json
{
  "success": true,
  "objects": [
    {
      "apiName": "NewOpportunityObj",
      "label": "商機",
      "description": "銷售商機管理",
      "fieldCount": 45,
      "recordCount": 506
    },
    {
      "apiName": "object_8w9cb__c",
      "label": "案場",
      "description": "建案和案場資料",
      "fieldCount": 38,
      "recordCount": 2904
    }
  ]
}
```

#### 3. 獲取對象欄位

```http
GET /api/objects/{objectApiName}/fields
```

**回應：**

```json
{
  "success": true,
  "fields": [
    {
      "apiName": "name",
      "label": "商機名稱",
      "type": "text",
      "required": true,
      "maxLength": 200
    },
    {
      "apiName": "amount",
      "label": "商機金額",
      "type": "number",
      "required": false
    }
  ]
}
```

## 數據模型

### 商機 (NewOpportunityObj)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| id | string | 自動 | 記錄 ID |
| name | string | 是 | 商機名稱 |
| amount | number | 否 | 商機金額 |
| close_date | timestamp | 是 | 預計結案日期 |
| account_id | string | 是 | 客戶 ID |
| sales_stage | string | 是 | 銷售階段代碼 |
| sales_process_id | string | 是 | 銷售流程 ID |
| owner | array | 是 | 負責人 ID 陣列 |
| probability | number | 否 | 成交機率 (0-100) |
| field_SdEgv__c | string | 是 | 需求描述 |
| field_lmjjf__c | string | 是 | 商機可能性 |
| created_at | datetime | 自動 | 創建時間 |
| updated_at | datetime | 自動 | 更新時間 |
| is_deleted | number | 自動 | 刪除標記 (0/1) |

### 案場 (object_8w9cb__c)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| id | string | 自動 | 記錄 ID |
| name | string | 是 | 案場名稱 |
| field_k7e6q__c | string | 否 | 專案編號 |
| field_xMnNW__c | string | 否 | 棟別 |
| field_73Pqv__c | string | 否 | 樓層 |
| field_wGxO8__c | number | 否 | 面積 |
| field_R1AqZ__c | number | 否 | 單價 |
| field_9kFmT__c | number | 否 | 總價 |
| created_at | datetime | 自動 | 創建時間 |
| updated_at | datetime | 自動 | 更新時間 |
| is_deleted | number | 自動 | 刪除標記 (0/1) |

## 錯誤處理

### 錯誤回應格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: name",
    "details": {
      "field": "name",
      "requirement": "required"
    }
  }
}
```

### 常見錯誤碼

| HTTP 狀態碼 | 錯誤碼 | 說明 |
|-------------|--------|------|
| 400 | VALIDATION_ERROR | 請求參數驗證失敗 |
| 401 | UNAUTHORIZED | 未授權或 Token 無效 |
| 403 | FORBIDDEN | 沒有權限執行此操作 |
| 404 | NOT_FOUND | 資源不存在 |
| 409 | CONFLICT | 資源衝突（如重複創建） |
| 429 | RATE_LIMITED | 請求頻率超限 |
| 500 | INTERNAL_ERROR | 服務器內部錯誤 |
| 503 | SERVICE_UNAVAILABLE | 服務暫時不可用 |

### 錯誤處理範例

```javascript
try {
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // 處理 API 錯誤
    console.error('API Error:', data.error);
    
    switch (response.status) {
      case 401:
        // 重新認證
        await refreshToken();
        break;
      case 429:
        // 等待後重試
        await sleep(60000);
        break;
      default:
        // 其他錯誤處理
        throw new Error(data.error.message);
    }
  }
  
  return data;
} catch (error) {
  console.error('Request failed:', error);
}
```

## 範例代碼

### JavaScript (Node.js)

```javascript
// 安裝依賴：npm install axios

const axios = require('axios');

// 配置
const config = {
  restApiUrl: 'https://fx-d1-rest-api.lai-jameslai.workers.dev',
  crudApiUrl: 'https://fx-crm-sync.lai-jameslai.workers.dev/api',
  restApiToken: 'fx-crm-api-secret-2025',
  crudApiToken: 'YOUR_CRUD_API_TOKEN'
};

// REST API 客戶端
class FxRestApiClient {
  constructor(baseUrl, token) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 查詢商機列表
  async getOpportunities(params = {}) {
    const response = await this.client.get('/rest/newopportunityobj', { params });
    return response.data;
  }
  
  // 獲取單筆商機
  async getOpportunity(id) {
    const response = await this.client.get(`/rest/newopportunityobj/${id}`);
    return response.data;
  }
  
  // 執行 SQL 查詢
  async query(sql, params = []) {
    const response = await this.client.post('/query', { query: sql, params });
    return response.data;
  }
}

// CRUD API 客戶端
class FxCrudApiClient {
  constructor(baseUrl, token) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 創建商機
  async createOpportunity(data) {
    const response = await this.client.post('/crud/NewOpportunityObj', data);
    return response.data;
  }
  
  // 更新商機
  async updateOpportunity(id, data) {
    const response = await this.client.put(`/crud/NewOpportunityObj/${id}`, data);
    return response.data;
  }
  
  // 刪除商機
  async deleteOpportunity(id) {
    const response = await this.client.delete(`/crud/NewOpportunityObj/${id}`);
    return response.data;
  }
  
  // 觸發同步
  async triggerSync(objectApiName) {
    const response = await this.client.post(`/sync/${objectApiName}/start`);
    return response.data;
  }
}

// 使用範例
async function example() {
  // 初始化客戶端
  const restApi = new FxRestApiClient(config.restApiUrl, config.restApiToken);
  const crudApi = new FxCrudApiClient(config.crudApiUrl, config.crudApiToken);
  
  try {
    // 1. 查詢商機列表
    console.log('查詢商機列表...');
    const opportunities = await restApi.getOpportunities({
      limit: 10,
      sales_stage__r: '贏單'
    });
    console.log(`找到 ${opportunities.results.length} 筆商機`);
    
    // 2. 創建新商機
    console.log('\n創建新商機...');
    const newOpp = await crudApi.createOpportunity({
      name: `API 測試商機 ${new Date().toISOString()}`,
      amount: 500000,
      close_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
      account_id: '6508f92086a6c8000190db97',
      sales_stage: '1',
      sales_process_id: '64ec36f86815cf000178aec1',
      owner: ['FSUID_6D8AAEFBF14B69998CF7D51D21FD8309'],
      probability: 30,
      field_SdEgv__c: '通過 API 創建的測試商機',
      field_lmjjf__c: 'TvP3c4kMA'
    });
    console.log('商機創建成功:', newOpp.data.id);
    
    // 3. 更新商機
    console.log('\n更新商機...');
    const updated = await crudApi.updateOpportunity(newOpp.data.id, {
      amount: 600000,
      probability: 50
    });
    console.log('商機更新成功');
    
    // 4. 執行統計查詢
    console.log('\n執行統計查詢...');
    const stats = await restApi.query(
      'SELECT sales_stage__r, COUNT(*) as count, SUM(amount) as total ' +
      'FROM newopportunityobj WHERE is_deleted = 0 ' +
      'GROUP BY sales_stage__r'
    );
    console.log('各階段統計:', stats.results);
    
  } catch (error) {
    console.error('錯誤:', error.response?.data || error.message);
  }
}

// 執行範例
example();
```

### Python

```python
# 安裝依賴：pip install requests

import requests
import json
from datetime import datetime, timedelta

# 配置
config = {
    'rest_api_url': 'https://fx-d1-rest-api.lai-jameslai.workers.dev',
    'crud_api_url': 'https://fx-crm-sync.lai-jameslai.workers.dev/api',
    'rest_api_token': 'fx-crm-api-secret-2025',
    'crud_api_token': 'YOUR_CRUD_API_TOKEN'
}

class FxRestApiClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_opportunities(self, **params):
        """查詢商機列表"""
        response = requests.get(
            f'{self.base_url}/rest/newopportunityobj',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def get_opportunity(self, opportunity_id):
        """獲取單筆商機"""
        response = requests.get(
            f'{self.base_url}/rest/newopportunityobj/{opportunity_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def query(self, sql, params=None):
        """執行 SQL 查詢"""
        response = requests.post(
            f'{self.base_url}/query',
            headers=self.headers,
            json={
                'query': sql,
                'params': params or []
            }
        )
        response.raise_for_status()
        return response.json()

class FxCrudApiClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_opportunity(self, data):
        """創建商機"""
        response = requests.post(
            f'{self.base_url}/crud/NewOpportunityObj',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def update_opportunity(self, opportunity_id, data):
        """更新商機"""
        response = requests.put(
            f'{self.base_url}/crud/NewOpportunityObj/{opportunity_id}',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def delete_opportunity(self, opportunity_id):
        """刪除商機"""
        response = requests.delete(
            f'{self.base_url}/crud/NewOpportunityObj/{opportunity_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

def main():
    # 初始化客戶端
    rest_api = FxRestApiClient(config['rest_api_url'], config['rest_api_token'])
    crud_api = FxCrudApiClient(config['crud_api_url'], config['crud_api_token'])
    
    try:
        # 1. 查詢商機列表
        print('查詢商機列表...')
        opportunities = rest_api.get_opportunities(limit=10, sales_stage__r='贏單')
        print(f"找到 {len(opportunities['results'])} 筆商機")
        
        # 2. 創建新商機
        print('\n創建新商機...')
        close_date = int((datetime.now() + timedelta(days=30)).timestamp() * 1000)
        new_opp = crud_api.create_opportunity({
            'name': f'Python API 測試商機 {datetime.now().isoformat()}',
            'amount': 750000,
            'close_date': close_date,
            'account_id': '6508f92086a6c8000190db97',
            'sales_stage': '1',
            'sales_process_id': '64ec36f86815cf000178aec1',
            'owner': ['FSUID_6D8AAEFBF14B69998CF7D51D21FD8309'],
            'probability': 40,
            'field_SdEgv__c': 'Python API 測試',
            'field_lmjjf__c': 'TvP3c4kMA'
        })
        print(f"商機創建成功: {new_opp['data']['id']}")
        
        # 3. 執行統計查詢
        print('\n執行統計查詢...')
        stats = rest_api.query('''
            SELECT sales_stage__r, COUNT(*) as count, SUM(amount) as total
            FROM newopportunityobj 
            WHERE is_deleted = 0
            GROUP BY sales_stage__r
        ''')
        
        for row in stats['results']:
            print(f"階段: {row['sales_stage__r']}, 數量: {row['count']}, 總金額: {row['total'] or 0:,.0f}")
            
    except requests.exceptions.RequestException as e:
        print(f'錯誤: {e}')
        if hasattr(e.response, 'json'):
            print(f'詳細錯誤: {e.response.json()}')

if __name__ == '__main__':
    main()
```

### cURL 命令範例

```bash
# 1. 查詢商機列表
curl "https://fx-d1-rest-api.lai-jameslai.workers.dev/rest/newopportunityobj?limit=5&sales_stage__r=贏單" \
  -H "Authorization: Bearer fx-crm-api-secret-2025"

# 2. 創建新商機
curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/crud/NewOpportunityObj" \
  -H "Authorization: Bearer YOUR_CRUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CURL 測試商機",
    "amount": 300000,
    "close_date": 1735228800000,
    "account_id": "6508f92086a6c8000190db97",
    "sales_stage": "1",
    "sales_process_id": "64ec36f86815cf000178aec1",
    "owner": ["FSUID_6D8AAEFBF14B69998CF7D51D21FD8309"],
    "probability": 25,
    "field_SdEgv__c": "CURL 測試需求",
    "field_lmjjf__c": "TvP3c4kMA"
  }'

# 3. 更新商機
curl -X PUT "https://fx-crm-sync.lai-jameslai.workers.dev/api/crud/NewOpportunityObj/{id}" \
  -H "Authorization: Bearer YOUR_CRUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 350000,
    "probability": 35
  }'

# 4. 執行 SQL 查詢
curl -X POST "https://fx-d1-rest-api.lai-jameslai.workers.dev/query" \
  -H "Authorization: Bearer fx-crm-api-secret-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT COUNT(*) as total FROM newopportunityobj WHERE amount > ?",
    "params": [1000000]
  }'

# 5. 觸發同步
curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/NewOpportunityObj/start" \
  -H "Authorization: Bearer YOUR_CRUD_API_TOKEN"

# 6. 查看同步狀態
curl "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/status" \
  -H "Authorization: Bearer YOUR_CRUD_API_TOKEN"
```

## 最佳實踐

### 1. 錯誤處理

始終實現重試機制和錯誤處理：

```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        // 速率限制，等待後重試
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else if (error.response?.status >= 500) {
        // 服務器錯誤，短暫等待後重試
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        // 客戶端錯誤，不重試
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 2. 批次處理

處理大量數據時使用批次處理：

```javascript
async function batchProcess(items, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );
    results.push(...batchResults);
    
    // 避免速率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}
```

### 3. 緩存策略

實現適當的緩存以減少 API 調用：

```javascript
class CachedApiClient {
  constructor(apiClient, ttl = 300000) { // 5 分鐘
    this.apiClient = apiClient;
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  async get(key, fetchFn) {
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    const data = await fetchFn();
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
    
    return data;
  }
}
```

### 4. 數據驗證

在發送請求前驗證數據：

```javascript
function validateOpportunity(data) {
  const required = ['name', 'close_date', 'account_id', 'sales_stage'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (data.probability && (data.probability < 0 || data.probability > 100)) {
    throw new Error('Probability must be between 0 and 100');
  }
  
  if (data.amount && data.amount < 0) {
    throw new Error('Amount cannot be negative');
  }
  
  return true;
}
```

### 5. 監控和日誌

實現完善的監控和日誌記錄：

```javascript
class ApiLogger {
  async logRequest(method, url, data, response, duration) {
    const log = {
      timestamp: new Date().toISOString(),
      method,
      url,
      status: response.status,
      duration,
      success: response.ok
    };
    
    if (!response.ok) {
      log.error = await response.text();
    }
    
    console.log(JSON.stringify(log));
  }
  
  async makeRequest(method, url, options = {}) {
    const start = Date.now();
    
    try {
      const response = await fetch(url, {
        method,
        ...options
      });
      
      const duration = Date.now() - start;
      await this.logRequest(method, url, options.body, response, duration);
      
      return response;
    } catch (error) {
      console.error('Request failed:', {
        method,
        url,
        error: error.message,
        duration: Date.now() - start
      });
      throw error;
    }
  }
}
```

## 附錄

### API 版本歷史

| 版本 | 發布日期 | 變更內容 |
|------|----------|----------|
| 1.0.0 | 2025-01-15 | 初始版本發布 |

### 相關資源

- [紛享銷客官方文檔](https://open.fxiaoke.com)
- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [系統架構設計文檔](./README.md)

### 技術支援

如需技術支援，請聯繫：
- Email: support@your-domain.com
- 緊急聯絡：+886-xxx-xxx-xxx

---

最後更新：2025-01-15