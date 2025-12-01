# DeepSeek API 配置指南

## 为什么使用 DeepSeek？

✅ **更便宜**：价格比 OpenAI 低很多
✅ **兼容 OpenAI API**：代码几乎不需要修改
✅ **中文支持好**：对中文内容生成效果优秀
✅ **功能不受影响**：所有功能都能正常使用

## 获取 DeepSeek API Key

1. 访问：https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制密钥（格式类似：sk-xxxxxxxxxxxxx）

## 配置步骤

### 方法 1：使用 DeepSeek（推荐）

1. 打开 `backend/.env` 文件
2. 添加或修改：
   ```
   DEEPSEEK_API_KEY=sk-你的deepseek密钥
   ```
3. 保存文件
4. 重启后端服务器

### 方法 2：同时支持两个 API

代码已经配置为优先使用 DeepSeek，如果没有 DeepSeek Key 则使用 OpenAI：

```env
# 优先使用 DeepSeek
DEEPSEEK_API_KEY=sk-你的deepseek密钥

# 如果没有 DeepSeek，使用 OpenAI（备用）
OPENAI_API_KEY=sk-你的openai密钥
```

## 模型说明

### DeepSeek 模型名称

- **deepseek-chat**：标准对话模型（推荐用于小说生成）
- **deepseek-coder**：代码生成模型（不用于小说）

### 与 OpenAI 的对比

| 功能 | OpenAI GPT-4 | DeepSeek Chat |
|------|--------------|---------------|
| 小说生成 | ✅ 优秀 | ✅ 优秀 |
| 中文支持 | ✅ 好 | ✅ 非常好 |
| 价格 | 较贵 | 便宜很多 |
| API 兼容 | ✅ | ✅ |

## 功能影响分析

### ✅ 不受影响的功能

- ✅ 完整小说生成
- ✅ 小说大纲生成
- ✅ 续写功能
- ✅ 所有类型的小说（包括 AI 主题）
- ✅ 所有参数（temperature, max_tokens 等）

### ⚠️ 需要注意的差异

1. **响应速度**：DeepSeek 可能稍慢一些（但通常可以接受）
2. **生成质量**：对于中文内容，DeepSeek 可能更好
3. **模型名称**：使用 `deepseek-chat` 而不是 `gpt-4-turbo-preview`

## 成本对比

### OpenAI GPT-4 Turbo
- 输入：$10/1M tokens
- 输出：$30/1M tokens
- 生成 10,000 字小说：约 $0.15-0.30

### DeepSeek Chat
- 输入：$0.14/1M tokens（便宜 98%！）
- 输出：$0.28/1M tokens（便宜 99%！）
- 生成 10,000 字小说：约 $0.002-0.004

**节省成本：95%+**

## 测试

配置完成后，测试步骤：

1. 启动后端服务器
2. 访问前端：http://localhost:3000
3. 尝试生成一篇短小说（60 页）
4. 检查生成结果是否正常

如果看到生成的小说内容，说明配置成功！

## 故障排除

### 问题 1：API 调用失败

**检查**：
- ✅ `.env` 文件中的 `DEEPSEEK_API_KEY` 是否正确
- ✅ API Key 是否有效（在 DeepSeek 平台检查）
- ✅ 账号是否有余额

### 问题 2：生成速度慢

**原因**：DeepSeek 的响应速度可能比 OpenAI 稍慢
**解决**：这是正常的，可以接受

### 问题 3：生成质量不满意

**尝试**：
- 调整 `temperature` 参数（0.7-0.9）
- 增加 `max_tokens`
- 优化提示词

## 切换回 OpenAI

如果想切换回 OpenAI：

1. 在 `.env` 中只保留 `OPENAI_API_KEY`
2. 删除或注释掉 `DEEPSEEK_API_KEY`
3. 修改代码中的模型名称为 `gpt-4-turbo-preview`
4. 重启服务器

## 总结

✅ **功能完全不受影响**
✅ **代码几乎不需要修改**
✅ **成本大幅降低**
✅ **中文支持更好**

推荐使用 DeepSeek API！

