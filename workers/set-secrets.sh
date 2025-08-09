#!/bin/bash

# 設置 FXiaoke API Secrets

echo "Setting FX_APP_ID..."
echo "FSAID_1640e1e9" | wrangler secret put FX_APP_ID

echo "Setting FX_APP_SECRET..."
echo "59b6cb1f3faa4c14b48e0d9fcd8a06ef" | wrangler secret put FX_APP_SECRET

echo "Setting FX_PERMANENT_CODE..."
echo "12CC0267F29A71D946B64FF7C1B97F24" | wrangler secret put FX_PERMANENT_CODE

echo "Setting FX_CRM_DOMAIN..."
echo "fxiaoke.journeyrent.com" | wrangler secret put FX_CRM_DOMAIN

echo "All secrets have been set!"