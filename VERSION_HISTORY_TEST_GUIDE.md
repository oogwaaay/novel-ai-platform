# 版本历史功能测试指南

## 📋 测试前准备

### 1. 确保后端服务器运行
```bash
cd backend
npm run dev
```
后端应该在 `http://localhost:3001` 运行

### 2. 确保前端服务器运行
```bash
npm run dev
```
前端应该在 `http://localhost:5173` 运行

### 3. 切换到 Pro 或 Unlimited 计划
版本历史是 **Pro+ 功能**，需要 Pro 或 Unlimited 订阅。

**在开发模式下：**
1. 打开 Generator 页面
2. 在顶部工具栏找到黄色的调试栏（Debug: Current tier）
3. 点击 **"Pro (AI Assistant)"** 按钮切换到 Pro 计划

---

## 🧪 测试路径

### 测试场景 1：自动版本创建

#### 步骤 1：创建或打开项目
1. 访问 `http://localhost:5173/generator`
2. 如果已有项目，直接编辑；如果没有，先创建一个：
   - 在 Context 面板输入一个 idea（例如："A story about a robot learning to love"）
   - 点击 "Generate" 生成内容
   - 系统会自动创建项目并保存

#### 步骤 2：编辑内容触发自动保存
1. 在编辑器中输入或修改一些文本（至少 50 个字符）
2. **等待 3 秒**（自动保存的防抖时间）
3. 系统会自动保存到后端，并**自动创建版本快照**

#### 步骤 3：验证自动版本创建
1. 点击顶部工具栏的 **"Versions"** 按钮（时钟图标）
2. 应该看到版本历史抽屉打开
3. 应该能看到至少一个版本（自动创建的）
4. 版本应该显示：
   - 创建时间
   - "Latest" 标签（如果是最近的版本）
   - 字数统计

---

### 测试场景 2：手动创建版本快照

#### 步骤 1：打开版本历史
1. 点击顶部工具栏的 **"Versions"** 按钮

#### 步骤 2：创建手动快照
1. 在版本历史抽屉中，点击 **"+ Create snapshot"** 按钮
2. 输入版本标签（可选，例如："Before major rewrite"）
3. 点击 **"Create Version"** 按钮
4. 应该看到新版本出现在列表顶部，带有你输入的标签

#### 步骤 3：验证手动版本
1. 检查新版本是否显示：
   - 你输入的标签
   - 创建时间
   - "Latest" 标签（因为是最新的）

---

### 测试场景 3：查看版本详情和 Diff

#### 步骤 1：选择版本
1. 在版本历史列表中，点击任意版本的 **"View"** 按钮
2. 版本卡片应该展开，显示：
   - 内容预览（前 500 字符）
   - 字数统计
   - 与当前版本的差异统计（+X words, -Y words）

#### 步骤 2：查看 Diff
1. 在展开的版本卡片中，点击 **"Show diff"** 按钮
2. 应该看到：
   - 绿色高亮：新增的句子（+ 开头）
   - 红色删除线：删除的句子（- 开头）
   - 普通文本：未改变的句子
   - 差异摘要（+X words added, -Y words removed）

#### 步骤 3：验证 Diff 准确性
1. 对比显示的 diff 和实际内容变化
2. 确认差异统计是否正确

---

### 测试场景 4：恢复版本

#### 步骤 1：修改当前内容
1. 在编辑器中**大幅修改**当前内容（例如：删除或重写一大段）
2. 等待自动保存（3 秒）
3. 确认内容已改变

#### 步骤 2：打开版本历史
1. 点击 **"Versions"** 按钮
2. 选择一个**不是最新版本**的版本（不能恢复最新版本）

#### 步骤 3：恢复版本
1. 点击该版本的 **"Restore"** 按钮
2. 确认对话框（"Restore to this version? This will create a new version of your current work first."）
3. 点击确认
4. 系统应该：
   - 先创建当前版本的快照（"Before restore"）
   - 然后恢复选中的版本
   - 创建恢复后的版本（"Restored from: ..."）

#### 步骤 4：验证恢复
1. 检查编辑器内容是否已恢复到选中版本
2. 检查版本历史中是否有新的版本：
   - "Before restore" 版本
   - "Restored from: ..." 版本

---

### 测试场景 5：删除版本

#### 步骤 1：打开版本历史
1. 点击 **"Versions"** 按钮

#### 步骤 2：删除版本
1. 选择一个版本（不能删除最新版本）
2. 点击 **"Delete"** 按钮
3. 确认对话框（"Delete this version? This action cannot be undone."）
4. 点击确认

#### 步骤 3：验证删除
1. 版本应该从列表中消失
2. 如果该版本之前是展开的，应该自动关闭

---

### 测试场景 6：版本限制（最多 20 个版本）

#### 步骤 1：创建多个版本
1. 多次修改内容并等待自动保存
2. 或多次手动创建快照

#### 步骤 2：验证版本限制
1. 当版本数量超过 20 个时
2. 最旧的版本应该被自动删除
3. 列表中应该只保留最新的 20 个版本

---

## 🔍 调试技巧

### 检查版本是否创建
1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 过滤 `versions` 请求
4. 查看：
   - `GET /api/projects/:id/versions` - 获取版本列表
   - `POST /api/projects/:id/versions` - 创建版本
   - `POST /api/projects/:id/versions/:versionId/restore` - 恢复版本
   - `DELETE /api/projects/:id/versions/:versionId` - 删除版本

### 检查控制台错误
1. 打开浏览器开发者工具（F12）
2. 切换到 **Console** 标签
3. 查看是否有错误信息

### 检查后端日志
1. 查看后端终端输出
2. 应该能看到版本操作的日志：
   - `[Project Update] Creating version for project: ...`
   - `[Version] Created version: ...`

---

## ⚠️ 常见问题排查

### 问题 1：看不到 "Versions" 按钮
**原因：** 当前计划不是 Pro 或 Unlimited
**解决：** 
1. 在开发模式下，使用调试栏切换到 Pro 计划
2. 或确保已登录且订阅了 Pro+ 计划

### 问题 2：点击 "Versions" 按钮没有反应
**原因：** 当前没有项目（`currentProject` 为 null）
**解决：**
1. 先创建一个项目（生成内容或从 Dashboard 打开项目）
2. 确保项目已保存到后端

### 问题 3：版本列表为空
**原因：** 
- 内容变化太小，没有触发自动版本创建
- 项目刚创建，还没有内容变化
**解决：**
1. 修改内容并等待 3 秒自动保存
2. 或手动创建版本快照

### 问题 4：恢复版本后内容没有变化
**原因：** 恢复逻辑可能有问题
**解决：**
1. 检查浏览器控制台是否有错误
2. 检查后端日志
3. 确认 `onRestore` 回调是否正确执行

### 问题 5：Diff 显示不准确
**原因：** Diff 算法是简单的句子级别比较
**解决：** 这是预期的行为，diff 主要用于快速查看大致变化，不是精确的字符级别 diff

---

## ✅ 测试检查清单

- [ ] 能够看到 "Versions" 按钮（Pro+ 计划）
- [ ] 编辑内容后自动创建版本（等待 3 秒）
- [ ] 能够手动创建版本快照
- [ ] 能够查看版本列表
- [ ] 能够展开版本查看详情
- [ ] 能够查看版本 diff
- [ ] 能够恢复版本（非最新版本）
- [ ] 恢复版本后内容正确更新
- [ ] 能够删除版本（非最新版本）
- [ ] 版本限制生效（最多 20 个）
- [ ] 版本标签正确显示
- [ ] 版本时间正确显示
- [ ] Diff 统计基本准确

---

## 📝 测试数据建议

为了更好的测试效果，建议使用以下测试数据：

1. **初始内容：**
   ```
   Once upon a time, there was a robot named Alex. Alex lived in a small workshop and dreamed of exploring the world.
   ```

2. **第一次修改：**
   ```
   Once upon a time, there was a robot named Alex. Alex lived in a small workshop and dreamed of exploring the world. One day, Alex decided to leave the workshop and see what was outside.
   ```

3. **第二次修改（大幅修改）：**
   ```
   In a distant future, a sentient robot named Alex discovered the meaning of love through an unexpected friendship with a human child.
   ```

这样可以清楚地看到版本之间的差异。

---

## 🎯 快速测试流程（5 分钟）

1. **切换到 Pro 计划**（调试栏）
2. **生成或打开项目**
3. **修改内容** → 等待 3 秒 → 自动创建版本
4. **点击 "Versions" 按钮** → 查看版本列表
5. **点击 "View"** → 查看版本详情
6. **点击 "Show diff"** → 查看差异
7. **点击 "Restore"** → 恢复版本
8. **验证内容已恢复**

---

完成以上测试后，版本历史功能应该可以正常工作了！



