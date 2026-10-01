import { newBlock, newId, newScript, type Block, type Shell } from './config';

export interface Preset {
  name: string;
  description: string;
  icon: string;
  values: [string, string, string, boolean][];
  scripts?: { name: string; script: string; shell: Shell }[];
}

export const presets: Preset[] = [];

export function fromPreset(preset: Preset): Block {
  return {
    ...newBlock(),
    name: preset.name,
    scripts: (preset.scripts ?? []).map((script) => ({ ...newScript(), ...script })),
    variables: preset.values.map(([key, value, description, addToPath]) => ({
      id: newId(),
      key,
      value,
      description,
      addToPath,
      enabled: true,
    })),
  };
}
