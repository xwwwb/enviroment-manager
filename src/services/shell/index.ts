import { posixGenerator } from './posix';
import type { ShellGenerator } from './types';

export const generators: readonly ShellGenerator[] = [posixGenerator];
export function getGenerator(id: string): ShellGenerator {
  const generator = generators.find((entry) => entry.id === id);
  if (!generator) {
    throw new Error(`不支持的 Shell 生成器：${id}`);
  }
  return generator;
}
