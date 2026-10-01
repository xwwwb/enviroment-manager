<script setup lang="ts">
import type { DeepReadonly } from 'vue';
import { Plus, CopyDocument, Delete, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import type { ScriptBlock } from '../services/config';
import HighlightedTextarea from './HighlightedTextarea.vue';

// 子组件只发出编辑意图，不修改 props 或持有配置副本。
defineProps<{
  scripts: readonly DeepReadonly<ScriptBlock>[];
}>();
const emit = defineEmits<{
  add: [];
  update: [id: string, patch: Partial<Omit<ScriptBlock, 'id'>>];
  remove: [id: string];
  duplicate: [id: string];
  move: [id: string, offset: number];
}>();
</script>

<template>
  <section class="shell-blocks">
    <div class="section-heading">
      <div>
        <h3>
          Shell 子块
          <span>{{ scripts.length }}</span>
        </h3>
        <p>按顺序执行已启用的脚本；本应用管理的 PATH 会在 Profile 末尾追加。</p>
      </div>
      <el-button :icon="Plus" plain @click="emit('add')">添加 Shell 子块</el-button>
    </div>
    <p v-if="!scripts.length" class="empty-hint">可添加函数、别名或工具初始化脚本。</p>
    <article v-for="(script, index) in scripts" :key="script.id" class="shell-card">
      <div class="script-toolbar">
        <div class="script-field script-name">
          <span>名称</span>
          <el-input
            :model-value="script.name"
            @update:model-value="emit('update', script.id, { name: $event })"
            placeholder="Shell 子块名称"
            :aria-label="`Shell 子块 ${index + 1} 名称`"
          />
        </div>
        <div class="script-actions">
          <span>启用</span>
          <el-switch
            :model-value="script.enabled"
            @update:model-value="emit('update', script.id, { enabled: Boolean($event) })"
            :aria-label="`启用 Shell 子块 ${index + 1}`"
          />
          <el-button
            :icon="ArrowUp"
            text
            circle
            :disabled="index === 0"
            title="上移"
            aria-label="上移 Shell 子块"
            @click="emit('move', script.id, -1)"
          />
          <el-button
            :icon="ArrowDown"
            text
            circle
            :disabled="index === scripts.length - 1"
            title="下移"
            aria-label="下移 Shell 子块"
            @click="emit('move', script.id, 1)"
          />
          <el-button
            :icon="CopyDocument"
            text
            circle
            title="复制"
            aria-label="复制 Shell 子块"
            @click="emit('duplicate', script.id)"
          />
          <el-button
            :icon="Delete"
            text
            circle
            title="删除"
            aria-label="删除 Shell 子块"
            @click="emit('remove', script.id)"
          />
        </div>
      </div>
      <div class="script-field">
        <span>脚本</span>
        <HighlightedTextarea
          :model-value="script.script"
          @update:model-value="emit('update', script.id, { script: $event })"
          placeholder="alias ll='ls -alF'"
          :label="`Shell 子块 ${index + 1} 脚本`"
        />
      </div>
    </article>
  </section>
</template>

<style scoped>
.shell-blocks {
  padding: 20px 22px 24px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h3 {
  margin: 0;
  font-size: 13px;
  color: #35415b;
}
h3 span {
  margin-left: 6px;
  color: #8f9ab0;
}
p {
  margin-top: 7px;
  color: #8f9ab0;
  font-size: 11px;
  line-height: 1.7;
}
.empty-hint {
  margin-top: 18px;
}
.shell-card {
  padding: 18px 0;
  &:first-of-type {
    margin-top: 16px;
  }
}
.shell-card + .shell-card {
  border-top: 1px solid #edf0f6;
}
.script-toolbar {
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.script-name {
  flex: 1;
  min-width: 180px;
}
.script-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  font-size: 11px;
  color: #687590;
  & :deep(.el-input__wrapper) {
    min-height: 36px;
    border-radius: 8px;
  }
  & :deep(.el-input__inner) {
    font-size: 12px;
  }
}
.script-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #687590;
  font-size: 11px;
  & :deep(.el-switch) {
    margin-right: 5px;
  }
  & :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
</style>
