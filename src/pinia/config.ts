import { computed, onScopeDispose, readonly, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  defaultConfig,
  parseConfig,
  newBlock,
  newVariable,
  newScript,
  newId,
  duplicateBlock,
  moveItem,
  type Config,
  type Block,
  type Variable,
  type ScriptBlock,
} from '../services/config';
import { fromPreset, type Preset } from '../services/presets';
import { loadConfig, saveConfig } from '../services/repository';
import { backupGist, restoreGist } from '../services/gist';
import { createDebouncer } from '../services/scheduler';
import { createPreview, checkPaths, planProfile, planRc } from '../services/profile-service';

// 配置的唯一可写入口；页面只持有只读配置视图和自己的选中、弹窗、拖拽状态。
export const useConfigStore = defineStore('configuration', () => {
  const config = ref(defaultConfig());
  const saved = ref('');
  const ready = ref(false);
  const loadError = ref('');
  const savedAt = ref('');
  const saving = ref(false);
  const saveError = ref('');
  let disposed = false;
  let initialization: Promise<void> | undefined;
  let writeTask: Promise<void> | undefined;
  let backupTask: Promise<string> | undefined;
  // 整份配置被替换时递增，用于拒绝已过期的远端备份响应。
  let generation = 0;
  const serialized = computed(() => JSON.stringify(config.value));
  const dirty = computed(() => ready.value && !loadError.value && serialized.value !== saved.value);
  const enabledCount = computed(() => config.value.blocks.filter((block) => block.enabled).length);
  const variableCount = computed(() => config.value.blocks.reduce((count, block) => count + block.variables.length, 0));
  const preview = computed(() => createPreview(config.value));
  const autosave = createDebouncer(300, () => {
    void persistNow().catch(() => {}); // 保存失败已进入 saveError，留在界面上供重试。
  });
  onScopeDispose(() => {
    disposed = true;
    autosave.cancel();
  });

  function assertEditable() {
    if (disposed || !ready.value || loadError.value) {
      throw new Error('配置尚未成功加载，已阻止修改和覆盖原始数据');
    }
  }

  // 所有 action 完成修改后统一安排保存，避免深度 watch 对导入、初始化产生误写。
  function commit(change: () => void) {
    assertEditable();
    change();
    saveError.value = '';
    autosave.schedule();
  }

  // 初始化只执行一次；加载完成前不开放编辑，解析失败不会落盘默认数据。
  function initialize(): Promise<void> {
    initialization ??= (async () => {
      try {
        const loaded = await loadConfig();
        if (!disposed) {
          config.value = loaded;
          saved.value = serialized.value;
          loadError.value = '';
        }
      } catch (error) {
        loadError.value = String(error);
      } finally {
        ready.value = true;
      }
    })();
    return initialization;
  }

  // 只允许一条写入链。每轮捕获不可变快照，写完后再检查最新配置：
  // 写入期间产生的新编辑会在下一轮保存，旧结果不会把新编辑标记为已保存。
  // 调用方（备份、生成、关窗）等待的是整条链排空，而不是某一轮写入。
  function persistNow(): Promise<void> {
    autosave.cancel();
    try {
      assertEditable();
    } catch (error) {
      return Promise.reject(error);
    }
    if (writeTask) {
      return writeTask.then(() => (dirty.value ? persistNow() : undefined));
    }
    saving.value = true;
    saveError.value = '';
    writeTask = (async () => {
      try {
        while (serialized.value !== saved.value) {
          const raw = serialized.value;
          const snapshot = parseConfig(raw);
          await saveConfig(snapshot);
          saved.value = raw;
          savedAt.value = new Date().toLocaleTimeString('zh-CN');
        }
      } catch (error) {
        saveError.value = String(error);
        throw error;
      } finally {
        saving.value = false;
      }
    })().finally(() => {
      writeTask = undefined;
    });
    return writeTask.then(() => (dirty.value ? persistNow() : undefined));
  }

  // 异步服务只接收脱离响应式对象的快照，避免 await 前后读到两份配置。
  function snapshot(): Config {
    assertEditable();
    return parseConfig(serialized.value);
  }
  function findBlock(id: string) {
    const block = config.value.blocks.find((entry) => entry.id === id);
    if (!block) {
      throw new Error('环境块已不存在');
    }
    return block;
  }
  function add(preset?: Preset): string {
    const block = preset ? fromPreset(preset) : newBlock();
    commit(() => config.value.blocks.push(block));
    return block.id;
  }
  function duplicate(id: string): string {
    const block = duplicateBlock(findBlock(id));
    commit(() => config.value.blocks.push(block));
    return block.id;
  }
  function updateBlock(id: string, patch: Partial<Pick<Block, 'name' | 'enabled'>>) {
    commit(() => Object.assign(findBlock(id), patch));
  }
  function deleteBlock(id: string) {
    commit(() => {
      config.value.blocks = config.value.blocks.filter((block) => block.id !== id);
    });
  }
  function move(id: string, target: number) {
    commit(() =>
      moveItem(
        config.value.blocks,
        config.value.blocks.findIndex((block) => block.id === id),
        target,
      ),
    );
  }
  function updateSettings(patch: Partial<Config['settings']>) {
    commit(() => {
      Object.assign(config.value.settings, patch);
      if (patch.rcFiles) {
        config.value.settings.rcFiles = [...patch.rcFiles];
      }
    });
  }
  function addVariable(blockId: string) {
    commit(() => findBlock(blockId).variables.push(newVariable()));
  }
  function updateVariable(blockId: string, id: string, patch: Partial<Omit<Variable, 'id'>>) {
    commit(() => {
      const variable = findBlock(blockId).variables.find((entry) => entry.id === id);
      if (variable) {
        Object.assign(variable, patch);
      }
    });
  }
  function deleteVariable(blockId: string, id: string) {
    commit(() => {
      const block = findBlock(blockId);
      block.variables = block.variables.filter((variable) => variable.id !== id);
    });
  }
  function addScript(blockId: string) {
    commit(() => findBlock(blockId).scripts.push(newScript()));
  }
  function updateScript(blockId: string, id: string, patch: Partial<Omit<ScriptBlock, 'id'>>) {
    commit(() => {
      const script = findBlock(blockId).scripts.find((entry) => entry.id === id);
      if (script) {
        Object.assign(script, patch);
      }
    });
  }
  function deleteScript(blockId: string, id: string) {
    commit(() => {
      const block = findBlock(blockId);
      block.scripts = block.scripts.filter((script) => script.id !== id);
    });
  }
  function duplicateScript(blockId: string, id: string) {
    commit(() => {
      const scripts = findBlock(blockId).scripts;
      const index = scripts.findIndex((script) => script.id === id);
      const script = scripts[index];
      if (script) {
        scripts.splice(index + 1, 0, { ...script, id: newId(), name: `${script.name} 副本` });
      }
    });
  }
  function moveScript(blockId: string, id: string, offset: number) {
    commit(() => {
      const scripts = findBlock(blockId).scripts;
      const index = scripts.findIndex((script) => script.id === id);
      moveItem(scripts, index, index + offset);
    });
  }
  async function replace(incoming: Config) {
    const next = parseConfig(JSON.stringify(incoming));
    if (next.blocks.some((block) => block.variables.some((variable) => !variable.key.trim()))) {
      throw new Error('导入配置中存在空 Key');
    }
    // 整份配置一次替换，旧环境块和设置不与导入内容合并。
    commit(() => {
      generation++;
      config.value = next;
    });
    await persistNow();
  }
  function clear() {
    return replace(defaultConfig());
  }

  // Gist ID 只回写到发起备份的配置和账号；请求期间的编辑仍按最新内容保存。
  function backup(): Promise<string> {
    if (backupTask) {
      return backupTask;
    }
    backupTask = (async () => {
      await persistNow();
      const source = snapshot();
      const epoch = generation;
      const id = await backupGist(source, source.settings.gistToken);
      if (
        !disposed &&
        epoch === generation &&
        config.value.settings.gistId === source.settings.gistId &&
        config.value.settings.gistToken === source.settings.gistToken
      ) {
        updateSettings({ gistId: id });
        await persistNow();
      }
      return id;
    })().finally(() => {
      backupTask = undefined;
    });
    return backupTask;
  }
  function readBackup() {
    const { settings } = snapshot();
    return restoreGist(settings.gistId, settings.gistToken);
  }
  async function prepareProfile() {
    await persistNow();
    return [await planProfile(snapshot())];
  }
  async function prepareIntegration() {
    await persistNow();
    return planRc(snapshot());
  }
  async function inspectPaths() {
    assertEditable();
    const input = serialized.value;
    return { input, issues: await checkPaths(parseConfig(input)) };
  }

  return {
    config: readonly(config),
    ready: readonly(ready),
    loadError: readonly(loadError),
    savedAt: readonly(savedAt),
    saving: readonly(saving),
    saveError: readonly(saveError),
    dirty,
    serialized,
    preview,
    enabledCount,
    variableCount,
    initialize,
    persistNow,
    add,
    duplicate,
    updateBlock,
    deleteBlock,
    move,
    updateSettings,
    addVariable,
    updateVariable,
    deleteVariable,
    addScript,
    updateScript,
    deleteScript,
    duplicateScript,
    moveScript,
    replace,
    clear,
    backup,
    readBackup,
    prepareProfile,
    prepareIntegration,
    inspectPaths,
    snapshot,
  };
});
