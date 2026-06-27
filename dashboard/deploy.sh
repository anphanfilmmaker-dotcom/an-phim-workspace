#!/bin/bash

# ANPHIM Dashboard Deployment Script
# Run this script on the VPS to update the code and restart the backend.

echo "========================================="
echo "🚀 Starting Deployment Process..."
echo "========================================="

# 1. Pull latest code from Github (including pre-built dist folder)
echo "📥 1. Pulling latest code from Github..."
git pull origin main

# 2. Install/Update dependencies
echo "📦 2. Installing dependencies..."
npm install --production

# 3. Restart PM2 Server
echo "🔄 3. Restarting PM2 Server..."
# Assuming PM2 was started with 'pm2 start server.cjs --name anphim-dashboard'
pm2 restart server.cjs || pm2 start server.cjs --name anphim-dashboard

echo "========================================="
echo "✅ Deployment Successful!"
echo "========================================="
