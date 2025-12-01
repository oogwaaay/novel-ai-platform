# 详细安装和启动指南

## 什么是"快速启动"？

"快速启动"就是让你在本地电脑上运行这个项目，看到网站效果的过程。

## 前提条件

在开始之前，你需要：

1. **安装 Node.js**
   - 访问：https://nodejs.org/
   - 下载并安装 LTS 版本（推荐 18.x 或 20.x）
   - 安装完成后，打开命令行验证：
     ```bash
     node --version
     npm --version
     ```
   - 如果显示版本号，说明安装成功

2. **准备 OpenAI API Key**
   - 访问：https://platform.openai.com/api-keys
   - 注册/登录账号
   - 创建新的 API Key
   - 复制并保存好（格式类似：sk-xxxxxxxxxxxxx）

## 详细操作步骤

### 步骤 1：打开项目文件夹

1. 找到项目文件夹：`C:\Users\Surface\Desktop\novel-ai-platform`
2. 在这个文件夹里，按住 `Shift` 键，然后右键点击空白处
3. 选择"在此处打开 PowerShell 窗口"或"在此处打开命令窗口"

### 步骤 2：安装前端依赖

在打开的窗口中，输入以下命令（每行一个，按回车执行）：

```bash
npm install
```

**这个命令的作用**：
- 下载并安装所有前端需要的代码库
- 可能需要 1-3 分钟
- 看到 "added XXX packages" 就说明成功了

**如果遇到错误**：
- 如果提示 "npm 不是内部或外部命令"，说明 Node.js 没有正确安装
- 如果下载很慢，可以使用国内镜像：
  ```bash
  npm install --registry=https://registry.npmmirror.com
  ```

### 步骤 3：安装后端依赖

继续在同一个窗口，输入：

```bash
cd backend
npm install
```

**这个命令的作用**：
- 进入 backend 文件夹
- 安装后端需要的代码库

### 步骤 4：配置环境变量

1. 在 `backend` 文件夹里，创建一个新文件，命名为 `.env`
2. 打开这个文件，输入以下内容：

```
PORT=3001
OPENAI_API_KEY=sk-你的API密钥
JWT_SECRET=随便写一个随机字符串
```

**示例**：
```
PORT=3001
OPENAI_API_KEY=sk-abc123def456ghi789
JWT_SECRET=my-secret-key-12345
```

**重要**：
- 把 `sk-你的API密钥` 替换成你从 OpenAI 获取的真实 API Key
- `JWT_SECRET` 可以随便写，比如 `my-secret-123`

### 步骤 5：启动后端服务器

在命令行窗口（确保在 backend 文件夹），输入：

```bash
npm run dev
```

**你会看到**：
```
Server running on http://localhost:3001
```

**说明**：
- 后端服务器已经启动
- 保持这个窗口打开，不要关闭
- 如果看到错误，检查 `.env` 文件是否正确配置

### 步骤 6：启动前端（新开一个窗口）

1. **打开新的命令行窗口**：
   - 再次找到项目文件夹
   - 按住 `Shift` + 右键，选择"在此处打开 PowerShell"

2. 在新窗口中输入：

```bash
npm run dev
```

**你会看到**：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**说明**：
- 前端服务器已经启动
- 网站地址是：http://localhost:3000

### 步骤 7：打开网站

1. 打开浏览器（Chrome、Edge、Firefox 都可以）
2. 在地址栏输入：`http://localhost:3000`
3. 按回车

**你应该看到**：
- 一个漂亮的紫色渐变背景
- "Novel AI - AI Novel Generator" 标题
- 导航菜单和按钮

## 测试功能

### 测试 AI 小说生成

1. 点击 "AI Novel Generator" 或 "Start Writing Free"
2. 选择类型（比如 "General Fiction"）
3. 在文本框输入至少 30 个字的故事想法，例如：
   ```
   一个年轻的侦探在一个海滨小镇调查一系列神秘失踪案件时，发现了一个隐藏的阴谋。
   随着调查深入，他发现这个小镇隐藏着不为人知的秘密。
   ```
4. 调整长度滑块（比如 100 页）
5. 点击 "Generate Full Length Book"

**注意**：
- 生成可能需要 30 秒到 2 分钟
- 需要有效的 OpenAI API Key
- 如果看到错误，检查后端是否正常运行

## 常见问题解决

### 问题 1：端口被占用

**错误信息**：`Port 3000 is already in use`

**解决方法**：
1. 关闭占用端口的程序
2. 或者修改端口（在 `vite.config.ts` 中）

### 问题 2：找不到模块

**错误信息**：`Cannot find module 'xxx'`

**解决方法**：
```bash
# 删除 node_modules 重新安装
rm -rf node_modules
npm install
```

### 问题 3：API 调用失败

**错误信息**：`Failed to generate novel`

**检查清单**：
- ✅ `.env` 文件是否存在
- ✅ `OPENAI_API_KEY` 是否正确
- ✅ 后端服务器是否在运行（http://localhost:3001）
- ✅ OpenAI 账号是否有余额

### 问题 4：页面空白

**可能原因**：
- 前端没有正确启动
- 浏览器缓存问题

**解决方法**：
1. 检查前端是否运行（看命令行窗口）
2. 按 `Ctrl + F5` 强制刷新浏览器
3. 打开浏览器开发者工具（F12）查看错误

## 停止服务器

当你想停止时：

1. **停止前端**：在运行 `npm run dev` 的窗口，按 `Ctrl + C`
2. **停止后端**：在运行后端服务器的窗口，按 `Ctrl + C`

## 下一步

项目运行成功后，你可以：

1. **修改代码**：编辑 `src` 文件夹里的文件，保存后会自动刷新
2. **添加功能**：参考代码结构添加新功能
3. **部署上线**：使用 Vercel（前端）和 Railway（后端）

## 需要帮助？

如果遇到问题：
1. 检查所有步骤是否都完成了
2. 查看命令行窗口的错误信息
3. 确认 Node.js 和 npm 已正确安装
4. 确认 OpenAI API Key 有效

