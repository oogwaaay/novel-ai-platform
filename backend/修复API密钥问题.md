# 修复 API 密钥错误

## 错误原因

错误信息：`The OPENAI_API_KEY environment variable is missing or empty`

这说明 `.env` 文件没有被正确读取。

## 解决方法

### 方法 1：检查 .env 文件位置和内容

1. **确认文件位置**
   - `.env` 文件必须在 `backend` 文件夹里
   - 路径应该是：`C:\Users\Surface\Desktop\novel-ai-platform\backend\.env`

2. **检查文件内容**
   - 打开 `.env` 文件
   - 确保内容格式正确（没有多余的空格）：
   ```
   PORT=3001
   DEEPSEEK_API_KEY=sk-你的密钥
   JWT_SECRET=abc123
   ```

3. **重要检查**
   - 文件名必须是 `.env`（前面有点，没有扩展名）
   - 不能是 `.env.txt`
   - 不能是 `env.txt`

### 方法 2：如果文件创建有问题

如果无法创建 `.env` 文件，可以：

1. 打开命令行（在 backend 文件夹）
2. 输入以下命令创建文件：
   ```bash
   echo PORT=3001 > .env
   echo DEEPSEEK_API_KEY=sk-你的密钥 >> .env
   echo JWT_SECRET=abc123 >> .env
   ```
   （记得把 `sk-你的密钥` 替换成真实密钥）

### 方法 3：使用环境变量（临时）

如果 `.env` 文件还是不行，可以临时设置环境变量：

**Windows PowerShell：**
```powershell
$env:DEEPSEEK_API_KEY="sk-你的密钥"
$env:PORT="3001"
npm run dev
```

**Windows CMD：**
```cmd
set DEEPSEEK_API_KEY=sk-你的密钥
set PORT=3001
npm run dev
```

## 验证文件是否正确

1. 在 backend 文件夹打开命令行
2. 输入：`type .env`（Windows）或 `cat .env`（如果安装了 Git Bash）
3. 应该能看到文件内容

## 重启服务器

修改 `.env` 文件后，必须：
1. 停止当前服务器（Ctrl + C）
2. 重新启动：`npm run dev`

## 常见问题

### 问题 1：文件名显示为 `.env.txt`
- 解决：在文件资源管理器中，点击"查看" → 勾选"文件扩展名"
- 然后重命名，删除 `.txt` 部分

### 问题 2：文件创建在错误的位置
- 解决：确保在 `backend` 文件夹里创建
- 路径应该是：`novel-ai-platform\backend\.env`

### 问题 3：API Key 有空格
- 解决：确保 `DEEPSEEK_API_KEY=sk-xxx` 中间没有空格
- 错误：`DEEPSEEK_API_KEY = sk-xxx`（有空格）
- 正确：`DEEPSEEK_API_KEY=sk-xxx`（无空格）

