#!/bin/bash

# 紛享銷客 CRM 同步系統 - 部署測試腳本

echo "================================"
echo "CRM 同步系統部署測試"
echo "================================"
echo ""

# 檢查環境
echo "Step 1: 檢查環境..."

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝"
    exit 1
else
    echo "✅ Node.js $(node --version)"
fi

# 檢查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝"
    exit 1
else
    echo "✅ npm $(npm --version)"
fi

# 檢查 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler 未安裝，正在安裝..."
    npm install -g wrangler
else
    echo "✅ Wrangler $(wrangler --version)"
fi

echo ""
echo "Step 2: 測試本地環境..."

# 進入 workers 目錄
cd workers

# 檢查 .dev.vars 文件
if [ ! -f ".dev.vars" ]; then
    echo "⚠️  創建 .dev.vars 文件..."
    cat > .dev.vars << EOF
FX_APP_ID=FSAID_1640e1e9
FX_APP_SECRET=59b6cb1f3faa4c14b48e0d9fcd8a06ef
FX_PERMANENT_CODE=12CC0267F29A71D946B64FF7C1B97F24
FX_CRM_DOMAIN=fxiaoke.journeyrent.com
EOF
    echo "✅ .dev.vars 文件已創建"
else
    echo "✅ .dev.vars 文件存在"
fi

# 安裝依賴
echo ""
echo "Step 3: 安裝依賴..."
npm install

echo ""
echo "Step 4: 創建測試用 D1 數據庫..."

# 創建本地 D1 數據庫
wrangler d1 create fx-crm-sync-test --local

# 初始化數據庫結構
echo ""
echo "Step 5: 初始化數據庫結構..."
wrangler d1 execute fx-crm-sync-test --local --file=../scripts/init-database.sql
wrangler d1 execute fx-crm-sync-test --local --file=../scripts/create-tables.sql

echo ""
echo "================================"
echo "測試環境準備完成！"
echo "================================"
echo ""
echo "接下來可以執行："
echo "1. 本地開發測試: npm run dev"
echo "2. 執行同步測試: cd ../scripts && node test-sync.js"
echo "3. 部署到生產環境: npm run deploy"
echo ""
echo "詳細部署步驟請參考: docs/deployment-guide.md"