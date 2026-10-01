import { appName } from '../consts';
import { appDataDir, homeDir, dirname, join, normalize } from '@tauri-apps/api/path';
import { exists, mkdir, readTextFile, writeTextFile, rename, remove, lstat } from '@tauri-apps/plugin-fs';

export const getHome = () => homeDir();
export async function dataPath(filename: string) {
  return join(await appDataDir(), filename);
}
// 统一处理用户路径的 ~ 展开与归一化，后续比较和写入始终使用同一种路径。
export async function resolveUserPath(input: string): Promise<string> {
  if (!input.trim() || /[\0\r\n]/.test(input)) {
    throw new Error('请输入有效的绝对路径或 ~/ 路径');
  }
  const home = (await homeDir()).replace(/\/$/, '');
  const value = input === '~' ? home : input.startsWith('~/') ? `${home}/${input.slice(2)}` : input;
  if (!value.startsWith('/')) {
    throw new Error('路径必须以 / 或 ~/ 开头');
  }
  return normalize(value);
}
export async function readOptional(path: string): Promise<string | null> {
  return (await exists(path)) ? readTextFile(path) : null;
}
// 同目录临时文件 + rename，避免进程退出留下半份配置；失败后清理临时文件。
export async function atomicWrite(path: string, content: string) {
  const info = (await exists(path)) ? await lstat(path) : null;
  if (info?.isSymlink) {
    throw new Error(`${path} 是符号链接，请改用其真实文件路径`);
  }
  if (info && !info.isFile) {
    throw new Error(`${path} 不是普通文件`);
  }
  await mkdir(await dirname(path), { recursive: true });
  const temporary = `${path}.${appName}-${crypto.randomUUID()}.tmp`;
  try {
    await writeTextFile(temporary, content, {
      createNew: true,
      mode: info?.mode !== null && info?.mode !== undefined ? info.mode & 0o777 : 0o600,
    });
    await rename(temporary, path);
  } catch (error) {
    if (await exists(temporary).catch(() => false)) {
      await remove(temporary).catch(() => {});
    }
    throw error;
  }
}
export { remove };
