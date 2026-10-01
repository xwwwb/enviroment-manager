import { appName } from '../consts';
import type { DeepReadonly } from 'vue';

export type Shell = string;
export const shellRcFiles = ['~/.zshrc', '~/.bashrc', '~/.bash_profile', '~/.profile'] as const;
export type ShellRcFile = (typeof shellRcFiles)[number];
export function isShellRcFile(value: string): value is ShellRcFile {
  return shellRcFiles.some((path) => path === value);
}
export interface Variable {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
  addToPath: boolean;
}
export interface ScriptBlock {
  id: string;
  name: string;
  enabled: boolean;
  script: string;
  shell: Shell;
}
export interface Block {
  id: string;
  name: string;
  enabled: boolean;
  variables: Variable[];
  scripts: ScriptBlock[];
}
export interface Config {
  version: 2;
  blocks: Block[];
  settings: {
    profilePath: string;
    generator: string;
    rcFiles: ShellRcFile[];
    gistId: string;
    gistToken: string;
  };
}

export const newId = () => crypto.randomUUID();
export const newVariable = (): Variable => ({
  id: newId(),
  key: '',
  value: '',
  description: '',
  enabled: true,
  addToPath: false,
});
export const newScript = (): ScriptBlock => ({
  id: newId(),
  name: '自定义 Shell',
  enabled: true,
  script: '',
  shell: 'both',
});
export const newBlock = (): Block => ({
  id: newId(),
  name: '未命名环境',
  enabled: true,
  variables: [newVariable()],
  scripts: [],
});
export const defaultConfig = (): Config => ({
  version: 2,
  blocks: [],
  settings: {
    profilePath: `~/.config/${appName}/profile.sh`,
    generator: 'bash-zsh',
    rcFiles: ['~/.zshrc'],
    gistId: '',
    gistToken: '',
  },
});

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length > 1_000_000) {
    throw new Error(`${label} 必须是字符串`);
  }
  return value;
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} 必须是布尔值`);
  }
  return value;
}

// 只接收已知字段，导入文件和远端备份共用同一校验入口。
export function parseConfig(raw: string): Config {
  if (raw.length > 5_000_000) {
    throw new Error('配置文件不能超过 5 MB');
  }
  const data: unknown = JSON.parse(raw);
  if (
    !record(data) ||
    (data.version !== 1 && data.version !== 2) ||
    !Array.isArray(data.blocks) ||
    !record(data.settings)
  ) {
    throw new Error('不是受支持的 环境变量管理器配置文件');
  }
  const ids = new Set<string>();
  const id = (value: unknown) => {
    const result = string(value, 'ID');
    if (!result || ids.has(result)) {
      throw new Error('配置中存在空 ID 或重复 ID');
    }
    ids.add(result);
    return result;
  };
  const blocks: Block[] = data.blocks.map((b: unknown) => {
    if (!record(b) || !Array.isArray(b.variables)) {
      throw new Error('环境块格式错误');
    }
    let scripts: unknown = b.scripts;
    if (data.version === 1) {
      if (!['env', 'shell'].includes(String(b.kind)) || typeof b.shell !== 'string' || !b.shell) {
        throw new Error('旧版环境块格式错误');
      }
      const script = string(b.script, '脚本');
      // 旧版独立脚本保留原有顺序，迁入同名环境块的子块。
      scripts = b.kind === 'shell' ? [{ id: newId(), name: b.name, enabled: true, shell: b.shell, script }] : [];
    }
    if (!Array.isArray(scripts)) {
      throw new Error('Shell 子块列表格式错误');
    }
    return {
      id: id(b.id),
      name: string(b.name, '块名称'),
      enabled: boolean(b.enabled, '块开关'),
      scripts: scripts.map((s: unknown) => {
        if (!record(s) || typeof s.shell !== 'string' || !s.shell) {
          throw new Error('Shell 子块格式错误');
        }
        return {
          id: id(s.id),
          name: string(s.name, 'Shell 子块名称'),
          enabled: boolean(s.enabled, 'Shell 子块开关'),
          shell: s.shell,
          script: string(s.script, 'Shell 脚本'),
        };
      }),
      variables: b.variables.map((v: unknown) => {
        if (!record(v)) {
          throw new Error('变量格式错误');
        }
        return {
          id: id(v.id),
          key: string(v.key, 'Key'),
          value: string(v.value, 'Value'),
          description: string(v.description, '说明'),
          enabled: boolean(v.enabled, '变量开关'),
          addToPath: boolean(v.addToPath, 'PATH 开关'),
        };
      }),
    };
  });
  const s = data.settings;
  if (!Array.isArray(s.rcFiles) || s.rcFiles.some((p) => typeof p !== 'string')) {
    throw new Error('Shell 配置文件列表错误');
  }
  return {
    version: 2,
    blocks,
    settings: {
      profilePath: string(s.profilePath, 'Profile 路径'),
      generator: string(s.generator, '生成器'),
      rcFiles: [...new Set((s.rcFiles as string[]).filter(isShellRcFile))],
      gistId: string(s.gistId, 'Gist ID'),
      gistToken: s.gistToken === undefined ? '' : string(s.gistToken, 'GitHub Token'),
    },
  };
}

// JSON 是持久化、导入和异步操作的共同边界，快照同时完成结构校验。
export function snapshotConfig(config: DeepReadonly<Config>): Config {
  return parseConfig(JSON.stringify(config));
}

// 所有写出路径使用同一序列化入口，避免导出与本地保存的格式校验不一致。
export function serializeConfig(config: DeepReadonly<Config>, pretty = false): string {
  return JSON.stringify(snapshotConfig(config), null, pretty ? 2 : undefined);
}

// 复制环境时重建整棵子树的 ID；数据数组也必须独立，避免副本修改原块。
export function duplicateBlock(block: DeepReadonly<Block>): Block {
  return {
    ...block,
    id: newId(),
    name: `${block.name} 副本`,
    variables: block.variables.map((variable) => ({ ...variable, id: newId() })),
    scripts: block.scripts.map((script) => ({ ...script, id: newId() })),
  };
}

// 越界移动视为无操作，列表和子块排序共用相同的索引语义。
export function moveItem<T>(items: T[], from: number, to: number): boolean {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) {
    return false;
  }
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item!);
  return true;
}
