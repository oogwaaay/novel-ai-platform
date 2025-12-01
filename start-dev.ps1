# 启动开发环境脚本
Write-Host "正在启动后端服务器..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

Start-Sleep -Seconds 2

Write-Host "正在启动前端开发服务器..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "`n开发服务器已启动！" -ForegroundColor Yellow
Write-Host "前端: http://localhost:5173" -ForegroundColor Cyan
Write-Host "后端: http://localhost:3001" -ForegroundColor Cyan



