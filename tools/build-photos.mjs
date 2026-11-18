#!/usr/bin/env node
/**
 * 扫描 photos/ 目录，生成 photos/manifest.json
 *
 * 用法（在项目根目录执行）：
 *   node tools/build-photos.mjs
 *
 * 用途：照片不需要改名成 1.jpg / 2.jpg，只要放进 photos/ 跑一次这个脚本，
 *       页面就会按文件名顺序（数字自然排序）加载它们。
 */
import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PHOTO_DIR = join(ROOT, 'photos');
const MANIFEST = join(PHOTO_DIR, 'manifest.json');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

const entries = await readdir(PHOTO_DIR, { withFileTypes: true });
const photos = entries
  .filter((e) => e.isFile() && EXT.has(e.name.slice(e.name.lastIndexOf('.')).toLowerCase()))
  // 自然排序：2.jpg 排在 10.jpg 前面
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }));

await writeFile(MANIFEST, JSON.stringify({ photos }, null, 2) + '\n', 'utf8');

if (photos.length === 0) {
  console.log('photos/ 下没有图片，已写入空 manifest。');
} else {
  console.log(`已写入 ${photos.length} 张照片到 photos/manifest.json：`);
  photos.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
}
