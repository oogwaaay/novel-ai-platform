# 快速启动指南

## 安装步骤

### 1. 安装前端依赖
```bash
cd novel-ai-platform
npm install
```

### 2. 安装后端依赖
```bash
cd backend
npm install
```

### 3. 配置环境变量

创建 `backend/.env` 文件：
```env
PORT=3001
OPENAI_API_KEY=sk-your-openai-api-key-here
JWT_SECRET=your-secret-key-here
```

### 4. 启动开发服务器

**终端 1 - 前端**:
```bash
cd novel-ai-platform
npm run dev
```
前端将在 http://localhost:3000 运行

**终端 2 - 后端**:
```bash
cd backend
npm run dev
```
后端将在 http://localhost:3001 运行

## 功能说明

### 已实现功能
✅ AI 小说生成（完整小说）
✅ AI 小说大纲生成
✅ 多种类型选择（包括 AI 主题小说）
✅ 续写功能
✅ SEO 优化（针对关键词：novel ai, ai novel generator 等）
✅ 响应式设计

### SEO 关键词
- novel ai
- ai novel generator
- ai novel writer
- novels about ai
- ai story generator
- ai book generator

## 下一步开发

1. 用户认证系统
2. 支付集成（Stripe）
3. 图片风格转换功能
4. 数据库集成（Supabase）
5. 用户仪表板完善

## 部署

### 前端部署（Vercel）
```bash
npm run build
vercel --prod
```

### 后端部署（Railway）
```bash
railway up
```

## 注意事项

- 需要 OpenAI API Key（GPT-4）
- 当前为 MVP 版本，用户认证为演示模式
- 建议在生产环境添加数据库和完整的用户系统

