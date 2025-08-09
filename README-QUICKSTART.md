# 🚀 快速開始指南

## 系統概述

本系統實現了從紛享銷客CRM動態讀取對象和欄位，並自動創建對應的D1資料表。

### 核心功能
1. **動態對象發現** - 自動讀取CRM中的所有對象（預設和自定義）
2. **欄位自動映射** - 保持CRM欄位名稱不變，自動映射資料類型
3. **Schema變更檢測** - 檢測欄位新增/刪除並同步更新
4. **Web管理介面** - 可視化管理對象和欄位

## 部署步驟

### 1. 設置Cloudflare資源

```bash
# 創建D1資料庫
wrangler d1 create fx-crm-database

# 創建KV命名空間
wrangler kv:namespace create "FX_SYNC_KV"

# 創建R2存儲桶（可選）
wrangler r2 bucket create fx-crm-assets
```

### 2. 配置環境

編輯 `workers/wrangler.toml`，填入您的資源ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "fx-crm-database"
database_id = "YOUR_D1_DATABASE_ID"  # 替換為實際ID

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"  # 替換為實際ID
```

### 3. 設置紛享銷客憑證

```bash
# 設置密鑰（生產環境）
wrangler secret put FX_APP_ID
wrangler secret put FX_APP_SECRET
wrangler secret put FX_PERMANENT_CODE
```

### 4. 初始化資料庫

```bash
# 執行初始化腳本
wrangler d1 execute fx-crm-database --file=scripts/init-database.sql
```

### 5. 部署Worker

```bash
cd workers
npm install
wrangler deploy
```

## 測試商機對象

### 使用測試腳本

```bash
# 設置Worker URL
export WORKER_URL=https://fx-crm-sync.YOUR-SUBDOMAIN.workers.dev/api

# 執行測試
node scripts/test-opportunity.js
```

### 預期結果

1. **找到商機對象** - 在對象列表中找到 `NewOpportunityObj`
2. **讀取欄位** - 獲取所有83個欄位定義
3. **創建資料表** - 自動生成 `newopportunityobj` 表

## API端點

### 獲取對象列表
```
GET /api/objects
```

返回：
```json
{
  "success": true,
  "data": {
    "defaultObjects": [...],
    "customObjects": [
      {
        "apiName": "NewOpportunityObj",
        "displayName": "商機",
        "isCustom": true,
        "isSynced": false,
        "tableName": null
      }
    ]
  }
}
```

### 獲取對象欄位
```
GET /api/objects/NewOpportunityObj/fields
```

返回：
```json
{
  "success": true,
  "data": {
    "objectApiName": "NewOpportunityObj",
    "systemFields": [...],
    "customFields": [...],
    "totalFields": 83
  }
}
```

### 創建資料表
```
POST /api/schema/NewOpportunityObj/create
```

### 檢測Schema變更
```
GET /api/schema/NewOpportunityObj/changes
```

## Web管理介面

訪問 Worker URL 即可看到管理介面：

```
https://fx-crm-sync.YOUR-SUBDOMAIN.workers.dev/
```

功能：
- 查看所有CRM對象
- 區分預設和自定義對象
- 查看每個對象的欄位詳情
- 一鍵創建資料表
- 同步Schema變更

## 注意事項

1. **欄位名稱保持不變** - 所有欄位名稱與CRM保持一致
2. **D1限制** - 不支持DROP COLUMN，刪除的欄位只標記為inactive
3. **資料類型映射** - 自動映射CRM類型到SQL類型
4. **定時同步** - 每5分鐘自動檢查Schema變更

## 故障排除

### 找不到對象
- 確認紛享銷客API憑證正確
- 檢查對象API名稱是否正確

### 創建表失敗
- 確認D1資料庫已正確綁定
- 檢查是否有重複的表名

### 欄位同步問題
- 查看 `schema_change_logs` 表的錯誤記錄
- 確認CRM中的欄位定義是否有效