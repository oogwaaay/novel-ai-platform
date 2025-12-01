# Style Memory 优化功能测试指南

## 一、启动开发环境

### 检查服务是否运行

从你的进程列表看，已经有 Node.js 进程在运行。请确认：

1. **前端服务**：访问 http://localhost:3000
2. **后端服务**：访问 http://localhost:3001

如果服务未运行，请执行：

**终端 1 - 前端**:
```bash
cd novel-ai-platform
npm run dev
```

**终端 2 - 后端**:
```bash
cd backend
npm run dev
```

---

## 二、测试新功能

### 功能1：场景化风格应用（自动启用）

**测试步骤：**

1. **进入 Generator 页面**
   - 访问 http://localhost:3000/generator
   - 或从首页导航到 Generator

2. **创建或打开一个故事**
   - 生成新故事，或打开已有故事

3. **测试续写功能（场景识别）**
   
   **测试动作场景：**
   ```
   在编辑器中输入或粘贴包含动作关键词的文本：
   "He ran as fast as he could, dodging bullets and jumping over obstacles. The enemy was close behind, firing wildly."
   ```
   - 点击 "Continue" 按钮
   - **预期结果**：AI 续写应该使用快节奏、短句子、动作动词

   **测试情感场景：**
   ```
   输入情感场景文本：
   "She felt a deep sadness wash over her. Tears streamed down her face as she remembered the warmth of his embrace, the way he used to hold her close."
   ```
   - 点击 "Continue" 按钮
   - **预期结果**：AI 续写应该使用慢节奏、长句子、情感深度

   **测试对话场景：**
   ```
   输入对话场景文本：
   "What do you mean?" she asked, her voice trembling. "I thought we had an agreement," he replied, his tone cold and distant.
   ```
   - 点击 "Continue" 按钮
   - **预期结果**：AI 续写应该关注角色声音和自然对话

4. **验证场景识别**
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签
   - 找到 `/novel/continue` 请求
   - 查看请求的 system prompt
   - **预期**：应该包含场景特定的风格调整指令

---

### 功能2：风格管理界面

**测试步骤：**

1. **学习风格**
   - 在 Generator 页面找到 "Your Writing Voice" 面板
   - 点击 "Learn from your writing" 按钮
   - 上传一个 .txt 文件或粘贴至少 200 字符的文本
   - 点击 "Analyze & Apply"

2. **查看风格详情**
   - 学习完成后，应该看到 "Active" 状态
   - 点击 "Details" 按钮
   - **预期结果**：应该显示风格详情面板，包含：
     - 风格名称（可编辑）
     - 5 个风格特征（Tone, Pacing, Perspective, Sentence Length, Vocabulary）
     - 学习来源文本预览

3. **编辑风格**
   - 在风格详情面板中点击 "Edit" 按钮
   - **测试编辑风格名称**：
     - 修改风格名称为 "My Mystery Style"
     - 点击 "Save"
     - **预期**：名称应该更新
   
   - **测试调整风格参数**：
     - 调整 Tone Adjustment 滑块（-1 到 1）
     - 调整 Pacing Adjustment 滑块
     - 点击 "Save"
     - **预期**：调整应该保存

4. **应用风格**
   - 关闭风格详情面板
   - 使用续写功能
   - **预期**：生成的文本应该应用学习到的风格

---

### 功能3：场景识别准确性测试

**测试不同场景类型：**

#### 动作场景测试
```
输入文本：
"The warrior drew his sword and charged forward. The enemy blocked his strike, but he quickly pivoted and struck again. Blood flew as the blade found its mark."
```
**预期场景类型**：`action`
**预期风格调整**：快节奏、短句子、动作动词

#### 情感场景测试
```
输入文本：
"Her heart ached with a pain she couldn't describe. The memories flooded back - his smile, his laugh, the way he made her feel safe. Now it was all gone."
```
**预期场景类型**：`emotional`
**预期风格调整**：慢节奏、长句子、情感深度

#### 对话场景测试
```
输入文本：
"What are you doing here?" she whispered, her voice barely audible. "I had to see you," he replied, stepping closer. "We need to talk."
```
**预期场景类型**：`dialogue`
**预期风格调整**：关注角色声音、自然对话

#### 描述场景测试
```
输入文本：
"The landscape stretched before them, a vast expanse of rolling hills covered in wildflowers. The sun was setting, painting the sky in shades of orange and pink. A gentle breeze carried the scent of lavender."
```
**预期场景类型**：`descriptive`
**预期风格调整**：详细描述、长句子、感官细节

#### 反思场景测试
```
输入文本：
"He wondered about the meaning of it all. What was the purpose of existence? Why were we here? These questions haunted him as he stared into the night sky."
```
**预期场景类型**：`reflective`
**预期风格调整**：哲学性语言、内省、沉思节奏

---

## 三、验证功能是否正常工作

### 检查点1：场景识别是否工作

1. 打开浏览器开发者工具（F12）
2. 进入 Console 标签
3. 在续写时，应该能看到场景识别相关的日志（如果添加了调试日志）

或者：

1. 在 `backend/src/routes/novel.routes.ts` 的 `detectSceneType` 函数中添加：
```typescript
console.log('Detected scene type:', sceneType);
```

2. 查看后端终端输出，应该能看到检测到的场景类型

### 检查点2：风格调整是否应用

1. 查看续写请求的 system prompt
2. 应该包含场景特定的调整指令，例如：
   - 动作场景：`"Use fast-paced, dynamic language with shorter sentences."`
   - 情感场景：`"Use slower, more introspective pacing with longer, descriptive sentences."`

### 检查点3：风格管理界面是否正常

1. 风格详情面板应该能正常打开和关闭
2. 编辑功能应该能保存更改
3. 风格参数调整应该能实时反映

---

## 四、常见问题排查

### 问题1：场景识别不准确

**可能原因：**
- 文本太短（少于 50 字符）
- 关键词匹配不够精确

**解决方案：**
- 确保输入文本足够长（至少 200 字符）
- 使用更明确的场景关键词

### 问题2：风格调整没有应用

**检查：**
1. 确认 Style Memory 已激活（显示 "Active"）
2. 检查后端日志，确认场景识别是否工作
3. 查看 API 请求的 system prompt

### 问题3：风格详情面板无法打开

**检查：**
1. 确认已学习风格（不是预设风格）
2. 检查浏览器控制台是否有错误
3. 确认 `StyleDetailView` 组件已正确导入

---

## 五、测试清单

- [ ] 场景识别功能正常工作
  - [ ] 动作场景识别准确
  - [ ] 情感场景识别准确
  - [ ] 对话场景识别准确
  - [ ] 描述场景识别准确
  - [ ] 反思场景识别准确

- [ ] 场景化风格应用正常工作
  - [ ] 动作场景使用快节奏
  - [ ] 情感场景使用慢节奏
  - [ ] 对话场景关注角色声音
  - [ ] 描述场景使用详细描述
  - [ ] 反思场景使用哲学性语言

- [ ] 风格管理界面正常工作
  - [ ] 可以查看风格详情
  - [ ] 可以编辑风格名称
  - [ ] 可以调整风格参数
  - [ ] 更改可以保存
  - [ ] 风格应用到续写

---

## 六、下一步测试

完成基础测试后，可以测试：

1. **边界情况**：
   - 极短文本（< 50 字符）
   - 混合场景文本
   - 无明确场景的文本

2. **性能测试**：
   - 场景识别速度（应该很快，< 10ms）
   - 风格调整对续写速度的影响（应该无影响）

3. **用户体验测试**：
   - 风格调整是否自然
   - 场景切换是否流畅
   - 风格管理界面是否易用

---

## 七、反馈收集

测试过程中，请记录：

1. **发现的问题**：
   - 场景识别不准确的情况
   - 风格调整不合适的情况
   - UI/UX 问题

2. **改进建议**：
   - 场景识别算法优化
   - 风格调整策略优化
   - 界面改进建议

3. **性能数据**：
   - 场景识别耗时
   - 风格应用效果
   - 用户满意度
