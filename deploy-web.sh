#!/bin/bash

echo "=========================================="
echo "部署 Web 管理介面"
echo "=========================================="

# 確保在正確的目錄
cd "$(dirname "$0")"

# 檢查 web-app 目錄是否存在
if [ ! -d "web-app" ]; then
    echo "❌ web-app 目錄不存在"
    exit 1
fi

# 複製檔案到部署目錄
echo "📦 準備部署檔案..."
mkdir -p deployment
cp -r web-app/* deployment/

# 更新 API URL（如果需要）
echo "🔧 配置 API 端點..."
# 這裡可以根據需要修改 API URL

echo "✅ Web 管理介面準備完成"
echo ""
echo "訪問地址："
echo "https://fx-crm-sync.lai-jameslai.workers.dev/"
echo ""
echo "功能說明："
echo "1. 查看所有同步對象"
echo "2. 查看對象欄位對應表"
echo "3. 執行手動同步"
echo "4. 創建對象資料表"
echo ""
echo "=========================================="