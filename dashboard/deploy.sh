#!/bin/bash

# ANPHIM Dashboard Deployment Script
echo "========================================="
echo "🚀 Bắt đầu quá trình cập nhật ANPHIM Dashboard..."
echo "========================================="

# 1. Kiểm tra và cài đặt Git nếu chưa có
if ! command -v git &> /dev/null; then
    echo "📦 Đang cài đặt Git..."
    sudo apt-get update && sudo apt-get install git -y
fi

# 2. Cấu hình lại thư mục Git bằng HTTPS để không bị kẹt xác thực
echo "📥 Tải code mới nhất từ Github..."
cd ~/an-phim-workspace || exit
git remote set-url origin https://github.com/anphanfilmmaker-dotcom/an-phim-workspace.git
git fetch origin main
git reset --hard origin/main

# 3. Cài đặt thư viện và Build giao diện mới
echo "🔨 Đang Build giao diện mới..."
cd dashboard || exit
npm install
npm run build

# 4. Khởi động lại Server
echo "🔄 Đang khởi động lại hệ thống..."
pm2 restart all

echo "========================================="
echo "✅ Cập nhật thành công! Sếp có thể F5 lại Web."
echo "========================================="
