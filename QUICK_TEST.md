# 快速测试指南

## 一、启动服务（如果未运行）

### 检查服务状态
访问以下地址确认服务是否运行：
- 前端：http://localhost:3000
- 后端：http://localhost:3001

### 如果未运行，执行：

**终端 1 - 前端**:
```powershell
cd novel-ai-platform
npm run dev
```

**终端 2 - 后端**:
```powershell
cd backend
npm run dev
```

---

## 二、快速测试步骤（5分钟）

### 测试1：场景化风格应用（2分钟）

1. **打开 Generator 页面**
   - 访问 http://localhost:3000/generator

2. **测试动作场景**
   - 在编辑器中输入：
   ```
   The warrior drew his sword and charged. He dodged the enemy's attack and struck back with all his might. Blood splattered as the blade found its mark.
   ```
   - 点击 "Continue" 按钮
   - **查看后端终端**：应该看到 `[Scene Detection] Detected scene type: action`
   - **预期**：续写内容应该使用快节奏、短句子

3. **测试情感场景**
   - 在编辑器中输入：
   ```
   Her heart ached with unbearable pain. Tears streamed down her face as she remembered the warmth of his embrace, the way he used to hold her close and whisper sweet words.
   ```
   - 点击 "Continue" 按钮
   - **查看后端终端**：应该看到 `[Scene Detection] Detected scene type: emotional`
   - **预期**：续写内容应该使用慢节奏、长句子、情感深度

### 测试2：风格管理界面（3分钟）

1. **学习风格**
   - 找到 "Your Writing Voice" 面板
   - 点击 "Learn from your writing"
   - 粘贴至少 200 字符的文本，例如：
   ```
   The old house stood silent in the moonlight, its windows dark and empty. Sarah approached cautiously, her footsteps crunching on the gravel path. She had been here before, many years ago, when life was simpler and the future seemed bright. Now everything had changed.
   ```
   - 点击 "Analyze & Apply"

2. **查看风格详情**
   - 学习完成后，点击 "Details" 按钮
   - **预期**：应该看到风格详情面板，显示：
     - 风格名称
     - 5 个风格特征（Tone, Pacing, Perspective, Sentence Length, Vocabulary）

3. **编辑风格**
   - 点击 "Edit" 按钮
   - 修改风格名称为 "My Mystery Style"
   - 调整 Tone Adjustment 滑块
   - 点击 "Save"
   - **预期**：更改应该保存，面板显示更新后的信息

---

## 三、验证功能是否工作

### 检查后端日志

在后端终端中，续写时应该看到：
```
[Scene Detection] Detected scene type: action
[Style Adjustment] Applied action scene adjustments
```

或

```
[Scene Detection] Detected scene type: emotional
[Style Adjustment] Applied emotional scene adjustments
```

### 检查浏览器控制台

1. 打开开发者工具（F12）
2. 进入 Console 标签
3. 应该没有错误信息

### 检查网络请求

1. 打开开发者工具（F12）
2. 进入 Network 标签
3. 执行续写操作
4. 找到 `/novel/continue` 请求
5. 查看 Request Payload 中的 `context` 和 `style` 字段

---

## 四、测试清单

快速验证：
- [ ] 前端服务运行正常（http://localhost:3000）
- [ ] 后端服务运行正常（http://localhost:3001）
- [ ] 场景识别工作（后端日志显示场景类型）
- [ ] 风格调整应用（续写内容符合场景风格）
- [ ] 风格管理界面正常（可以查看和编辑）

---

## 五、如果遇到问题

### 问题：后端没有日志输出
- 检查后端服务是否正常运行
- 检查终端是否正确显示日志

### 问题：场景识别不准确
- 确保输入文本足够长（至少 200 字符）
- 使用更明确的场景关键词

### 问题：风格详情面板无法打开
- 确认已学习风格（不是预设风格）
- 检查浏览器控制台是否有错误

### 问题：续写没有应用风格调整
- 确认 Style Memory 已激活（显示 "Active"）
- 检查后端日志，确认场景识别是否工作

---

## 六、详细测试指南

如需更详细的测试步骤，请查看 `TESTING_GUIDE.md`
