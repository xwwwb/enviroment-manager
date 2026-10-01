import { isShellRcFile, type Config } from './config';
import { isManagedProfile } from './identity';
import { dataPath, getHome, readOptional, resolveUserPath, atomicWrite, remove } from './files';
import { getGenerator } from './shell';
import type { ShellBlock, Issue, PathEntry } from './shell/types';

// 应用服务显式映射用户模型，生成器无需知道数据持久化结构。
export function generationInput(config: Config): ShellBlock[] {
  return config.blocks.flatMap((b): ShellBlock[] => [
    {
      name: b.name,
      kind: 'env',
      enabled: b.enabled,
      script: '',
      shell: 'both',
      variables: b.variables.map((v) => ({
        key: v.key,
        value: v.value,
        description: v.description,
        enabled: v.enabled,
        addToPath: v.addToPath,
      })),
    },
    ...b.scripts.map((script): ShellBlock => ({
      name: `${b.name} / ${script.name}`,
      kind: 'shell',
      enabled: b.enabled && script.enabled,
      variables: [],
      script: script.script,
      shell: script.shell,
    })),
  ]);
}
export function previewProfile(config: Config) {
  const generator = getGenerator(config.settings.generator);
  return generator.generate(generationInput(config));
}
// 一次映射生成三种预览结果，由 Pinia 缓存；页面不再各自序列化和重复遍历配置。
export function createPreview(config: Config): { issues: Issue[]; profile: string; paths: PathEntry[] } {
  try {
    const generator = getGenerator(config.settings.generator);
    const input = generationInput(config);
    const issues = generator.validate(input);
    return {
      issues,
      profile: issues.some((issue) => issue.level === 'error') ? '# 请先修复配置中的错误。' : generator.generate(input),
      paths: generator.paths(input),
    };
  } catch (error) {
    return {
      issues: [{ level: 'error', block: '生成器', message: String(error) }],
      profile: '# 请先修复配置中的错误。',
      paths: [],
    };
  }
}
export interface Change {
  path: string;
  before: string | null;
  after: string | null;
}

async function profilePath(config: Config) {
  const path = await resolveUserPath(config.settings.profilePath);
  const configPath = await dataPath('config.json');
  const rcFiles = await Promise.all(config.settings.rcFiles.map(resolveUserPath));
  if ([configPath, ...rcFiles].includes(path)) {
    throw new Error('Profile 路径不能覆盖配置数据或 rc 文件');
  }
  return path;
}
// 规划阶段只读文件，生成 before/after 供用户审核，不产生写入。
export async function planProfile(config: Config): Promise<Change> {
  const path = await profilePath(config);
  const before = await readOptional(path);
  if (before && !isManagedProfile(before)) {
    throw new Error('目标文件不是 环境变量管理器 生成的 Profile，请使用另一个路径');
  }
  return { path, before, after: previewProfile(config) };
}
export async function planRc(config: Config, removeIntegration = false): Promise<Change[]> {
  if (config.settings.rcFiles.some((path) => !isShellRcFile(path))) {
    throw new Error('Shell 配置文件仅支持内置选项');
  }
  const generator = getGenerator(config.settings.generator);
  const profile = await profilePath(config);
  const configPath = await dataPath('config.json');
  const changes: Change[] = [];
  for (const input of config.settings.rcFiles) {
    const path = await resolveUserPath(input);
    if (path === configPath) {
      throw new Error('rc 路径不能覆盖应用数据');
    }
    if (changes.some((c) => c.path === path)) {
      continue;
    }
    const before = await readOptional(path);
    changes.push({
      path,
      before,
      after:
        removeIntegration && before === null ? null : generator.integrate(before ?? '', profile, removeIntegration),
    });
  }
  return changes;
}
// 审核后重新比对原文，防止覆盖其他程序在预览期间修改的内容。
export async function applyChanges(changes: Change[]) {
  const changed = changes.filter((c) => c.before !== c.after);
  for (const change of changed) {
    if ((await readOptional(change.path)) !== change.before) {
      throw new Error(`${change.path} 已被其他程序修改，请重新预览`);
    }
  }
  // 多文件操作失败时明确报告已经更新的文件。
  const applied: string[] = [];
  try {
    for (const change of changed) {
      if ((await readOptional(change.path)) !== change.before) {
        throw new Error(`${change.path} 已变化，请重新预览`);
      }
      if (change.after === null) {
        await remove(change.path);
      } else {
        await atomicWrite(change.path, change.after);
      }
      applied.push(change.path);
    }
  } catch (error) {
    throw new Error(`${String(error)}${applied.length ? `。已更新：${applied.join('、')}` : ''}`);
  }
}
// 静态展开变量，不执行用户脚本；只检查 PATH 值的形式，不探测目标目录。
export async function checkPaths(config: Config): Promise<Issue[]> {
  const generator = getGenerator(config.settings.generator);
  const variables: Record<string, string> = Object.assign(Object.create(null), {
    HOME: await getHome(),
  });
  for (const b of config.blocks.filter((b) => b.enabled)) {
    for (const v of b.variables.filter((v) => v.enabled && v.key && v.key !== 'HOME')) {
      const value = generator.resolvePath(v.value, variables);
      if (value !== null) {
        variables[v.key] = value;
      }
    }
  }
  const issues: Issue[] = [];
  for (const entry of generator.paths(generationInput(config))) {
    const path = generator.resolvePath(entry.value, variables);
    let message = '';
    if (path === null) {
      message = `无法静态解析：${entry.value}（依赖外部变量）`;
    } else if (!path.startsWith('/')) {
      message = `PATH 不是绝对路径：${path}`;
    }
    if (message) {
      issues.push({ level: 'warning', block: entry.block, message });
    }
  }
  return issues;
}
