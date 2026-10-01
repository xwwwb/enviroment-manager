<script setup lang="ts">
import { computed, onUpdated, ref } from 'vue';
import { highlightShell, readCodeInput, syncCodeScroll } from '../services/syntax';

const props = defineProps<{
  modelValue: string;
  label: string;
  placeholder?: string;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
const input = ref<HTMLTextAreaElement | null>(null);
const highlight = ref<HTMLElement | null>(null);
const code = computed(() => `${highlightShell(props.modelValue)}&#8203;`);

function update(event: Event) {
  emit('update:modelValue', readCodeInput(event));
}
function scroll() {
  syncCodeScroll(input.value, highlight.value);
}
onUpdated(scroll);
</script>

<template>
  <div class="code-editor">
    <pre ref="highlight" class="code-highlight hljs" aria-hidden="true"><code v-html="code"></code></pre>
    <textarea
      ref="input"
      :value="modelValue"
      :aria-label="label"
      :placeholder="placeholder"
      rows="6"
      wrap="off"
      spellcheck="false"
      class="code-input"
      @input="update"
      @scroll="scroll"
      @pointerup="scroll"
    />
  </div>
</template>

<style scoped>
.code-editor {
  position: relative;
  min-width: 0;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  &:focus-within {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary) inset;
  }
}
.code-highlight,
.code-input {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: 0;
  outline: 0;
  overflow: auto;
  white-space: pre;
  font:
    12px/1.8 'SFMono-Regular',
    Consolas,
    'Liberation Mono',
    monospace;
  letter-spacing: normal;
  tab-size: 2;
}
.code-highlight {
  position: absolute;
  inset: 0;
  height: 100%;
  pointer-events: none;
  background: transparent;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.code-input {
  position: relative;
  display: block;
  min-height: 154px;
  resize: vertical;
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: #35415b;
  &::placeholder {
    color: #a1abbd;
    -webkit-text-fill-color: #a1abbd;
  }
  &::selection {
    background: #cbd1f680;
  }
}
</style>
