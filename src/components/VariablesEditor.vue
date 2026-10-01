<script setup lang="ts">
import type { DeepReadonly } from 'vue';
import { Delete, Plus } from '@element-plus/icons-vue';
import type { Variable } from '../services/config';

defineProps<{
  variables: readonly DeepReadonly<Variable>[];
}>();
const emit = defineEmits<{
  add: [];
  update: [id: string, patch: Partial<Omit<Variable, 'id'>>];
  remove: [id: string];
}>();
</script>

<template>
  <section class="variables-editor">
    <div class="section-heading">
      <div>
        <h3>
          环境变量
          <span>{{ variables.length }}</span>
        </h3>
        <p>Key 必填；勾选 PATH 可同时将变量值加入命令搜索路径。支持 ${HOME} 和 ${其他变量的key}。</p>
      </div>
      <el-button :icon="Plus" plain @click="emit('add')">添加变量</el-button>
    </div>
    <div v-if="variables.length" class="variable-heading">
      <span>Key</span>
      <span>Value</span>
      <span>描述</span>
      <span>PATH</span>
      <span>启用</span>
      <span />
    </div>
    <div v-for="(variable, index) in variables" :key="variable.id" class="variable-row">
      <el-input
        :model-value="variable.key"
        @update:model-value="emit('update', variable.id, { key: $event })"
        placeholder="KEY"
        :aria-label="`变量 ${index + 1} Key`"
        :aria-invalid="!variable.key.trim() || variable.key === 'HOME'"
        :class="{ 'invalid-key': !variable.key.trim() || variable.key === 'HOME', inactive: !variable.enabled }"
        class="mono variable-input"
      />
      <el-input
        :model-value="variable.value"
        @update:model-value="emit('update', variable.id, { value: $event })"
        placeholder="${HOME}/example"
        :aria-label="`变量 ${index + 1} Value`"
        :class="{ inactive: !variable.enabled }"
        class="mono variable-input"
      />
      <el-input
        :model-value="variable.description"
        @update:model-value="emit('update', variable.id, { description: $event })"
        placeholder="用途说明"
        :aria-label="`变量 ${index + 1} 说明`"
        :class="{ inactive: !variable.enabled }"
        class="variable-input"
      />
      <el-checkbox
        :model-value="variable.addToPath"
        @update:model-value="emit('update', variable.id, { addToPath: Boolean($event) })"
        :aria-label="`变量 ${index + 1} 加入 PATH`"
      />
      <el-switch
        :model-value="variable.enabled"
        @update:model-value="emit('update', variable.id, { enabled: Boolean($event) })"
        :aria-label="`变量 ${index + 1} 启用`"
        size="small"
      />
      <el-button
        :icon="Delete"
        text
        circle
        :aria-label="`删除变量 ${index + 1}`"
        @click="emit('remove', variable.id)"
      />
    </div>
  </section>
</template>

<style scoped>
.variables-editor {
  padding: 20px 22px 12px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  & > div {
    min-width: 0;
  }
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
.variable-heading,
.variable-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.45fr) minmax(0, 1fr) 50px 38px 28px;
  align-items: center;
  gap: 10px;
}
.variable-heading {
  padding: 19px 0 6px;
  font-size: 10px;
  color: #8f9ab0;
  & span:nth-child(n + 4) {
    text-align: center;
  }
}
.variable-row {
  padding: 9px 0;
}
.variable-row + .variable-row {
  border-top: 1px solid #edf0f6;
}
.variable-input {
  min-width: 0;
  &.inactive {
    opacity: 0.5;
  }
  & :deep(.el-input__wrapper) {
    min-height: 36px;
    border-radius: 8px;
  }
  & :deep(.el-input__inner) {
    font-size: 12px;
  }
  &.invalid-key :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
  }
}
.variable-row > :deep(.el-checkbox),
.variable-row > :deep(.el-switch),
.variable-row > :deep(.el-button) {
  justify-self: center;
}
</style>
