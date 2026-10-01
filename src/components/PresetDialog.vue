<script setup lang="ts">
import { presets, type Preset } from '../services/presets';

defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [preset: Preset];
}>();
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="从预设开始"
    width="650px"
    top="5vh"
    class="preset-dialog"
    :lock-scroll="true"
  >
    <div class="preset-scroll">
      <p v-if="!presets.length" class="dialog-empty">暂无预设，请创建空白环境块或导入 JSON 配置。</p>
      <template v-else>
        <p class="dialog-intro">预设提供常见配置，添加后请根据本机安装位置调整路径。</p>
        <div class="preset-grid">
          <button v-for="preset in presets" :key="preset.name" class="preset-card" @click="emit('select', preset)">
            <span class="preset-icon">{{ preset.icon }}</span>
            <strong>{{ preset.name }}</strong>
            <small>{{ preset.description }}</small>
            <span class="preset-add">+</span>
          </button>
        </div>
      </template>
    </div>
  </el-dialog>
</template>

<style scoped>
.preset-scroll {
  max-height: calc(90dvh - 100px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 8px;
}
.dialog-empty {
  padding: 32px 0;
  text-align: center;
  color: #959fb3;
  font-size: 12px;
}
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.preset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: #fff;
  border: 1px solid #e4e9f3;
  border-radius: 9px;
  padding: 19px;
  gap: 10px;
  &:hover {
    background: #f7f8ff;
    border-color: #adb9f3;
  }
  & strong {
    font-size: 13px;
    color: #3b4660;
  }
  & small {
    font-size: 11px;
    color: #959fb3;
  }
}
.preset-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #edf1fb;
  color: #6476bc;
  font-family: monospace;
  font-weight: 700;
}
.preset-add {
  position: absolute;
  top: 21px;
  right: 20px;
  font-size: 20px;
  color: #a1acd0;
}
</style>
