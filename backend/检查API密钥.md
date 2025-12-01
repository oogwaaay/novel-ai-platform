# 检查 API 密钥

## 当前状态

✅ `.env` 文件存在
✅ 文件内容格式正确
⚠️ 但提示"未找到 API Key"

## 可能的原因

### 原因 1：API Key 不完整

检查你的 `.env` 文件中的 `DEEPSEEK_API_KEY` 值：

**错误示例**：
```
DEEPSEEK_API_KEY=sk-
```

**正确格式**：
```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

API Key 应该是完整的，格式类似：`sk-` 后面跟着很多字符。

### 原因 2：API Key 有空格或换行

检查 `.env` 文件：
- 等号两边不要有空格
- 值后面不要有空格
- 每行末尾不要有隐藏字符

**错误**：
```
DEEPSEEK_API_KEY = sk-xxx
DEEPSEEK_API_KEY=sk-xxx 
```

**正确**：
```
DEEPSEEK_API_KEY=sk-xxx
```

## 解决步骤

### 步骤 1：检查 API Key 是否完整

1. 打开 `.env` 文件
2. 查看 `DEEPSEEK_API_KEY=sk-` 后面的内容
3. 确保是完整的密钥（通常很长，50+ 字符）

### 步骤 2：如果 API Key 不完整

1. 去 DeepSeek 平台：https://platform.deepseek.com/
2. 重新复制完整的 API Key
3. 更新 `.env` 文件
4. 保存文件

### 步骤 3：验证

在命令行输入：
```bash
type .env
```

检查输出，确保：
- `DEEPSEEK_API_KEY=sk-` 后面有完整的内容
- 没有多余的空格

### 步骤 4：重启服务器

1. 按 `Ctrl + C` 停止服务器
2. 重新运行：`npm run dev`
3. 如果还有警告，但看到 "Server running"，说明服务器已启动
4. 可以尝试生成小说测试功能

## 测试功能

即使有警告，服务器已经启动了。你可以：

1. 打开浏览器：http://localhost:3000
2. 尝试生成一篇短小说
3. 如果生成失败，说明 API Key 确实有问题
4. 如果生成成功，说明 API Key 是正确的

## 重要提示

- 服务器显示 "Server running on http://localhost:3001" 说明已经启动
- 警告信息只是提醒，不影响服务器运行
- 但如果 API Key 不正确，生成小说时会失败

