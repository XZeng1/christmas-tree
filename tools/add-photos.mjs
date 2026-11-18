#!/usr/bin/env node
/**
 * 把照片批量导入 photos/，自动重命名成 1.jpg、2.jpg … 并生成 manifest.json
 *
 * 用法（在项目根目录执行）：
 *   node tools/add-photos.mjs "D:/婚礼照片"
 *   node tools/add-photos.mjs "D:/婚礼照片" --move          # 导入后删除源文件
 *   node tools/add-photos.mjs "D:/婚礼照片" --start 5        # 从 5 开始编号
 *   node tools/add-photos.mjs "D:/婚礼照片" --clean          # 先清空 photos/ 里的旧图再导入
 *
 * 什么时候需要它：
 *   - 本地预览（python -m http.server 之类无法列目录，只能靠序号或 manifest）
 *   - 想把一堆乱命名照片统一成 1.jpg、2.jpg（便于排序）
 *   - 作为兜底清单：GitHub 的目录 API 未登录只有 60 次/小时/IP，超了会回退到 manifest
 *
 * 如果只是在 GitHub 网页上往 photos/ 传图，不需要这个脚本 —— 页面会直接读仓库目录，
 * 文件名随意。
 */
import { readdir, copyFile, rename, unlink, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename, resolve } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PHOTO_DIR = join(ROOT, 'photos');
const MANIFEST = join(PHOTO_DIR, 'manifest.json');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));

const startIdx = (() => {
  const i = argv.indexOf('--start');
  const v = i >= 0 ? parseInt(argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : null;
})();
const doMove = flags.has('--move');
const doClean = flags.has('--clean');

if (positional.length === 0) {
  console.error(`
用法：node tools/add-photos.mjs "<照片所在目录>" [--move] [--clean] [--start N]

  --move   导入后删除源文件（默认是复制，源文件保留）
  --clean  先清空 photos/ 里已有的图片
  --start  指定起始序号（默认接着现有最大序号往后排）
`);
  process.exit(1);
}

const srcDir = resolve(positional[0]);

async function ensureDir(p) {
  try { await stat(p); } catch { await mkdir(p, { recursive: true }); }
}

function extOf(name) {
  const e = extname(name).toLowerCase();
  return e === '.jpeg' ? '.jpg' : e;
}

// 自然排序：2.jpg 在 10.jpg 前面
const natural = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

// ---------- 1. 收集源文件 ----------
let srcFiles;
try {
  const entries = await readdir(srcDir, { withFileTypes: true });
  srcFiles = entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort(natural);
} catch (err) {
  console.error(`无法读取目录：${srcDir}\n  ${err.message}`);
  process.exit(1);
}

if (srcFiles.length === 0) {
  console.error(`目录里没有图片（支持 ${[...IMAGE_EXT].join(' ')}）：${srcDir}`);
  process.exit(1);
}

await ensureDir(PHOTO_DIR);

// ---------- 2. 可选：清空旧图 ----------
if (doClean) {
  const existing = (await readdir(PHOTO_DIR)).filter((n) => IMAGE_EXT.has(extname(n).toLowerCase()));
  for (const n of existing) await unlink(join(PHOTO_DIR, n));
  console.log(`已清空 photos/ 里 ${existing.length} 张旧图`);
}

// ---------- 3. 计算起始序号 ----------
async function maxExistingIndex() {
  const names = await readdir(PHOTO_DIR);
  let max = 0;
  for (const n of names) {
    const m = /^(\d+)\.[a-z]+$/i.exec(n);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}
let idx = startIdx ?? (await maxExistingIndex()) + 1;

// ---------- 4. 导入 ----------
const imported = [];
for (const name of srcFiles) {
  const ext = extOf(name);
  // 目标序号不能被占用（清空过就不会冲突，没清空则继续往后排）
  let target;
  do {
    target = `${idx}${ext}`;
    idx++;
  } while (await stat(join(PHOTO_DIR, target)).then(() => true).catch(() => false));

  const from = join(srcDir, name);
  const to = join(PHOTO_DIR, target);
  if (doMove) await rename(from, to);
  else await copyFile(from, to);

  imported.push({ from: name, to: target });
  console.log(`  ${name}  ->  photos/${target}`);
}

// ---------- 5. 重建 manifest（含目录里原有的所有图片）----------
const all = (await readdir(PHOTO_DIR))
  .filter((n) => IMAGE_EXT.has(extname(n).toLowerCase()))
  .sort(natural);

await writeFile(MANIFEST, JSON.stringify({ photos: all }, null, 2) + '\n', 'utf8');

console.log(`
完成：本次导入 ${imported.length} 张，photos/ 现有 ${all.length} 张。
已更新 photos/manifest.json：${all.slice(0, 8).join(', ')}${all.length > 8 ? ' …' : ''}
${startIdx && startIdx > 1 ? '\n注意：序号不是从 1 开始，所以“序号探测”这条兜底逻辑会失效；\n      因为已生成 manifest.json，页面仍能正常读取（别删这个文件即可）。\n' : ''}
下一步：
  · 本地预览：python -m http.server 8901（然后在浏览器打开 http://localhost:8901）
  · 部署：把 photos/ 整个目录一起传到托管平台（不要只传 index.html）
`);
