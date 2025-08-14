# 紛享銷客 CRM 同步系統 API 文檔

## 系統概述
紛享銷客 CRM 同步系統提供 RESTful API 接口，用於同步和管理 CRM 數據，包括員工、部門、商機、案場等對象。

## 基礎信息

### API 基礎路徑
```
https://fx-crm-sync.lai-jameslai.workers.dev
```

### 認證方式
目前 API 為內部使用，無需認證。未來版本將添加 API Key 認證。

### 請求格式
- Content-Type: `application/json`
- 編碼：UTF-8

### 響應格式
所有 API 響應均為 JSON 格式：
```json
{
  "success": true,
  "data": {},
  "error": "錯誤信息（僅在失敗時）"
}
```

## 員工管理 API

### 1. 獲取員工列表
**端點：** `GET /api/simple-employees`

**描述：** 獲取簡化版員工列表，包含姓名、部門、電話、Email 等基本信息。

**請求參數：**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| limit | number | 否 | 每頁記錄數，默認 50，最大 1000 |
| offset | number | 否 | 偏移量，默認 0 |
| search | string | 否 | 搜尋關鍵字（姓名或手機） |

**響應範例：**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "open_user_id": "FSUID_12345",
        "name": "張三",
        "mobile": "0912345678",
        "email": "zhangsan@example.com",
        "main_department_id": "999999",
        "main_department_name": "元心建材",
        "sub_department_ids": "[\"1000001\",\"1000002\"]",
        "sync_time": 1734567890123
      }
    ],
    "total": 17,
    "limit": 50,
    "offset": 0
  }
}
```

### 2. 同步員工資料
**端點：** `POST /api/simple-employees/sync`

**描述：** 從紛享銷客 CRM 同步最新的員工資料到本地資料庫。

**請求參數：**
```json
{
  "fullSync": true  // 是否完整同步，默認 false
}
```

**響應範例：**
```json
{
  "success": true,
  "data": {
    "total": 39,
    "successCount": 17,
    "errorCount": 0,
    "errors": []
  }
}
```

### 3. 獲取員工統計
**端點：** `GET /api/simple-employees/stats`

**描述：** 獲取員工相關統計數據。

**響應範例：**
```json
{
  "success": true,
  "data": {
    "total_employees": 17,
    "with_department": 17,
    "with_mobile": 15,
    "with_email": 10,
    "lastSyncLog": {
      "completed_at": 1734567890123,
      "synced_count": 17
    }
  }
}
```

## 部門管理 API

### 1. 獲取部門列表
**端點：** `GET /api/departments`

**描述：** 獲取組織架構的部門列表，以樹狀結構返回。

**響應範例：**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "999999",
        "name": "元心建材",
        "parent_id": null,
        "employee_count": 0,
        "children": [
          {
            "id": "1000001",
            "name": "業務部",
            "parent_id": "999999",
            "employee_count": 5,
            "children": []
          }
        ]
      }
    ]
  }
}
```

### 2. 同步部門資料
**端點：** `POST /api/departments/sync`

**描述：** 從紛享銷客 CRM 同步最新的部門資料。

**響應範例：**
```json
{
  "success": true,
  "data": {
    "totalDepartments": 9,
    "syncedCount": 9
  }
}
```

## 對象同步 API

### 1. 獲取同步狀態
**端點：** `GET /api/sync/status`

**描述：** 獲取所有對象的同步狀態。

**響應範例：**
```json
{
  "success": true,
  "data": {
    "objects": [
      {
        "objectType": "object_8W9cb__c",
        "name": "案場（SPC）",
        "lastSync": "2025-08-13T05:30:00Z",
        "recordCount": 4136,
        "status": "completed"
      },
      {
        "objectType": "NewOpportunityObj",
        "name": "商機",
        "lastSync": "2025-08-13T05:35:00Z",
        "recordCount": 1234,
        "status": "completed"
      }
    ]
  }
}
```

### 2. 手動觸發同步
**端點：** `POST /api/sync/{objectType}/start`

**描述：** 手動觸發特定對象的同步。

**路徑參數：**
- `objectType`: 對象類型（如 `object_8W9cb__c`、`NewOpportunityObj`）

**請求參數：**
```json
{
  "fullSync": false,  // 是否完整同步
  "batchSize": 200    // 批次大小
}
```

**響應範例：**
```json
{
  "success": true,
  "data": {
    "jobId": "sync_12345",
    "status": "started",
    "message": "同步已開始"
  }
}
```

### 3. 獲取同步日誌
**端點：** `GET /api/sync/logs`

**描述：** 獲取同步操作的歷史日誌。

**請求參數：**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| objectType | string | 否 | 對象類型篩選 |
| limit | number | 否 | 返回記錄數，默認 20 |
| offset | number | 否 | 偏移量，默認 0 |

**響應範例：**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "object_type": "employees_simple",
        "sync_type": "incremental",
        "started_at": 1734567890123,
        "completed_at": 1734567900456,
        "synced_count": 17,
        "error_count": 0,
        "status": "completed"
      }
    ],
    "total": 150
  }
}
```

## 資料庫統計 API

### 1. 獲取資料庫統計
**端點：** `GET /api/sync/database-stats`

**描述：** 獲取資料庫中各對象的記錄統計。

**響應範例：**
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "table": "employees_simple",
        "count": 17
      },
      {
        "table": "departments",
        "count": 9
      },
      {
        "table": "object_8W9cb__c",
        "count": 4136
      },
      {
        "table": "NewOpportunityObj",
        "count": 1234
      }
    ]
  }
}
```

## 管理介面 API

### 1. 獲取管理頁面
**端點：** `GET /admin`

**描述：** 獲取管理介面的 HTML 頁面。

### 2. 獲取員工管理頁面
**端點：** `GET /admin/employees`

**描述：** 獲取員工管理介面的 HTML 頁面。

## 錯誤代碼

| 代碼 | 說明 |
|------|------|
| 200 | 成功 |
| 400 | 請求參數錯誤 |
| 404 | 資源不存在 |
| 500 | 服務器內部錯誤 |
| 503 | 服務暫時不可用（同步進行中） |

## 資料結構

### Employee（員工）
```typescript
interface Employee {
  open_user_id: string;      // 員工唯一標識
  name: string;               // 姓名
  main_department_id: string; // 主部門 ID
  sub_department_ids: string; // 副部門 ID 列表（JSON 字符串）
  mobile?: string;            // 手機號
  email?: string;             // 電子郵件
  sync_time: number;          // 同步時間戳（毫秒）
}
```

### Department（部門）
```typescript
interface Department {
  id: string;                 // 部門 ID
  name: string;               // 部門名稱
  parent_id?: string;         // 父部門 ID
  employee_count: number;     // 員工數量
  level: number;              // 層級
  path: string;               // 部門路徑
  is_deleted: boolean;        // 是否已刪除
  last_modified: number;      // 最後修改時間
}
```

## 使用範例

### Node.js
```javascript
// 獲取員工列表
const response = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/simple-employees?limit=10');
const data = await response.json();
console.log(`總共 ${data.data.total} 位員工`);
data.data.employees.forEach(emp => {
    console.log(`${emp.name} - ${emp.main_department_name}`);
});
```

### Python
```python
import requests

# 同步員工資料
response = requests.post(
    'https://fx-crm-sync.lai-jameslai.workers.dev/api/simple-employees/sync',
    json={'fullSync': True}
)
data = response.json()
print(f"成功同步 {data['data']['successCount']} 位員工")
```

### cURL
```bash
# 獲取部門列表
curl -X GET "https://fx-crm-sync.lai-jameslai.workers.dev/api/departments"

# 觸發案場同步
curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/start" \
  -H "Content-Type: application/json" \
  -d '{"fullSync": false}'
```

## 注意事項

1. **同步頻率限制**：建議同步間隔不少於 5 分鐘，避免對 CRM 系統造成壓力。

2. **批次處理**：大量資料同步會自動分批處理，每批最多 200 條記錄。

3. **增量同步**：默認使用增量同步模式，只同步有變更的資料。

4. **資料一致性**：同步過程中可能出現短暫的資料不一致，建議在非業務高峰期進行完整同步。

5. **錯誤處理**：API 會返回詳細的錯誤信息，請根據錯誤代碼進行相應處理。

## 版本歷史

### v1.0.0 (2025-08-13)
- 初始版本發布
- 支援員工、部門同步
- 簡化的員工資料結構
- 基礎的管理介面

## 聯繫方式

如有問題或建議，請聯繫系統管理員。

---
*最後更新：2025-08-13*