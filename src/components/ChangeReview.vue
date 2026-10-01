<script setup lang="ts">
import { computed } from 'vue';
import type { Change } from '../services/profile-service';
import { applyChanges } from '../services/profile-service';
import { useTask } from '../services/tasks';
import { highlightShell } from '../services/syntax';

const { busy, perform } = useTask();

const open = defineModel<boolean>({ default: false });
const props = defineProps<{ changes: Change[]; title: string }>();
const changed = computed(() => props.changes.filter((c) => c.before !== c.after));
// 保留共同首尾，仅高亮中间替换区域，避免对整个文件生成昂贵的逐行编辑距离。
function diff(change: Change) {
  const before = change.before?.split('\n') ?? [];
  const after = change.after?.split('\n') ?? [];
  let start = 0,
    end = 0;
  while (start < Math.min(before.length, after.length) && before[start] === after[start]) {
    start++;
  }
  while (
    end < Math.min(before.length, after.length) - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }
  return [
    ...before.slice(0, start).map((text) => ({ text, kind: 'same', sign: ' ' })),
    ...before.slice(start, before.length - end).map((text) => ({ text, kind: 'removed', sign: '−' })),
    ...after.slice(start, after.length - end).map((text) => ({ text, kind: 'added', sign: '+' })),
    ...(end ? after.slice(-end).map((text) => ({ text, kind: 'same', sign: ' ' })) : []),
  ];
}
function apply() {
  void perform(async () => {
    await applyChanges(props.changes);
    open.value = false;
  }, '文件已更新');
}
</script>
<template>
  <el-dialog
    v-model="open"
    :title="title"
    width="85%"
    :close-on-click-modal="!busy"
    :show-close="!busy"
    :close-on-press-escape="!busy"
  >
    <p class="dialog-intro">
      {{ changed.length ? `将修改 ${changed.length} 个文件，请确认以下内容。` : '文件内容一致，无需修改。' }}
    </p>
    <div v-for="change in changes" :key="change.path" class="change-section">
      <div class="change-heading">
        <code>{{ change.path }}</code>
        <el-tag size="small" :type="change.after === null ? 'danger' : 'info'">
          {{ change.after === null ? '删除' : change.before === null ? '新建' : '更新' }}
        </el-tag>
      </div>
      <pre
        class="diff"
      ><span v-for="(line, i) in diff(change)" :key="i" :class="line.kind">{{ line.sign }} <code class="hljs" v-html="highlightShell(line.text)"></code></span></pre>
    </div>
    <template #footer>
      <el-button :disabled="busy" @click="open = false">取消</el-button>
      <el-button type="primary" :loading="busy" :disabled="!changed.length" @click="apply">应用修改</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.change-section {
  border: 1px solid #e6eaf2;
  border-radius: 8px;
  margin-top: 16px;
  overflow: hidden;
}
.change-heading {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  background: #f6f8fc;
  & code {
    font-size: 11px;
    overflow-wrap: anywhere;
  }
}
.diff {
  margin: 0;
  padding: 12px 0;
  max-height: 380px;
  overflow: auto;
  font: 11px/1.9 monospace;
  white-space: pre;
  background: #fcfdff;
  & code.hljs {
    display: inline;
    overflow: visible;
    padding: 0;
    background: transparent;
  }
  & > span {
    display: block;
    padding: 0 15px;
    min-height: 20px;
  }
  & .same {
    color: #8690a5;
  }
  & .added {
    color: #31825d;
    background: #eaf7ee;
  }
  & .removed {
    color: #b45762;
    background: #fff0f1;
  }
}
</style>
