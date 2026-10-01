import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const version = packageJson.version;

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('package.json 中的 version 必须是有效的版本号');
}

function replaceVersion(content, pattern, file) {
  if ([...content.matchAll(pattern)].length !== 1) {
    throw new Error(`${file} 中必须恰好找到一个待同步的版本号`);
  }
  return content.replace(pattern, (_, prefix, _current, suffix) => `${prefix}${version}${suffix}`);
}

const targets = [
  {
    file: 'src-tauri/Cargo.toml',
    pattern: /(^\[package\]\r?\n(?:^(?!\[)[^\n]*\n)*?^version\s*=\s*")([^"\r\n]+)(")/gm,
  },
  {
    file: 'src/App.vue',
    pattern: /(<div class="sidebar-version">\s*<span>[^<]*<\/span>\s*<span>v)([^<\r\n]+)(<\/span>)/g,
  },
  {
    file: 'src-tauri/tauri.conf.json',
    pattern: /(^\s*"version"\s*:\s*")([^"\r\n]+)(")/gm,
  },
];

// 先检查全部目标，再写入，避免字段缺失时只同步了部分文件。
const updates = await Promise.all(
  targets.map(async ({ file, pattern }) => {
    const path = new URL(file, root);
    const current = await readFile(path, 'utf8');
    return { file, path, current, next: replaceVersion(current, pattern, file) };
  }),
);

for (const { file, path, current, next } of updates) {
  if (current !== next) {
    await writeFile(path, next);
    console.log(`${file}: ${version}`);
  }
}

console.log(`版本同步完成：${version}`);
