# 批次大小優化說明

## 調整完成

已將同步批次大小從 50 條調整為 **500 條**。

### 修改位置

1. **商機同步批次大小**
   - 文件：`workers/src/sync/data-sync-service.js`
   - 行號：212
   - 修改：`const batchSize = 500;`

2. **案場同步批次大小**
   - 文件：`workers/src/sync/data-sync-service.js`
   - 行號：300
   - 修改：`const batchSize = 500;`

### 效能影響

| 指標 | 原值 (50條) | 新值 (500條) | 改善 |
|------|------------|-------------|------|
| 批次數量 | 60批 (3000條) | 6批 (3000條) | 減少 90% |
| API 呼叫次數 | 減少 | 大幅減少 | ↓ |
| 同步總時間 | 較長 | 較短 | ↓ |
| 記憶體使用 | 較低 | 中等 | ↑ |

### 注意事項

1. **Cloudflare Workers 限制**
   - 記憶體限制：128MB
   - 執行時間限制：30秒（付費版可到 15 分鐘）
   - D1 批次操作限制：1000 條語句

2. **建議監控指標**
   - 同步成功率
   - 執行時間
   - 記憶體使用量
   - 錯誤率

3. **進一步優化建議**
   - 如果遇到超時，可以調整為 200-300 條
   - 如果記憶體充足且穩定，可嘗試提升到 1000 條
   - 根據實際數據量和 Worker 性能動態調整

### 測試結果

由於本地開發環境限制（缺少 KV namespace），完整測試需在 Cloudflare 生產環境進行。

部署步驟：
```bash
# 1. 創建 KV namespace
wrangler kv:namespace create "FX_CRM_KV"

# 2. 更新 wrangler.toml 中的 KV id

# 3. 部署到 Cloudflare
wrangler deploy

# 4. 設置 secrets
wrangler secret put FX_APP_ID
wrangler secret put FX_APP_SECRET
wrangler secret put FX_PERMANENT_CODE
wrangler secret put FX_CRM_DOMAIN
```

測試命令：
```bash
# 測試同步（生產環境）
curl -X POST https://fx-crm-sync.<your-subdomain>.workers.dev/api/sync/NewOpportunityObj/start
```