<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus, CopyDocument, Delete, ArrowUp, ArrowDown, Rank, MagicStick, MoreFilled } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import { useConfigStore } from '../pinia/config';
import { useTask } from '../services/tasks';
import type { Preset } from '../services/presets';
import { useBlockDrag } from '../services/block-drag';
import ShellBlocksEditor from '../components/ShellBlocksEditor.vue';
import PageHeading from '../components/PageHeading.vue';
import VariablesEditor from '../components/VariablesEditor.vue';
import PresetDialog from '../components/PresetDialog.vue';

const store = useConfigStore();
const { perform } = useTask();
// 页面只保留选择、搜索、弹窗和拖拽状态；所有配置编辑都通过 store action。
const presetOpen = ref(false);
const query = ref('');
const requestedId = ref('');
const selected = computed(
  () => store.config.blocks.find((block) => block.id === requestedId.value) ?? store.config.blocks[0],
);
const selectedId = computed({
  get: () => selected.value?.id ?? '',
  set: (id: string) => {
    requestedId.value = id;
  },
});
const blocks = computed(() =>
  store.config.blocks.filter((block) => block.name.toLowerCase().includes(query.value.toLowerCase())),
);
const { dragging, blockItems, draggedBlock, listEntries, dragStyle, dragSize, prepareDrag, cancelDrag } = useBlockDrag({
  allBlocks: () => store.config.blocks,
  visibleBlocks: () => blocks.value,
  select: (id) => {
    selectedId.value = id;
  },
  move: store.move,
});
function addBlock() {
  selectedId.value = store.add();
}
function addPreset(preset: Preset) {
  selectedId.value = store.add(preset);
  presetOpen.value = false;
}
function duplicateBlock() {
  if (selected.value) {
    selectedId.value = store.duplicate(selected.value.id);
  }
}
function removeBlock() {
  const block = selected.value;
  if (!block) {
    return;
  }
  void perform(async () => {
    await ElMessageBox.confirm(`删除“${block.name}”及其中的所有变量和 Shell 子块？更改会自动保存。`, '删除环境块', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    const index = store.config.blocks.findIndex((entry) => entry.id === block.id);
    store.deleteBlock(block.id);
    selectedId.value = store.config.blocks[Math.max(0, index - 1)]?.id ?? '';
  });
}
</script>

<template>
  <div class="page-view blocks-page">
    <PageHeading eyebrow="ENVIRONMENT" title="环境变量">
      <p class="environment-summary">
        <span>
          <strong>{{ store.config.blocks.length }}</strong>
          个环境块
        </span>
        <span>
          <strong>{{ store.enabledCount }}</strong>
          个已启用
        </span>
        <span>
          <strong>{{ store.variableCount }}</strong>
          项变量
        </span>
        <span class="shell-label">Bash / Zsh</span>
      </p>
      <template #actions>
        <el-button :icon="MagicStick" @click="presetOpen = true">从预设添加</el-button>
        <el-button type="primary" :icon="Plus" @click="addBlock()">新建环境块</el-button>
      </template>
    </PageHeading>
    <div v-if="!store.config.blocks.length" class="panel welcome-panel">
      <div class="welcome-terminal">&gt;_</div>
      <h2>从你的第一个环境开始</h2>
      <p>可以从预设开始，或创建自己的环境变量块。</p>
      <div class="actions">
        <el-button type="primary" :icon="MagicStick" @click="presetOpen = true">选择一个预设</el-button>
        <el-button @click="addBlock()">创建空白环境块</el-button>
      </div>
      <div class="welcome-steps">
        <span>01 &nbsp; 添加环境</span>
        <span>02 &nbsp; 预览 Profile</span>
        <span>03 &nbsp; 接入 Shell</span>
      </div>
    </div>
    <div v-else class="block-layout">
      <section class="panel block-list">
        <div class="panel-title">
          <h2>
            我的环境块
            <span>{{ store.config.blocks.length }}</span>
          </h2>
          <el-icon><MoreFilled /></el-icon>
        </div>
        <div class="list-search">
          <el-input v-model="query" placeholder="搜索环境块…" clearable aria-label="搜索环境块" />
        </div>
        <div ref="blockItems" class="block-items" :class="{ 'is-dragging': dragging }" @lostpointercapture="cancelDrag">
          <TransitionGroup name="block-shift" tag="div" class="block-sort-list">
            <div
              v-for="entry in listEntries"
              :key="entry.key"
              :data-block-id="entry.block?.id"
              :class="
                entry.block
                  ? {
                      'block-item': true,
                      selected: selectedId === entry.block.id,
                      disabled: !entry.block.enabled,
                    }
                  : 'block-placeholder'
              "
              :style="entry.block ? undefined : { '--placeholder-height': `${dragSize.height}px` }"
              @pointerdown="entry.block && prepareDrag($event, entry.block)"
            >
              <template v-if="entry.block">
                <button class="block-select" @click="selectedId = entry.block!.id">
                  <el-icon class="drag-handle"><Rank /></el-icon>
                  <span class="block-avatar">
                    {{ entry.block.name.slice(0, 2) }}
                  </span>
                  <span class="block-text">
                    <strong>{{ entry.block.name || '未命名环境' }}</strong>
                    <small>
                      {{ `${entry.block.variables.length} 个变量 · ${entry.block.scripts.length} 个 Shell` }}
                    </small>
                  </span>
                </button>
                <span
                  class="enabled-indicator"
                  :class="{ on: entry.block.enabled }"
                  :title="entry.block.enabled ? '已启用' : '已停用'"
                />
              </template>
              <span v-else>拖到这里</span>
            </div>
          </TransitionGroup>
        </div>
        <p class="list-hint">
          <el-icon><Rank /></el-icon>
          <span>PATH 追加顺序按环境块排列，可拖动调整环境块位置</span>
        </p>
      </section>
      <section v-if="selected" class="panel editor-panel">
        <div class="editor-header">
          <div class="editor-name">
            <span class="type-label">ENVIRONMENT BLOCK</span>
            <el-input
              :model-value="selected.name"
              @update:model-value="store.updateBlock(selected.id, { name: $event })"
              aria-label="块名称"
              placeholder="环境块名称"
              class="name-input"
            />
          </div>
          <div class="actions editor-actions">
            <span class="muted small">{{ selected.enabled ? '已启用' : '已停用' }}</span>
            <el-switch
              :model-value="selected.enabled"
              @update:model-value="store.updateBlock(selected.id, { enabled: Boolean($event) })"
              aria-label="启用环境块"
            />
            <el-divider direction="vertical" />
            <el-button
              :icon="ArrowUp"
              text
              circle
              aria-label="上移环境块"
              :disabled="store.config.blocks[0]?.id === selected.id"
              @click="store.move(selected.id, store.config.blocks.findIndex((b) => b.id === selectedId) - 1)"
            />
            <el-button
              :icon="ArrowDown"
              text
              circle
              aria-label="下移环境块"
              :disabled="store.config.blocks.at(-1)?.id === selected.id"
              @click="store.move(selected.id, store.config.blocks.findIndex((b) => b.id === selectedId) + 1)"
            />
            <el-button
              :icon="CopyDocument"
              text
              circle
              title="复制环境块"
              aria-label="复制环境块"
              @click="duplicateBlock()"
            />
            <el-button :icon="Delete" text circle title="删除环境块" aria-label="删除环境块" @click="removeBlock" />
          </div>
        </div>
        <div :key="selected.id" class="editor-content">
          <VariablesEditor
            :variables="selected.variables"
            @add="store.addVariable(selected.id)"
            @update="(id, patch) => store.updateVariable(selected!.id, id, patch)"
            @remove="(id) => store.deleteVariable(selected!.id, id)"
          />
          <ShellBlocksEditor
            :scripts="selected.scripts"
            @add="store.addScript(selected.id)"
            @update="(id, patch) => store.updateScript(selected!.id, id, patch)"
            @remove="(id) => store.deleteScript(selected!.id, id)"
            @duplicate="(id) => store.duplicateScript(selected!.id, id)"
            @move="(id, offset) => store.moveScript(selected!.id, id, offset)"
          />
        </div>
        <div class="editor-footnote">
          <span class="footnote-icon">i</span>
          <span>配置自动保存。生成 Profile 后，新开启的终端会加载已接入的环境。</span>
          <RouterLink to="/preview">预览生成结果 →</RouterLink>
        </div>
      </section>
    </div>
    <PresetDialog v-model="presetOpen" @select="addPreset" />
    <Teleport to="body">
      <div v-if="draggedBlock" class="block-item drag-preview" :style="dragStyle" aria-hidden="true">
        <div class="block-select">
          <el-icon class="drag-handle"><Rank /></el-icon>
          <span class="block-avatar">
            {{ draggedBlock.name.slice(0, 2) }}
          </span>
          <span class="block-text">
            <strong>{{ draggedBlock.name || '未命名环境' }}</strong>
            <small>
              {{ `${draggedBlock.variables.length} 个变量 · ${draggedBlock.scripts.length} 个 Shell` }}
            </small>
          </span>
        </div>
        <span class="enabled-indicator" :class="{ on: draggedBlock.enabled }" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.environment-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  & > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  & > span + span::before {
    content: '';
    width: 3px;
    height: 3px;
    margin-right: 8px;
    border-radius: 50%;
    background: #c1c8d7;
  }
  & strong {
    color: #566078;
    font-weight: 600;
  }
  & .shell-label {
    color: #7884a5;
    font-size: 10px;
  }
}
.block-layout {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 21px;
  flex: 1;
  min-height: 0;
}
.block-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  & .panel-title,
  & .list-search {
    flex-shrink: 0;
  }
}
.list-search {
  padding: 0 15px 17px;
  & :deep(.el-input__wrapper) {
    background: #f8f9fc;
    box-shadow: none;
  }
}
.block-items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 9px;
  &.is-dragging {
    cursor: grabbing;
  }
}
.block-sort-list {
  position: relative;
  min-height: 100%;
}
.block-item {
  display: flex;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 7px;
  margin-bottom: 6px;
  padding-right: 12px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  &.selected {
    background: #f0f3fe;
    border-color: #e1e7fc;
  }
  &:hover {
    background: #f5f7fc;
  }
  &.disabled .block-text {
    opacity: 0.6;
  }
}
.block-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--placeholder-height);
  margin-bottom: 6px;
  border: 2px dashed #8d9bea;
  border-radius: 7px;
  background: #f5f7ff;
  color: #7a88cd;
  font-size: 11px;
}
.block-shift-move {
  transition: transform 180ms ease;
}
.block-shift-enter-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.block-shift-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  transition: opacity 100ms ease;
  pointer-events: none;
}
.block-shift-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
.block-shift-leave-to {
  opacity: 0;
}
.drag-preview {
  position: fixed;
  z-index: 2000;
  margin: 0;
  border-color: #b5c0f4;
  background: #fff;
  box-shadow: 0 8px 24px #34477726;
  transform: rotate(-1deg);
  pointer-events: none;
}
.block-select {
  background: none;
  border: 0;
  padding: 12px 5px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: inherit;
  min-width: 0;
  text-align: left;
  flex: 1;
}
.drag-handle {
  color: #c7cede;
  font-size: 12px;
}
.block-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e6eff8;
  color: #6088aa;
  font-weight: 600;
  font-size: 11px;
  flex-shrink: 0;
  &.script {
    background: #f0eafa;
    color: #9480b4;
  }
}
.block-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  & strong {
    font-size: 12px;
    font-weight: 550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  & small {
    font-size: 10px;
    color: #98a3b8;
  }
}
.enabled-indicator {
  height: 6px;
  width: 6px;
  flex-shrink: 0;
  background: #ccd1dc;
  border-radius: 50%;
  &.on {
    background: #71b397;
  }
}
.list-hint {
  flex-shrink: 0;
  font-size: 10px;
  color: #a1abbd;
  padding: 17px 19px;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  line-height: 1.8;
  border-top: 1px solid #f0f2f7;
  & :deep(.el-icon) {
    flex-shrink: 0;
    margin-top: 3px;
  }
}
.editor-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-radius: 14px;
  box-shadow: 0 8px 28px #26375508;
}
.editor-header {
  flex-shrink: 0;
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  border-bottom: 1px solid #edf0f6;
  & :deep(.el-divider--vertical) {
    margin: 0 1px;
    height: 22px;
  }
}
.editor-name {
  min-width: 220px;
  flex: 1;
}
.type-label {
  display: block;
  font-size: 9px;
  color: #8e99b0;
  font-weight: 600;
  letter-spacing: 1.3px;
}
.name-input {
  margin-top: 9px;
  max-width: 360px;
  display: block;
  & :deep(.el-input__wrapper) {
    min-height: 38px;
    border-radius: 8px;
  }
  & :deep(input) {
    font-size: 14px;
    font-weight: 600;
    color: #35415b;
  }
}
.editor-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
}
.editor-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.editor-footnote {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 9px;
  padding: 10px 22px;
  border-top: 1px solid #edf0f6;
  font-size: 10px;
  color: #98a3b8;
  line-height: 1.8;
  & a {
    margin-left: auto;
    white-space: nowrap;
  }
}
.footnote-icon {
  border: 1px solid #a9b4c8;
  border-radius: 50%;
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  flex: none;
}
.welcome-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 38px;
  & h2 {
    font-size: 19px;
  }
  & p {
    color: #929cb0;
    font-size: 12px;
    margin: 12px 0 23px;
  }
}
.welcome-terminal {
  width: 62px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #edf0ff;
  color: #6677db;
  border-radius: 16px;
  font: 600 25px monospace;
  margin-bottom: 18px;
}
.welcome-steps {
  display: flex;
  gap: 33px;
  font-size: 10px;
  color: #a1abbd;
  margin-top: 30px;
}
</style>
