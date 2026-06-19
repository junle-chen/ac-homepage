# Junle Chen HomePage

Junle Chen 的个人研究主页，用来发布 notes、memos、daily papers、paper list 和研究链接。当前站点部署在 [junle.site](https://junle.site)，源码仓库为 [junle-chen/ac-homepage](https://github.com/junle-chen/ac-homepage)。

本仓库已经按独立个人项目维护。若 GitHub 仓库页面顶部仍显示 `forked from ...`，那是 GitHub 的仓库元数据，不是 README 或代码内容；要彻底移除，需要用下面的“取消 fork 显示”流程新建一个非 fork 仓库，或者在 GitHub 支持的设置入口中让仓库离开 fork network。

## 功能

- 个人首页：首屏动画、个人链接、移动端响应式布局。
- 站内阅读：Markdown notes/pages 在网页内打开，支持目录、搜索、归档状态和 MathJax。
- Academic 面板：Daily Paper、Paper List、论文星标、论文摘要和导出文本。
- Memos：GitHub 登录后的 owner 写入，访客只读。
- Realtime：Supabase 保存共享 memos、paper stars 和 archive 状态。
- 评论：Giscus 通过 GitHub Discussions 给站内文章提供评论。

## 本地运行

```bash
npm install
npm run build
npm run dev
```

如果使用 pnpm，遇到 `Ignored build scripts` 提示时需要先按 pnpm 的提示审批依赖构建脚本：

```bash
pnpm install
pnpm approve-builds
pnpm run build
pnpm run dev
```

`npm run dev` 会启动 gulp watch，默认从 `dist` 目录预览。构建产物也在 `dist/`。

## 配置入口

- `config.json`：首页标题、描述、入口按钮、个人链接、头像和 WebGL 背景开关。
- `src/data/homepage-content.json`：构建首页时使用的 notes/memos/resources 索引。
- `src/assets/content/homepage-content.json`：部署到站点的内容索引副本。
- `src/assets/content/notes/`：长笔记 Markdown。
- `src/assets/content/pages/`：站内说明页和功能页 Markdown。
- `src/assets/content/data/daily-papers.json`：Daily Paper 数据。
- `src/assets/content/data/zotero-paper-list.json`：Paper List 数据。
- `src/js/realtime-config.js`：Supabase URL、public anon key、owner GitHub id/login。
- `src/js/main.js` 中的 `GISCUS_CONFIG`：Giscus repo、category 和安装状态。
- `CNAME`：GitHub Pages 自定义域名，目前是 `junle.site`。

## Realtime 设置

1. 在 Supabase 创建项目，复制 Project URL 和 publishable anon key。
2. 在 Supabase SQL Editor 运行 `supabase/homepage-realtime.sql`。
3. 在 GitHub Developer Settings 创建 OAuth App，callback URL 使用：

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

4. 在 Supabase Authentication Providers 中启用 GitHub，填入 GitHub Client ID 和 Client Secret。
5. 更新 `src/js/realtime-config.js`：

```js
window.JUNLE_REALTIME_CONFIG = {
	supabaseUrl: "https://<project-ref>.supabase.co",
	supabaseAnonKey: "<publishable-anon-key>",
	ownerGithubIds: ["108796659"],
	ownerGithubLogins: ["junle-chen"],
	redirectTo: window.location.origin + window.location.pathname,
};
```

anon key 是公开前端 key；不要把 GitHub OAuth client secret 放进仓库。

## Giscus 设置

1. 在目标仓库启用 Discussions。
2. 安装 [Giscus GitHub App](https://github.com/apps/giscus) 到 `junle-chen/ac-homepage`。
3. 在 [giscus.app](https://giscus.app) 选择仓库、Discussion category 和 mapping。
4. 把生成的 repo/category 信息同步到 `src/js/main.js` 的 `GISCUS_CONFIG`。
5. 确认 `installed: true` 后重新构建部署。

## 部署到 GitHub Pages

```bash
npm run build
```

推荐在 GitHub 仓库设置中选择：

- Settings -> Pages
- Source: Deploy from a branch
- Branch: `gh-pages`
- Folder: `/ (root)`
- Custom domain: `junle.site`
- Enforce HTTPS: enabled

如果使用 `dist` 直接发布，可以把 `dist/` 内容推到 `gh-pages` 分支。

## 取消 GitHub fork 显示

README 只能改变仓库介绍，不能移除 GitHub 顶部的 fork 关系。要让 GitHub 把它当作独立项目，按官方 duplicate/mirror 思路新建一个不是 fork 创建的仓库：

```bash
git clone --bare https://github.com/junle-chen/<old-fork-repo>.git
cd <old-fork-repo>.git
git push --mirror https://github.com/junle-chen/ac-homepage.git
```

然后在本地项目里更新 remote：

```bash
git remote set-url origin https://github.com/junle-chen/ac-homepage.git
```

如果必须继续使用旧仓库名，需要先备份，再删除 GitHub 上的 fork 仓库，重新创建同名空仓库，最后 mirror-push。删除仓库是不可逆操作，执行前要确认 Pages、Issues、Discussions、Secrets、Giscus 和 Supabase OAuth callback 都能迁移。

GitHub 相关说明：

- [Duplicating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/duplicating-a-repository)
- [Deleting a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository)
- [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [About CITATION files](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)

## 引用与致谢

如果使用或参考这个网页项目，请优先使用 GitHub 右侧的 “Cite this repository” 按钮；它由根目录的 `CITATION.cff` 提供。也可以手动引用：

```bibtex
@software{Chen_Junle_HomePage_2026,
  author = {Chen, Junle},
  title = {{Junle Chen HomePage}},
  year = {2026},
  url = {https://github.com/junle-chen/ac-homepage}
}
```

外部网站、服务、库和模板来源列在 [ATTRIBUTION.md](ATTRIBUTION.md)。其中包括 GitHub Pages、Supabase、Giscus、arXiv、Zotero、WebGL Fluid Simulation、MathJax、anime.js、jsDelivr、Alibaba Iconfont、SimonAKing/HomePage 和历史迁移内容中的 Beautiful Jekyll 资产。
