# CRUD API 文檔

## 概述

CRUD API 提供完整的創建、讀取、更新和刪除功能，所有操作都會自動同步到紛享銷客 CRM 和本地 D1 資料庫。

## 基礎 URL

```
https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud
```

## 認證

所有 API 請求需要包含 Bearer Token：

```
Authorization: Bearer {your-token}
```

## API 端點

### 1. 創建記錄

創建新記錄並同步到 CRM。

**端點:** `POST /api/crud/{objectApiName}`

**請求範例:**

```bash
curl -X POST https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud/NewOpportunityObj \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新商機測試",
    "amount": 100000,
    "close_date": 1735228800000,
    "account_id": "5fc7a87982f5430001a7cf84",
    "sales_stage": "stage_1"
  }'
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "id": "5fc7a87982f5430001a7cf85",
    "record": {
      "_id": "5fc7a87982f5430001a7cf85",
      "name": "新商機測試",
      "amount": 100000,
      "close_date": 1735228800000,
      "account_id": "5fc7a87982f5430001a7cf84",
      "sales_stage": "stage_1",
      "create_time": 1735228800000,
      "last_modified_time": 1735228800000
    }
  },
  "message": "記錄創建成功並已同步"
}
```

### 2. 更新記錄

更新現有記錄並同步到 CRM。

**端點:** `PUT /api/crud/{objectApiName}/{recordId}`

**請求範例:**

```bash
curl -X PUT https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud/NewOpportunityObj/5fc7a87982f5430001a7cf85 \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150000,
    "sales_stage": "stage_2",
    "probability": 50
  }'
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "id": "5fc7a87982f5430001a7cf85",
    "record": {
      "_id": "5fc7a87982f5430001a7cf85",
      "name": "新商機測試",
      "amount": 150000,
      "sales_stage": "stage_2",
      "probability": 50,
      "last_modified_time": 1735232400000
    }
  },
  "message": "記錄更新成功並已同步"
}
```

### 3. 刪除記錄

刪除記錄並從 CRM 和 D1 移除。

**端點:** `DELETE /api/crud/{objectApiName}/{recordId}`

**請求範例:**

```bash
curl -X DELETE https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud/NewOpportunityObj/5fc7a87982f5430001a7cf85 \
  -H "Authorization: Bearer {your-token}"
```

**回應範例:**

```json
{
  "success": true,
  "message": "記錄刪除成功並已同步"
}
```

### 4. 獲取單條記錄

從 D1 或 CRM 獲取單條記錄。

**端點:** `GET /api/crud/{objectApiName}/{recordId}`

**查詢參數:**
- `source`: 資料來源，可選值：`d1`（預設）或 `crm`

**請求範例:**

```bash
# 從 D1 獲取
curl https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud/NewOpportunityObj/5fc7a87982f5430001a7cf85 \
  -H "Authorization: Bearer {your-token}"

# 從 CRM 獲取最新資料
curl https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud/NewOpportunityObj/5fc7a87982f5430001a7cf85?source=crm \
  -H "Authorization: Bearer {your-token}"
```

### 5. 查詢記錄列表

從 D1 查詢記錄列表，支援分頁、排序和搜索。

**端點:** `GET /api/crud/{objectApiName}`

**查詢參數:**
- `page`: 頁碼（預設：1）
- `pageSize`: 每頁記錄數（預設：20）
- `sortBy`: 排序欄位（預設：fx_updated_at）
- `sortOrder`: 排序方向，ASC 或 DESC（預設：DESC）
- `search`: 搜索關鍵字（在 name 欄位中搜索）

**請求範例:**

```bash
curl "https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud/NewOpportunityObj?page=1&pageSize=10&search=測試" \
  -H "Authorization: Bearer {your-token}"
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "5fc7a87982f5430001a7cf85",
        "name": "新商機測試",
        "amount": 150000,
        "sales_stage": "stage_2",
        "fx_updated_at": "2025-01-03T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 6. 批量創建記錄

批量創建多條記錄。

**端點:** `POST /api/crud/{objectApiName}/batch`

**請求範例:**

```bash
curl -X POST https://fx-crm-sync.{your-subdomain}.workers.dev/api/crud/NewOpportunityObj/batch \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "name": "批量商機1",
        "amount": 50000,
        "close_date": 1735228800000,
        "account_id": "5fc7a87982f5430001a7cf84",
        "sales_stage": "stage_1"
      },
      {
        "name": "批量商機2",
        "amount": 80000,
        "close_date": 1735315200000,
        "account_id": "5fc7a87982f5430001a7cf84",
        "sales_stage": "stage_1"
      }
    ]
  }'
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "success": [
      {
        "_id": "5fc7a87982f5430001a7cf86",
        "name": "批量商機1"
      },
      {
        "_id": "5fc7a87982f5430001a7cf87",
        "name": "批量商機2"
      }
    ],
    "failed": []
  },
  "message": "批量創建完成: 成功 2 條，失敗 0 條"
}
```

## 支援的對象

### 標準對象
- `NewOpportunityObj` - 商機
- `AccountObj` - 客戶
- `ContactObj` - 聯絡人
- `LeadsObj` - 線索

### 自定義對象
- `object_8W9cb__c` - 案場（SPC）
- 其他自定義對象（以 `__c` 結尾）

## 錯誤處理

所有錯誤回應都使用以下格式：

```json
{
  "success": false,
  "error": "錯誤描述"
}
```

常見錯誤碼：
- `400` - 請求參數錯誤
- `401` - 未授權（Token 無效）
- `404` - 記錄不存在
- `500` - 服務器內部錯誤

## 注意事項

1. **資料同步延遲**
   - 創建/更新操作會立即同步到 CRM
   - D1 資料庫會即時更新
   - 建議使用 `source=crm` 參數獲取最新資料

2. **批量操作限制**
   - 批量創建每批最多 100 條記錄
   - 大量資料建議分批處理

3. **欄位驗證**
   - 必填欄位必須提供
   - 資料類型必須符合 CRM 定義
   - 參考值欄位需要提供有效的 ID

4. **權限控制**
   - 所有操作需要有效的 Bearer Token
   - 操作權限繼承自 CRM 用戶權限

## 使用範例

### JavaScript/Node.js

```javascript
const API_BASE = 'https://fx-crm-sync.{your-subdomain}.workers.dev';
const TOKEN = 'your-bearer-token';

// 創建記錄
async function createRecord(objectApiName, data) {
  const response = await fetch(`${API_BASE}/api/crud/${objectApiName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
}

// 更新記錄
async function updateRecord(objectApiName, recordId, data) {
  const response = await fetch(`${API_BASE}/api/crud/${objectApiName}/${recordId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
}

// 查詢記錄
async function queryRecords(objectApiName, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/api/crud/${objectApiName}?${queryString}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });
  
  return response.json();
}
```

### Python

```python
import requests

API_BASE = 'https://fx-crm-sync.{your-subdomain}.workers.dev'
TOKEN = 'your-bearer-token'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# 創建記錄
def create_record(object_api_name, data):
    response = requests.post(
        f'{API_BASE}/api/crud/{object_api_name}',
        json=data,
        headers=headers
    )
    return response.json()

# 更新記錄
def update_record(object_api_name, record_id, data):
    response = requests.put(
        f'{API_BASE}/api/crud/{object_api_name}/{record_id}',
        json=data,
        headers=headers
    )
    return response.json()

# 查詢記錄
def query_records(object_api_name, params=None):
    response = requests.get(
        f'{API_BASE}/api/crud/{object_api_name}',
        params=params,
        headers={'Authorization': f'Bearer {TOKEN}'}
    )
    return response.json()
```

## 進階功能

### 條件更新

更新記錄時可以只提供要修改的欄位：

```json
{
  "sales_stage": "stage_3",
  "probability": 80
}
```

### 關聯欄位

創建或更新記錄時，關聯欄位需要提供對應的 ID：

```json
{
  "account_id": "5fc7a87982f5430001a7cf84",
  "owner": ["FSUID_6D8AAEFBF14B69998CF7D51D21FD8309"]
}
```

### 多選欄位

多選欄位使用陣列格式：

```json
{
  "tags": ["tag1", "tag2", "tag3"]
}
```

### 日期時間欄位

日期時間使用時間戳格式（毫秒）：

```json
{
  "close_date": 1735228800000,
  "follow_up_date": 1735315200000
}
```