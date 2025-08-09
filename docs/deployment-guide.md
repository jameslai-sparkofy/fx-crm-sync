# 紛享銷客 CRM 同步系統部署指南

## 部署前準備

### 1. 環境需求
- Node.js 16+ 
- Wrangler CLI (Cloudflare Workers CLI)
- 有效的 Cloudflare 帳號
- D1 數據庫權限

### 2. 安裝 Wrangler
```bash
npm install -g wrangler
```

### 3. 登入 Cloudflare
```bash
wrangler login
```

## 部署步驟

### Step 1: 創建 D1 數據庫

```bash
# 創建 D1 數據庫
wrangler d1 create fx-crm-sync-db

# 記錄輸出的 database_id
```

### Step 2: 更新 wrangler.toml

將獲得的 database_id 更新到 `workers/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "fx-crm-sync-db"
database_id = "你的-database-id"
```

### Step 3: 初始化數據庫結構

```bash
# 執行初始化腳本
wrangler d1 execute fx-crm-sync-db --file=./scripts/init-database.sql

# 創建業務表
wrangler d1 execute fx-crm-sync-db --file=./scripts/create-tables.sql
```

### Step 4: 配置環境變量

創建 `.dev.vars` 文件（開發環境）:

```bash
FX_APP_ID=FSAID_1640e1e9
FX_APP_SECRET=59b6cb1f3faa4c14b48e0d9fcd8a06ef
FX_PERMANENT_CODE=12CC0267F29A71D946B64FF7C1B97F24
FX_CRM_DOMAIN=fxiaoke.journeyrent.com
```

### Step 5: 部署 Worker

```bash
cd workers

# 開發環境測試
npm run dev

# 部署到生產環境
npm run deploy
```

### Step 6: 設置生產環境 Secrets

```bash
# 設置 CRM 憑證
wrangler secret put FX_APP_ID
wrangler secret put FX_APP_SECRET
wrangler secret put FX_PERMANENT_CODE
wrangler secret put FX_CRM_DOMAIN

# 可選：設置告警 Webhook
wrangler secret put ALERT_WEBHOOK_URL
```

### Step 7: 配置定時同步

在 `wrangler.toml` 中已配置每小時同步：

```toml
[triggers]
crons = ["0 * * * *"]  # 每小時執行一次
```

## 驗證部署

### 1. 測試 API 連接

```bash
# 獲取 Worker URL
# 格式通常為: https://fx-crm-sync.<your-subdomain>.workers.dev

# 測試健康檢查
curl https://fx-crm-sync.<your-subdomain>.workers.dev/health

# 查看同步狀態
curl https://fx-crm-sync.<your-subdomain>.workers.dev/api/sync/status
```

### 2. 手動觸發同步

```bash
# 同步商機
curl -X POST https://fx-crm-sync.<your-subdomain>.workers.dev/api/sync/NewOpportunityObj/start

# 同步案場
curl -X POST https://fx-crm-sync.<your-subdomain>.workers.dev/api/sync/object_8W9cb__c/start
```

### 3. 執行測試腳本

```bash
cd scripts

# 更新 .env 文件中的 WORKER_URL
echo "WORKER_URL=https://fx-crm-sync.<your-subdomain>.workers.dev" > .env

# 運行測試
node test-sync.js
```

## 監控和維護

### 1. 查看 Worker 日誌

```bash
wrangler tail
```

### 2. 查看 D1 數據

```bash
# 查看同步記錄
wrangler d1 execute fx-crm-sync-db --command="SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10"

# 查看商機數量
wrangler d1 execute fx-crm-sync-db --command="SELECT COUNT(*) FROM newopportunityobj"

# 查看案場數量
wrangler d1 execute fx-crm-sync-db --command="SELECT COUNT(*) FROM object_8w9cb__c"
```

### 3. 性能優化建議

1. **增量同步**：系統已實現基於 last_modified_time 的增量同步
2. **批次處理**：每批 50 條記錄，可根據需要調整
3. **定時同步**：建議根據業務需求調整 cron 表達式

## 故障排除

### 常見問題

1. **Token 過期**
   - 檢查 API 憑證是否正確
   - 確認 permanentCode 是否有效

2. **同步失敗**
   - 查看 Worker 日誌：`wrangler tail`
   - 檢查 sync_logs 表中的錯誤詳情

3. **數據不一致**
   - 執行完整同步（刪除 last_sync_time）
   - 檢查 CRM 欄位是否有變更

### 支援聯繫

- 技術問題：查看 Worker 日誌和 sync_logs 表
- CRM API 問題：聯繫紛享銷客技術支援
- Cloudflare 問題：訪問 Cloudflare 文檔

## 下一步

1. 配置告警通知（Webhook）
2. 實現數據導出 API
3. 添加更多對象同步支援
4. 優化同步性能