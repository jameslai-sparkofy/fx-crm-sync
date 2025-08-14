# GitHub Actions 自動部署設定指南

## 步驟 1: 獲取 Cloudflare API Token

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 點擊右上角的頭像 → **My Profile**
3. 選擇 **API Tokens** 標籤
4. 點擊 **Create Token**
5. 使用 **Custom token** 模板
6. 設定權限：
   - **Account** - Cloudflare Workers Scripts:Edit
   - **Account** - Account Settings:Read
   - **Zone** - Zone Settings:Read
7. 點擊 **Continue to summary** → **Create Token**
8. 複製 Token（只會顯示一次！）

## 步驟 2: 獲取 Account ID

1. 在 Cloudflare Dashboard 中
2. 選擇你的帳號
3. 右側欄會顯示 **Account ID**
4. 複製 Account ID

## 步驟 3: 在 GitHub 設定 Secrets

1. 進入你的 GitHub Repository: https://github.com/jameslai-sparkofy/fx-crm-sync
2. 點擊 **Settings** → **Secrets and variables** → **Actions**
3. 點擊 **New repository secret**
4. 新增以下 secrets：

### CLOUDFLARE_API_TOKEN
- **Name**: `CLOUDFLARE_API_TOKEN`
- **Value**: 你在步驟 1 獲得的 Token

### CLOUDFLARE_ACCOUNT_ID
- **Name**: `CLOUDFLARE_ACCOUNT_ID`
- **Value**: `4178e03ce554bc3867d9211cd225e665`

## 步驟 4: 觸發部署

設定完成後，自動部署會在以下情況觸發：

1. **推送到 main 分支**：自動部署到開發環境
2. **創建版本標籤 (v*.*.*)**: 自動部署到生產環境
3. **手動觸發**：在 GitHub Actions 頁面手動執行

## 手動觸發部署

1. 進入 GitHub Repository
2. 點擊 **Actions** 標籤
3. 選擇 **Deploy to Cloudflare Workers**
4. 點擊 **Run workflow**
5. 選擇分支，點擊 **Run workflow**

## 驗證部署

部署完成後，訪問以下 URL 確認：

- **開發環境**: https://fx-crm-sync-dev.lai-jameslai.workers.dev
- **生產環境**: https://fx-crm-sync.lai-jameslai.workers.dev

## 查看部署狀態

1. 在 GitHub Repository 點擊 **Actions** 標籤
2. 可以看到所有部署歷史和狀態
3. 點擊具體的 workflow 可查看詳細日誌

## 注意事項

- API Token 請妥善保管，不要洩露
- 每次推送到 main 分支都會自動部署到開發環境
- 只有創建版本標籤時才會部署到生產環境
- 部署過程約需 1-2 分鐘

## 疑難排解

如果部署失敗：

1. 檢查 Secrets 是否正確設定
2. 確認 API Token 有正確的權限
3. 查看 GitHub Actions 的錯誤日誌
4. 確認 wrangler.toml 配置正確