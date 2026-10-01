import { parseConfig, serializeConfig, type Config } from './config';
import { configFilename } from './identity';

const gistTokenPlaceholder = '__GITHUB_TOKEN_NOT_BACKED_UP__';

function gistPath(id: string) {
  if (!/^[a-f0-9]+$/i.test(id)) {
    throw new Error('请输入有效的 Gist ID（不是完整网址）');
  }
  return `https://api.github.com/gists/${id}`;
}
async function request(url: string, token: string, init?: RequestInit) {
  if (!token.trim()) {
    throw new Error('请先输入 GitHub Token');
  }
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub 请求失败（${response.status}），请检查 Token 权限与 Gist ID`);
  }
  return response.json();
}
export async function backupGist(config: Config, token: string): Promise<string> {
  const id = config.settings.gistId.trim();
  // Gist 文件保留完整配置结构，但凭证字段只写占位符。
  const content = serializeConfig(
    { ...config, settings: { ...config.settings, gistToken: gistTokenPlaceholder } },
    true,
  );
  const data = await request(id ? gistPath(id) : 'https://api.github.com/gists', token, {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify({
      description: '环境变量管理器配置备份',
      ...(id ? {} : { public: false }),
      files: { [configFilename]: { content } },
    }),
  });
  if (typeof data.id !== 'string') {
    throw new Error('GitHub 返回了无效的 Gist');
  }
  return data.id;
}
export async function restoreGist(id: string, token: string): Promise<Config> {
  const data = await request(gistPath(id.trim()), token);
  const file = data.files?.[configFilename];
  if (!file || file.truncated || typeof file.content !== 'string') {
    throw new Error('Gist 缺少完整的 环境变量管理器 配置文件');
  }
  const config = parseConfig(file.content);
  config.settings.gistId = id.trim();
  // 恢复时沿用当前设备用于读取 Gist 的 Token，旧备份中的凭证也不会覆盖它。
  config.settings.gistToken = token;
  return config;
}
