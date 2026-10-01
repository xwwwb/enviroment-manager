import { parseConfig, serializeConfig, type Config } from './config';
import { atomicWrite, dataPath, readOptional, resolveUserPath } from './files';

export interface ConfigExport {
  path: string;
  before: string | null;
  content: string;
}

// 保留文件输入元素在页面的生命周期中，DOM 交互和文件读取由 service 负责。
export function openConfigFilePicker(input: HTMLInputElement | undefined) {
  input?.click();
}

export async function readConfigFile(event: Event): Promise<Config | null> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return null;
  }
  if (file.size > 5_000_000) {
    throw new Error('配置文件不能超过 5 MB');
  }
  return parseConfig(await file.text());
}

// 在确认覆盖前固定导出内容；等待确认期间的编辑不改变本次导出。
export async function prepareConfigExport(config: Config, input: string): Promise<ConfigExport> {
  const content = serializeConfig(config, true);
  const path = await resolveUserPath(input);
  if (path === (await dataPath('config.json'))) {
    throw new Error('导出路径不能覆盖应用自身的配置文件');
  }
  return { path, content, before: await readOptional(path) };
}

export async function writeConfigExport(plan: ConfigExport) {
  if ((await readOptional(plan.path)) !== plan.before) {
    throw new Error('导出目标已被修改，请重新导出并确认覆盖');
  }
  await atomicWrite(plan.path, plan.content);
}
