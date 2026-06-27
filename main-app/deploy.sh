#!/bin/bash
set -e
cd "$(dirname "$0")"

pm2 stop all
NODE_OPTIONS=--max-old-space-size=256 npm run build
sudo cp -r dist/* /var/www/html/
pm2 start all

echo "배포 완료"
