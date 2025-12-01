# 🚀 从这里开始！

## 最简单的启动方式（3 步）

### 第 1 步：安装 Node.js（如果还没安装）

1. 访问：https://nodejs.org/
2. 下载并安装（选择 LTS 版本）
3. 安装完成后重启电脑

### 第 2 步：打开项目并安装

1. 找到这个文件夹：`C:\Users\Surface\Desktop\novel-ai-platform`
2. 在文件夹地址栏输入 `cmd` 然后按回车（会打开命令行）
3. 依次输入以下命令（每行一个，按回车）：

```bash
npm install
cd backend
npm install
```

### 第 3 步：配置并启动

1. 在 `backend` 文件夹创建一个文件叫 `.env`
2. 打开 `.env`，输入：
   ```
   PORT=3001
   OPENAI_API_KEY=你的OpenAI密钥
   JWT_SECRET=随便写个字符串
   ```

3. 启动后端（在 backend 文件夹的命令行）：
   ```bash
   npm run dev
   ```

4. **新开一个命令行窗口**，回到项目根目录，启动前端：
   ```bash
   npm run dev
   ```

5. 打开浏览器，访问：http://localhost:3000

## 📝 详细说明

如果上面的步骤不清楚，请查看 `INSTALLATION_GUIDE.md` 文件，里面有每一步的详细说明。

## ⚠️ 重要提示

- 需要 OpenAI API Key（免费注册：https://platform.openai.com/）
- 需要两个命令行窗口（一个运行后端，一个运行前端）
- 不要关闭命令行窗口，否则服务器会停止

## 🎯 测试

启动成功后：
1. 访问 http://localhost:3000
2. 点击 "AI Novel Generator"
3. 输入故事想法（至少 30 个字）
4. 点击 "Generate Full Length Book"

如果看到生成的小说，说明一切正常！

