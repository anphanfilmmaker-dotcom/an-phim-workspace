#!/usr/bin/env bash
# ==============================================================================
# Script cài đặt & chạy tự động Trâm Anh Bot trên Google Cloud Linux VM (Ubuntu/Debian)
# ==============================================================================

set -e

WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_USER="$(whoami)"

echo "=================================================="
echo "🚀 ĐANG CÀI ĐẶT TRÂM ANH PM TELEGRAM BOT (24/7)"
echo "Thư mục: $WORKDIR"
echo "User: $CURRENT_USER"
echo "=================================================="

# 1. Cập nhật gói và cài python3-venv nếu chưa có
echo "📦 Kiểm tra Python & thư viện hệ thống..."
if ! command -v python3 &> /dev/null; then
    echo "Cài đặt Python3..."
    sudo apt-get update -y
    sudo apt-get install -y python3 python3-pip python3-venv
fi

# 2. Tạo virtualenv nếu chưa có
if [ ! -d "$WORKDIR/.venv" ]; then
    echo "🔨 Đang khởi tạo môi trường ảo Python (.venv)..."
    python3 -m venv "$WORKDIR/.venv"
fi

# 3. Kích hoạt venv và cài đặt dependencies
echo "📥 Đang cài đặt thư viện từ requirements.txt..."
"$WORKDIR/.venv/bin/pip" install --upgrade pip
"$WORKDIR/.venv/bin/pip" install -r "$WORKDIR/requirements.txt"

# 4. Kiểm tra file .env
if [ ! -f "$WORKDIR/.env" ]; then
    echo "⚠️ CHÚ Ý: Chưa tìm thấy file .env tại $WORKDIR/.env"
    echo "Vui lòng copy file .env có chứa TELEGRAM_BOT_TOKEN và DATABASE_URL vào thư mục này."
    exit 1
fi

# 5. Cấu hình Systemd Service
echo "⚙️ Đang cấu hình Systemd Service (tram_anh_bot.service)..."
PYTHON_BIN="$WORKDIR/.venv/bin/python3"

SERVICE_FILE="/etc/systemd/system/tram_anh_bot.service"

sudo bash -c "cat <<EOF > $SERVICE_FILE
[Unit]
Description=Tram Anh PM Telegram Assistant Bot 24/7
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$WORKDIR
ExecStart=$PYTHON_BIN $WORKDIR/tram_anh_bot.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF"

# 6. Kích hoạt và bật dịch vụ khởi động cùng hệ thống
echo "🔄 Reload Systemd & khởi động bot..."
sudo systemctl daemon-reload
sudo systemctl enable tram_anh_bot.service
sudo systemctl restart tram_anh_bot.service

echo "=================================================="
echo "✅ CÀI ĐẶT HOÀN TẤT THÀNH CÔNG!"
echo "Bot Trâm Anh đã được khởi động và tự động chạy nền 24/7."
echo "Kiểm tra trạng thái:"
sudo systemctl status tram_anh_bot.service --no-pager
echo "=================================================="
