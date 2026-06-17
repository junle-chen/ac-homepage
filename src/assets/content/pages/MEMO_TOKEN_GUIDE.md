# 📝 Memo System Token Configuration Guide

## ✨ 新功能：Token 存储在浏览器本地

现在 GitHub token **不再硬编码在代码中**，而是保存在你的浏览器 localStorage 中，更加安全！

## 🚀 使用方法

### 首次使用（在浏览器中配置）

1. 访问 http://localhost:4000/memos 或你的网站
2. 在页面中找到 **⚙️ GitHub Settings** 面板
3. 点击 "Create one here" 链接创建 GitHub token
   - 或直接访问：https://github.com/settings/tokens/new
   - 勾选 `repo` 权限
   - 生成 token
4. 将 token 粘贴到 **GitHub Personal Access Token** 输入框
5. 点击 **💾 Save Settings**
6. Token 会自动保存在浏览器中，下次访问不需要重新输入

### 本地开发（使用配置文件）

如果你在本地开发，可以创建 `assets/js/memo-token.js` 文件：

```javascript
// This file is in .gitignore, safe for local development
window.addEventListener('DOMContentLoaded', function() {
  const localToken = 'YOUR_GITHUB_TOKEN_HERE';
  
  if (localToken && !localStorage.getItem('github_token')) {
    localStorage.setItem('github_token', localToken);
    console.log('✓ Local token loaded');
  }
});
```

**注意**：这个文件已经在 `.gitignore` 中，不会被提交到 GitHub。

## 🔒 安全性

- ✅ Token 存储在**浏览器 localStorage**，不在代码中
- ✅ 代码可以安全提交到 GitHub，不暴露 token
- ✅ 每个用户使用自己的 token
- ✅ 可以随时在 GitHub Settings 撤销 token

## 🌍 多设备使用

在每个设备/浏览器上：
1. 访问网站
2. 在 **⚙️ GitHub Settings** 中输入你的 token
3. 保存后即可使用同步功能

**注意**：每个浏览器需要单独配置一次（因为 localStorage 是浏览器本地的）

## 🔄 Token 管理

### 查看已保存的 token
在浏览器控制台运行：
```javascript
localStorage.getItem('github_token')
```

### 更新 token
1. 在 **⚙️ GitHub Settings** 面板中输入新的 token
2. 点击 **💾 Save Settings**

### 清除 token
在浏览器控制台运行：
```javascript
localStorage.removeItem('github_token')
```

或直接在设置面板清空 token 输入框并保存。

## 📋 功能说明

### Auto-sync
- ✅ 勾选：添加 public memo 时自动同步到 GitHub
- ❌ 不勾选：需要手动点击 ☁️ 图标同步

### Branch
- 默认：`master`
- 可以修改为其他分支（如 `main`, `gh-pages` 等）

## 🎯 总结

现在你的代码更安全了！
- 本地测试：使用 `memo-token.js` 文件
- 生产环境：用户在浏览器中输入自己的 token
- GitHub 仓库：代码中不包含任何 token ✨
