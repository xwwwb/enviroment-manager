// 生成器输入是独立协议，不依赖用户配置版本、存储、Pinia 或 Tauri。
export interface ShellVariable {
  key: string;
  value: string;
  description: string;
  enabled: boolean;
  addToPath: boolean;
}
export interface ShellBlock {
  name: string;
  kind: 'env' | 'shell';
  enabled: boolean;
  variables: ShellVariable[];
  script: string;
  shell: string;
}
export interface Issue {
  level: 'error' | 'warning';
  block: string;
  message: string;
}
export interface PathEntry {
  block: string;
  value: string;
}
export interface ShellGenerator {
  id: string;
  label: string;
  extension: string;
  validate(blocks: ShellBlock[]): Issue[];
  generate(blocks: ShellBlock[]): string;
  paths(blocks: ShellBlock[]): PathEntry[];
  integrate(content: string, profilePath: string, remove?: boolean): string;
  isIntegrated(content: string): boolean;
  resolvePath(value: string, variables: Record<string, string>): string | null;
}
