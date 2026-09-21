import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'site');
const releases = JSON.parse(fs.readFileSync(path.join(root, 'data/releases.json'), 'utf8'));
const check = process.argv.includes('--check');
const publishedSite = 'https://devlb.github.io/wechat-android-version-history';
const baseUrl = (process.env.SITE_URL || publishedSite).replace(/\/$/, '');
const repositoryUrl = 'https://github.com/devlb/wechat-android-version-history';

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function compareVersions(a, b) {
  const aa = a.version.split('.').map(Number);
  const bb = b.version.split('.').map(Number);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    if ((bb[i] || 0) !== (aa[i] || 0)) return (bb[i] || 0) - (aa[i] || 0);
  }
  return 0;
}

function validate() {
  const versions = new Set();
  const urls = new Set();
  for (const release of releases) {
    if (!/^\d+(?:\.\d+)+$/.test(release.version) || versions.has(release.version)) {
      throw new Error(`无效或重复的版本号: ${release.version}`);
    }
    versions.add(release.version);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.published)) {
      throw new Error(`无效的发布日期: ${release.version}`);
    }
    if (!Array.isArray(release.downloads) || !release.downloads.length) {
      throw new Error(`缺少下载地址: ${release.version}`);
    }
    for (const download of release.downloads) {
      const url = new URL(download.url);
      if (url.protocol !== 'https:' || !['dldir1.qq.com', 'dldir1v6.qq.com'].includes(url.hostname)
          || !url.pathname.startsWith('/weixin/android/') || !url.pathname.endsWith('.apk')
          || path.posix.basename(url.pathname) !== download.filename || urls.has(url.href)) {
        throw new Error(`无效或重复的安装包链接: ${release.version} ${download.url}`);
      }
      urls.add(url.href);
    }
  }
}

function layout({ title, description, body, cssPath, detailCssPath, scriptPath, canonical, locale = 'zh', alternate }) {
  return `<!doctype html>
<html lang="${locale === 'en' ? 'en' : 'zh-CN'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(description)}">
  <title>${escape(title)}</title>
${canonical ? `  <link rel="canonical" href="${escape(canonical)}">` : ''}
${canonical && alternate ? `  <link rel="alternate" hreflang="${locale === 'en' ? 'en' : 'zh-CN'}" href="${escape(canonical)}">
  <link rel="alternate" hreflang="${locale === 'en' ? 'zh-CN' : 'en'}" href="${escape(alternate)}">` : ''}
  <link rel="stylesheet" href="${cssPath}">
${detailCssPath ? `  <link rel="stylesheet" href="${detailCssPath}">` : ''}
${scriptPath ? `  <script src="${scriptPath}" defer></script>` : ''}
</head>
<body>
${body}
</body>
</html>
`;
}

function languageNav(locale, alternateHref) {
  return `<nav class="language-nav" aria-label="${locale === 'en' ? 'Language' : '语言切换'}">${locale === 'en'
    ? `<a href="${alternateHref}" lang="zh-CN">中文</a><span aria-hidden="true">/</span><span aria-current="page">English</span>`
    : `<span aria-current="page">中文</span><span aria-hidden="true">/</span><a href="${alternateHref}" lang="en">English</a>`}</nav>`;
}

function homePage(sorted, locale = 'zh') {
  const english = locale === 'en';
  const prefix = english ? '../' : '';
  const count = sorted.reduce((total, release) => total + release.downloads.length, 0);
  const years = new Map();
  for (const release of sorted) {
    const year = release.published.slice(0, 4);
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(release);
  }
  const yearLinks = [...years].map(([year, group]) =>
    `<a href="#year-${year}">${year}<small>${group.length}</small></a>`).join('');
  const sections = [...years].map(([year, group]) => `
    <section class="year-section" id="year-${year}" aria-labelledby="heading-${year}">
      <div class="year-heading"><h2 id="heading-${year}">${year}</h2><span>${group.length} ${english ? 'versions' : '个版本'}</span></div>
      <div class="release-grid">${group.map(release => `
        <a class="release-card" href="versions/${release.version}/" data-version="${release.version}">
          <span class="card-kicker">ANDROID / ${release.published}</span>
          <strong>${release.version}</strong>
          <span class="card-foot"><span>${release.downloads.length} ${english ? 'APK files' : '个安装包'}</span><span aria-hidden="true">↗</span></span>
        </a>`).join('')}
      </div>
    </section>`).join('');
  const body = `
    <header class="topbar"><a class="brand" href="./"><span class="brand-mark">微</span><span>${english ? 'WeChat Android Archive' : '微信 Android 版本档案'}</span></a><div class="topbar-actions"><span class="topbar-note">${english ? 'Independent version index' : '独立版本索引'}</span>${languageNav(locale, english ? '../' : 'en/')}</div></header>
    <main>
      <section class="hero">
        <div class="hero-copy"><span class="eyebrow">ANDROID VERSION ARCHIVE${english ? '' : ' / 版本档案'}</span>
          <h1>${english ? 'Find the WeChat<br><em>version you need.</em>' : '找到你需要的<br><em>微信旧版本。</em>'}</h1>
          <p>${english ? 'Browse historical WeChat for Android APKs by version. Each release has its own page with the release date, filenames, and official download links.' : '按版本浏览微信 Android 历史安装包。每个版本都有独立页面，列明发布日期、文件名与官方下载地址。'}</p>
          <div class="hero-stats"><span><b>${sorted.length}</b> ${english ? 'versions' : '个版本'}</span><span><b>${count}</b> ${english ? 'APK files' : '个安装包'}</span><span><b>${years.size}</b> ${english ? 'years' : '个年份'}</span></div>
        </div>
        <div class="hero-art" aria-hidden="true"><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span><span class="art-center">8<span>.</span>0</span><span class="art-label art-label-top">VERSION<br>ARCHIVE</span><span class="art-label art-label-bottom">ANDROID<br>2014 — ${[...years][0]?.[0] || ''}</span></div>
      </section>
      <section class="browse" aria-labelledby="browse-title"><div><span class="eyebrow">BROWSE${english ? '' : ' / 浏览'}</span><h2 id="browse-title">${english ? 'All versions' : '所有版本'}</h2></div><label class="search"><span>${english ? 'Search versions' : '搜索版本号'}</span><input id="version-search" type="search" inputmode="search" placeholder="${english ? 'e.g. 8.0.78' : '例如 8.0.78'}" autocomplete="off"></label></section>
      <nav class="year-nav" aria-label="${english ? 'Browse by year' : '按年份浏览'}">${yearLinks}</nav>
      <p id="empty-state" class="empty-state" hidden>${english ? 'No matching version found.' : '没有找到这个版本号。'}</p>
${sections}
    </main>
    <footer class="footer"><span>${english ? 'WeChat Android Archive' : '微信 Android 版本档案'}</span><span>${english ? 'APK links point to Tencent’s official domain. This site does not host APK files.' : '安装包链接指向微信官方域名。本项目不托管 APK 文件。'}</span></footer>`;
  return layout({
    title: english ? 'WeChat for Android Historical Versions | Official APK Links' : '微信 Android 历史版本官方下载｜版本档案',
    description: english ? `Browse ${sorted.length} historical WeChat for Android versions and ${count} official APK download links. Find release dates and filenames by version number.` : `浏览 ${sorted.length} 个微信 Android 历史版本及 ${count} 个安装包官方下载地址，按版本号查找发布日期和 APK 文件名。`,
    body, cssPath: `${prefix}assets/site.css`, scriptPath: `${prefix}assets/search.js`, locale,
    canonical: baseUrl && `${baseUrl}/${english ? 'en/' : ''}`,
    alternate: baseUrl && `${baseUrl}/${english ? '' : 'en/'}`
  });
}

function versionPage(release, newer, older, locale = 'zh') {
  const english = locale === 'en';
  const prefix = english ? '../../../' : '../../';
  const alternateHref = english ? `../../../versions/${release.version}/` : `../../en/versions/${release.version}/`;
  const files = release.downloads.map((download, index) => `
        <article class="file-card">
          <span class="file-card__index">${String(index + 1).padStart(2, '0')}</span>
          <div class="file-card__body"><span class="file-card__label">ANDROID PACKAGE</span><h3>${escape(download.filename)}</h3><span class="file-card__host">${escape(new URL(download.url).hostname)}</span></div>
          <a class="file-card__action" href="${escape(download.url)}" rel="noopener noreferrer" aria-label="${english ? 'Download' : '下载'} ${escape(download.filename)}">${english ? 'Official download' : '官方下载'} <span aria-hidden="true">↗</span></a>
        </article>`).join('');
  const nav = [newer, older].filter(Boolean).map(item => `<a class="version-neighbor" href="../${item.version}/"><span><small>${item === newer ? (english ? 'Newer version' : '较新版本') : (english ? 'Older version' : '较早版本')}</small><strong>${item.version}</strong></span><span class="version-neighbor__arrow" aria-hidden="true">↗</span></a>`).join('');
  const body = `
    <header class="topbar"><a class="brand" href="../../"><span class="brand-mark">微</span><span>${english ? 'WeChat Android Archive' : '微信 Android 版本档案'}</span></a><div class="topbar-actions"><a class="back-link" href="../../">${english ? 'All versions' : '返回全部版本'} ↗</a>${languageNav(locale, alternateHref)}</div></header>
    <main class="version-main"><nav class="breadcrumbs" aria-label="${english ? 'Breadcrumb' : '当前位置'}"><a href="../../">${english ? 'All versions' : '全部版本'}</a><span>/</span><span>Android ${release.version}</span></nav>
      <section class="version-hero" aria-labelledby="version-title">
        <div class="version-hero__content"><span class="version-hero__eyebrow">WECHAT / ANDROID VERSION ARCHIVE</span><h1 id="version-title">${english ? 'WeChat for Android' : '微信 Android'} <em>${release.version}</em><br>${english ? 'Official downloads' : '官方下载'}</h1><p>${english ? 'Find APK filenames and official download links for this release.' : '查找该版本的安装包文件名与官方下载地址。'}</p>
          <div class="version-meta"><div><span>${english ? 'Release date' : '发布日期'}</span><strong><time datetime="${release.published}">${release.published}</time></strong></div><div><span>${english ? 'APK files' : '安装包记录'}</span><strong>${release.downloads.length} ${english ? 'files' : '个文件'}</strong></div></div>
        </div>
        <div class="version-hero__visual" aria-hidden="true"><span class="version-ring version-ring--outer"></span><span class="version-ring version-ring--inner"></span><span class="version-hero__number">${release.version}</span><span class="version-hero__stamp">ANDROID<br>RELEASE</span></div>
        <div class="version-hero__footer"><span>VERSION ${release.version}</span><span>OFFICIAL DOWNLOAD LINKS <span aria-hidden="true">↘</span></span></div>
      </section>
      <section class="download-panel" aria-labelledby="downloads-title"><div class="download-panel__heading"><div><span class="eyebrow">DOWNLOAD${english ? '' : ' / 安装包'}</span><h2 id="downloads-title">${english ? 'Choose an APK' : '选择安装包'}</h2><p>${english ? 'Choose the file you need by filename, then follow its official download link.' : '根据文件名选择需要的版本文件，点击后前往官方地址。'}</p></div><span class="download-panel__count">${String(release.downloads.length).padStart(2, '0')} <small>FILES</small></span></div>
        <div class="file-list">${files}</div><p class="download-panel__note">${english ? 'Download links go to Tencent’s official domain. This site does not store APK files.' : '下载链接指向微信官方域名；本站不保存安装包。'}</p>
      </section>
      <section class="more-versions" aria-labelledby="more-versions-title"><div class="more-versions__heading"><span class="eyebrow">KEEP EXPLORING${english ? '' : ' / 继续浏览'}</span><h2 id="more-versions-title">${english ? 'Nearby versions' : '相邻版本'}</h2></div><nav class="version-neighbors" aria-label="${english ? 'Nearby versions' : '相邻版本'}">${nav}</nav></section>
    </main>
    <footer class="footer"><span>${english ? 'WeChat Android Archive' : '微信 Android 版本档案'}</span><a href="../../">${english ? 'Browse all versions' : '浏览所有版本'} ↗</a></footer>`;
  return layout({
    title: english ? `WeChat for Android ${release.version} | Official APK Download` : `微信 Android ${release.version} 官方下载｜历史版本`,
    description: english ? `Download WeChat for Android ${release.version}. Released ${release.published}, with ${release.downloads.length} APK filename${release.downloads.length === 1 ? '' : 's'} and official Tencent download links.` : `微信 Android ${release.version} 历史版本下载，发布日期 ${release.published}，收录 ${release.downloads.length} 个安装包文件名及微信官方 APK 下载地址。`,
    body, cssPath: `${prefix}assets/site.css`, detailCssPath: `${prefix}assets/detail.css`, locale,
    canonical: baseUrl && `${baseUrl}/${english ? 'en/' : ''}versions/${release.version}/`,
    alternate: baseUrl && `${baseUrl}/${english ? '' : 'en/'}versions/${release.version}/`
  });
}

function repositoryIndex(sorted, locale, isRoot = false) {
  const english = locale === 'en';
  const versionBase = isRoot ? './zh/' : './';
  const years = new Map();
  for (const release of sorted) {
    const year = release.published.slice(0, 4);
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(release);
  }
  const sections = [...years].map(([year, group]) => `## ${year}${english ? '' : ' 年'}\n\n| ${english ? 'Version | Release date | APK files' : '版本 | 发布日期 | 安装包'} |\n| --- | --- | ---: |\n${group.map(release => `| [${english ? 'WeChat for Android' : '微信 Android'} ${release.version}](${versionBase}${release.version}/) | ${release.published} | ${release.downloads.length} |`).join('\n')}`).join('\n\n');
  const count = sorted.reduce((sum, release) => sum + release.downloads.length, 0);
  return english
    ? `# WeChat for Android Historical Versions\n\n[中文](${repositoryUrl}) | **English**\n\n[🌐 Browse the website](${publishedSite}/en/)\n\n${sorted.length} versions and ${count} official APK links. Select a version to view its download links.\n\n${sections}\n`
    : `# 微信 Android 历史版本下载\n\n**中文** | [English](${isRoot ? './en/' : '../en/'})\n\n> [!IMPORTANT]\n> 🌐 **[打开在线网站 · Open the website](${publishedSite}/)**\n\n共 ${sorted.length} 个版本、${count} 个安装包。点击版本号查看官方下载地址。\n\n${sections}\n`;
}

function repositoryVersion(release, newer, older, locale) {
  const english = locale === 'en';
  const downloads = release.downloads.map(download => `| \`${download.filename}\` | [${english ? 'Download from Tencent' : '官方下载'}](${download.url}) |`).join('\n');
  const neighbors = [newer, older].filter(Boolean).map(item => `[${english ? `${item === newer ? 'Newer' : 'Older'} version` : `${item === newer ? '较新' : '较早'}版本`} ${item.version}](../${item.version}/)`).join(' · ');
  return english
    ? `# WeChat for Android ${release.version} Historical Version Download\n\n**Version:** ${release.version} · **Release date:** ${release.published} · **APK files:** ${release.downloads.length}\n\n| APK filename | Official download |\n| --- | --- |\n${downloads}\n\nThese links go directly to Tencent's official download domain. This repository does not host APK files.\n\n[View this version on the website](${publishedSite}/en/versions/${release.version}/) · [All versions](../) · [简体中文](../../zh/${release.version}/)${neighbors ? ` · ${neighbors}` : ''}\n`
    : `# 微信 Android ${release.version} 历史版本官方下载\n\n**版本号：** ${release.version} · **发布日期：** ${release.published} · **安装包：** ${release.downloads.length} 个\n\n| 安装包文件名 | 下载地址 |\n| --- | --- |\n${downloads}\n\n以上链接指向腾讯官方域名；本仓库不保存 APK 文件。\n\n[查看网页版详情](${publishedSite}/versions/${release.version}/) · [返回全部版本](../) · [English](../../en/${release.version}/)${neighbors ? ` · ${neighbors}` : ''}\n`;
}

function write(relativePath, content, destination = output) {
  const filename = path.join(destination, relativePath);
  if (check) {
    if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== content) {
      throw new Error(`生成文件与数据不一致: ${relativePath}`);
    }
  } else {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  }
}

validate();
const sorted = [...releases].sort(compareVersions);
if (!check) fs.rmSync(output, { recursive: true, force: true });
write('README.md', repositoryIndex(sorted, 'zh', true), root);
for (const locale of ['zh', 'en']) {
  write(`${locale}/README.md`, repositoryIndex(sorted, locale), root);
  sorted.forEach((release, index) => write(`${locale}/${release.version}/README.md`, repositoryVersion(release, sorted[index - 1], sorted[index + 1], locale), root));
}
write('index.html', homePage(sorted));
write('en/index.html', homePage(sorted, 'en'));
write('assets/site.css', fs.readFileSync(path.join(root, 'src/site.css'), 'utf8'));
write('assets/detail.css', fs.readFileSync(path.join(root, 'src/detail.css'), 'utf8'));
write('assets/search.js', fs.readFileSync(path.join(root, 'src/search.js'), 'utf8'));
sorted.forEach((release, index) => write(`versions/${release.version}/index.html`, versionPage(release, sorted[index - 1], sorted[index + 1])));
sorted.forEach((release, index) => write(`en/versions/${release.version}/index.html`, versionPage(release, sorted[index - 1], sorted[index + 1], 'en')));
if (baseUrl) {
  const urls = [`${baseUrl}/`, `${baseUrl}/en/`, ...sorted.flatMap(release => [`${baseUrl}/versions/${release.version}/`, `${baseUrl}/en/versions/${release.version}/`])];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
}
console.log(`${check ? '已校验' : '已生成'} ${sorted.length} 个版本页面、${sorted.reduce((sum, release) => sum + release.downloads.length, 0)} 条下载记录`);
