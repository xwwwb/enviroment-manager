import { defaultConfig, parseConfig, serializeConfig, type Config } from './config';
import { atomicWrite, dataPath, readOptional } from './files';

// 只负责存储介质差异。读取或解析失败必须向上传递，不能用默认配置覆盖坏文件。
export async function loadConfig(): Promise<Config> {
  const raw = await readOptional(await dataPath('config.json'));
  return raw === null ? defaultConfig() : parseConfig(raw);
}
export async function saveConfig(config: Config) {
  const raw = serializeConfig(config, true);
  await atomicWrite(await dataPath('config.json'), raw);
}
