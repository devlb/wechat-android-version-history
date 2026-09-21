# 微信 Android 版本档案

这是一个独立的静态站点项目。每个微信 Android 版本都有自己的 HTML 页面、页面标题、发布日期、安装包文件名和官方下载地址。项目不托管 APK 文件。

## 本地使用

需要 Node.js 20 或更新版本，无需安装依赖。

```bash
npm run build
python3 -m http.server 8000 -d site
```

浏览 `http://localhost:8000/`。`npm run check` 可检查生成的页面与数据是否一致。

## 更新版本

在 `data/releases.json` 中新增一个版本对象，写入版本号、发布日期和该版本的安装包文件名与官方下载地址，然后运行 `npm run build`。构建程序会自动更新首页和 `site/versions/<版本号>/index.html`。

站点部署到最终域名时，设置 `SITE_URL` 再构建，例如：

```bash
SITE_URL=https://example.com npm run build
```

这样会为各版本生成 canonical 链接和 `sitemap.xml`。生成后的 `site/` 可部署到任何静态网站服务。
使用 `npm run check` 检查这一构建时，也应设置相同的 `SITE_URL`。

## GitHub Pages 部署

1. 将整个项目推送到 GitHub 仓库的 `main` 分支。
2. 在仓库的 **Settings → Pages → Build and deployment** 中，将 **Source** 设为 **GitHub Actions**。
3. 打开 **Actions**，查看 `Publish GitHub Pages` 工作流。部署成功后，站点地址会显示在 **Settings → Pages**。

工作流会重新构建并发布 `site/`，自动使用 Pages 的实际地址生成 canonical 链接和 `sitemap.xml`。仓库作为项目站点部署时，页面链接也适用于 `/仓库名/` 子路径。
