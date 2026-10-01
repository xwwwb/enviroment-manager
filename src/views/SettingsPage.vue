<script setup lang="ts">
import { ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Download, Upload, UploadFilled, RefreshLeft } from '@element-plus/icons-vue';
import { useConfigStore } from '../pinia/config';
import { useTask } from '../services/tasks';
import { generators } from '../services/shell';
import { shellRcFiles, type ShellRcFile } from '../services/config';
import {
  openConfigFilePicker,
  readConfigFile,
  prepareConfigExport,
  writeConfigExport,
} from '../services/config-transfer';
import { configFilename } from '../consts';
import PageHeading from '../components/PageHeading.vue';

const store = useConfigStore();
const { busy, perform } = useTask();
const fileInput = ref<HTMLInputElement>();
function exportConfig() {
  void perform(async () => {
    const { value } = await ElMessageBox.prompt('输入导出文件的完整路径', '导出配置', {
      inputValue: `~/Downloads/${configFilename}`,
      confirmButtonText: '导出',
      cancelButtonText: '取消',
    });
    const plan = await prepareConfigExport(store.snapshot(), value);
    if (plan.before !== null) {
      await ElMessageBox.confirm(`${plan.path} 已存在，是否覆盖？`, '覆盖导出文件', {
        confirmButtonText: '覆盖',
        cancelButtonText: '取消',
        type: 'warning',
      });
    }
    await writeConfigExport(plan);
  }, '配置已导出');
}
function importConfig(event: Event) {
  void perform(async () => {
    const incoming = await readConfigFile(event);
    if (!incoming) {
      return false;
    }
    await store.replace(incoming);
    return true;
  }, '配置已导入，当前配置已替换');
}
function clearConfig() {
  void perform(async () => {
    await ElMessageBox.confirm('清空所有环境块并恢复默认设置？此操作会自动保存。', '清空当前配置', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
    });
    await store.clear();
  }, '当前配置已清空');
}
function backup() {
  void perform(() => store.backup(), '备份完成');
}
function restore() {
  void perform(async () => store.replace(await store.readBackup()), '配置已恢复');
}
</script>
<template>
  <div class="page-view settings-page">
    <PageHeading eyebrow="PREFERENCES" title="设置与备份">
      <p>配置生成位置、Shell 加载方式，以及属于你的数据备份。</p>
    </PageHeading>
    <div class="settings-grid">
      <section class="panel settings-panel">
        <div class="settings-section-title">
          <div>
            <h2>Profile 生成</h2>
            <p>选择生成器与输出文件。</p>
          </div>
        </div>
        <el-form label-position="top">
          <el-form-item label="Shell 生成器">
            <el-select
              :model-value="store.config.settings.generator"
              @update:model-value="store.updateSettings({ generator: $event })"
              aria-label="Shell 生成器"
            >
              <el-option
                v-for="generator in generators"
                :key="generator.id"
                :label="generator.label"
                :value="generator.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Profile 生成路径">
            <el-input
              :model-value="store.config.settings.profilePath"
              @update:model-value="store.updateSettings({ profilePath: $event })"
              class="mono"
              aria-label="Profile 生成路径"
            />
            <p class="field-hint">支持绝对路径或 ~/ 路径，目标位置需具有文件读写权限。</p>
          </el-form-item>
        </el-form>
      </section>
      <section class="panel settings-panel">
        <div class="settings-section-title">
          <div>
            <h2>Shell 配置文件</h2>
            <p>选定文件后，在预览页面接入 Profile。</p>
          </div>
        </div>
        <el-checkbox-group
          :model-value="store.config.settings.rcFiles"
          @update:model-value="store.updateSettings({ rcFiles: $event as ShellRcFile[] })"
          class="rc-options"
        >
          <el-checkbox v-for="file in shellRcFiles" :key="file" :value="file">
            <code>{{ file }}</code>
          </el-checkbox>
        </el-checkbox-group>
        <p class="field-hint">只更新本应用标记的片段，保留 Shell 配置文件中的其他内容。</p>
      </section>
      <section class="panel settings-panel backup-panel">
        <div class="settings-section-title">
          <div>
            <h2>配置与备份</h2>
            <p>通过本地 JSON 文件或 GitHub Gist 迁移与备份配置。</p>
          </div>
        </div>
        <div class="backup-options">
          <section class="file-backup">
            <h3>本地文件</h3>
            <p class="backup-description">导入 JSON 会清空当前内容，并用文件中的完整配置替换。</p>
            <div class="actions file-actions">
              <el-button :icon="Upload" @click="openConfigFilePicker(fileInput)">导入配置</el-button>
              <el-button :icon="Download" @click="exportConfig">导出配置</el-button>
              <el-button type="danger" plain @click="clearConfig">清空当前配置</el-button>
            </div>
            <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="importConfig" />
          </section>
          <section class="gist-backup">
            <h3>GitHub Gist</h3>
            <el-form label-position="top">
              <div class="gist-fields">
                <el-form-item label="GitHub Token">
                  <el-input
                    :model-value="store.config.settings.gistToken"
                    @update:model-value="store.updateSettings({ gistToken: $event })"
                    type="password"
                    show-password
                    placeholder="具有 Gist 读写权限的 Token"
                    autocomplete="off"
                    aria-label="GitHub Token"
                  />
                </el-form-item>
                <el-form-item label="Gist ID">
                  <el-input
                    :model-value="store.config.settings.gistId"
                    @update:model-value="store.updateSettings({ gistId: $event })"
                    placeholder="留空时创建新的私密 Gist"
                    aria-label="Gist ID"
                  />
                </el-form-item>
              </div>
              <div class="actions">
                <el-button :icon="UploadFilled" :loading="busy" @click="backup">立即备份</el-button>
                <el-button :icon="RefreshLeft" :disabled="!store.config.settings.gistId" @click="restore">
                  从 Gist 恢复
                </el-button>
              </div>
              <p class="field-hint">备份到私密 Gist；备份与恢复由你手动发起。</p>
            </el-form>
          </section>
        </div>
        <p class="field-hint backup-hint">配置自动保存；JSON 导出包含 GitHub Token，Gist 备份仅保存占位符。</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: minmax(280px, 0.85fr) minmax(0, 1.15fr);
  gap: 22px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}
.settings-panel {
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
  & :deep(.el-form-item) {
    margin-bottom: 16px;
  }
  & :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }
  & :deep(.el-form-item__label) {
    font-size: 11px;
    color: #737f99;
    margin-bottom: 7px;
  }
  & :deep(.el-input__inner) {
    font-size: 12px;
  }
}
.settings-section-title {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  & h2 {
    font-size: 14px;
  }
  & p {
    font-size: 11px;
    color: #99a3b7;
    margin-top: 7px;
  }
}
.field-hint {
  font-size: 10px;
  color: #9aa4b7;
  line-height: 1.9;
  margin-top: 10px;
}
.rc-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 5px 0 22px;
  & :deep(.el-checkbox) {
    margin-right: 0;
  }
  & code {
    font-size: 12px;
  }
}
.backup-panel {
  grid-column: 1 / -1;
}
.backup-options {
  display: grid;
  grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr);
  gap: 28px;
  & h3 {
    margin: 0 0 16px;
    color: #65718d;
    font-size: 12px;
    font-weight: 600;
  }
}
.backup-description {
  margin-bottom: 18px;
  font-size: 11px;
  color: #99a3b7;
  line-height: 1.8;
}
.file-actions {
  flex-wrap: wrap;
}
.gist-backup {
  min-width: 0;
  padding-left: 28px;
  border-left: 1px solid #edf0f6;
}
.gist-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  & :deep(.el-form-item:last-child) {
    margin-bottom: 16px;
  }
}
.backup-hint {
  padding-top: 16px;
  margin-top: 22px;
  border-top: 1px solid #edf0f6;
}
</style>
