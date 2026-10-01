<script setup lang="ts">
import { computed, ref } from 'vue';
import { DocumentChecked, Refresh, Connection } from '@element-plus/icons-vue';
import { useConfigStore } from '../pinia/config';
import type { Change } from '../services/profile-service';
import { useTask } from '../services/tasks';
import type { Issue } from '../services/shell/types';
import { highlightShell } from '../services/syntax';
import ChangeReview from '../components/ChangeReview.vue';
import PageHeading from '../components/PageHeading.vue';

const store = useConfigStore();
const { busy, perform } = useTask();
const tab = ref('profile');
const pathIssues = ref<Issue[]>([]);
const checkedInput = ref('');
const profileHtml = computed(() => highlightShell(store.preview.profile));
// PATH 形式检查结果属于本次页面操作；配置改变后立即隐藏，避免显示过期结论。
const allIssues = computed(() => [
  ...store.preview.issues,
  ...(checkedInput.value === store.serialized ? pathIssues.value : []),
]);
const changes = ref<Change[]>([]);
const reviewOpen = ref(false);
const reviewTitle = ref('');
function reviewProfile() {
  void perform(async () => {
    changes.value = await store.prepareProfile();
    reviewTitle.value = '生成 Profile';
    reviewOpen.value = true;
  });
}
function reviewIntegration() {
  void perform(async () => {
    changes.value = await store.prepareIntegration();
    reviewTitle.value = '接入 Shell';
    reviewOpen.value = true;
  });
}
function check() {
  void perform(async () => {
    const result = await store.inspectPaths();
    pathIssues.value = result.issues;
    checkedInput.value = result.input;
  }, '配置检查完成');
}
</script>
<template>
  <div class="page-view preview-page">
    <PageHeading eyebrow="PREVIEW & VALIDATE" title="预览与检查">
      <p>在写入文件之前，确认环境变量、PATH 顺序与 Shell 加载配置。</p>
      <template #actions>
        <el-button :icon="Refresh" :loading="busy" @click="check">检查配置</el-button>
        <el-button
          type="primary"
          :icon="DocumentChecked"
          :disabled="store.preview.issues.some((i) => i.level === 'error')"
          @click="reviewProfile"
        >
          生成 Profile
        </el-button>
      </template>
    </PageHeading>
    <div class="preview-layout">
      <section class="panel code-panel">
        <div class="preview-toolbar">
          <el-radio-group v-model="tab">
            <el-radio-button value="profile">Profile</el-radio-button>
            <el-radio-button value="path">PATH 顺序</el-radio-button>
          </el-radio-group>
          <code class="muted small">{{ store.config.settings.generator }}</code>
        </div>
        <template v-if="tab === 'profile'">
          <div class="code-filename">
            <span class="status-dot" />
            {{ store.config.settings.profilePath }}
          </div>
          <pre class="profile-code"><code class="hljs" v-html="profileHtml"></code></pre>
        </template>
        <div v-else class="path-list">
          <p class="muted small">按环境块顺序将目录放在现有 PATH 前面；重复配置只保留首次出现项。</p>
          <div v-for="(entry, index) in store.preview.paths" :key="entry.value" class="path-row">
            <span class="path-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <code>{{ entry.value }}</code>
              <small>{{ entry.block }}</small>
            </div>
          </div>
          <div v-if="store.preview.paths.length" class="path-origin">现有 PATH</div>
          <el-empty v-if="!store.preview.paths.length" description="还没有添加 PATH 目录" :image-size="80" />
        </div>
      </section>
      <aside class="preview-side">
        <section class="panel check-panel">
          <div class="panel-title">
            <h2>配置检查</h2>
            <span class="check-status" :class="allIssues.length ? 'warning' : 'success'">
              {{ allIssues.length ? `${allIssues.length} 项提示` : '通过' }}
            </span>
          </div>
          <div v-if="!allIssues.length" class="check-pass">
            <el-icon><DocumentChecked /></el-icon>
            <strong>基础校验通过</strong>
            <p>点击“检查配置”继续检查 PATH 项是否能解析为绝对路径。</p>
          </div>
          <div v-for="(issue, index) in allIssues" :key="index" class="issue" :class="issue.level">
            <strong>{{ issue.block || '未命名环境' }}</strong>
            <p>{{ issue.message }}</p>
          </div>
        </section>
        <section class="panel integration-panel">
          <h2>接入你的 Shell</h2>
          <p>在选定的 rc 文件中添加 Profile 加载片段。</p>
          <code v-for="file in store.config.settings.rcFiles" :key="file" class="rc-file">
            {{ file }}
          </code>
          <el-button
            :icon="Connection"
            type="primary"
            plain
            :disabled="!store.config.settings.rcFiles.length || store.preview.issues.some((i) => i.level === 'error')"
            @click="reviewIntegration"
          >
            预览并接入
          </el-button>
          <RouterLink to="/settings" class="small">管理 Shell 文件 →</RouterLink>
        </section>
      </aside>
    </div>
    <ChangeReview v-model="reviewOpen" :changes="changes" :title="reviewTitle" />
  </div>
</template>

<style scoped>
.preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  grid-template-rows: minmax(0, 1fr);
  gap: 22px;
  flex: 1;
  min-height: 0;
}
.code-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.profile-code {
  flex: 1;
  min-height: 0;
  margin: 0;
  white-space: pre;
  overflow: auto;
  font:
    11px/1.9 'SFMono-Regular',
    Consolas,
    monospace;
  color: #5b6681;
  background: #fcfdff;
  padding: 23px;
  & > code.hljs {
    display: block;
    overflow: visible;
    padding: 0;
    background: transparent;
  }
}
.preview-toolbar {
  flex-shrink: 0;
  padding: 17px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #edf0f6;
}
.code-filename {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding: 13px 22px;
  background: #f9fafe;
  color: #8c97af;
  font-size: 11px;
  font-family: monospace;
  border-bottom: 1px solid #edf0f6;
}
.preview-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  overflow-y: auto;
  & > .panel {
    flex-shrink: 0;
  }
}
.check-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 7px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  &.success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-8);
  }
  &.warning {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
    border-color: var(--el-color-warning-light-8);
  }
}
.check-pass {
  text-align: center;
  padding: 17px 24px 27px;
  & > :deep(.el-icon) {
    display: block;
    font-size: 29px;
    margin: 0 auto 13px;
    color: #75b49a;
  }
  & strong {
    font-size: 12px;
    font-weight: 500;
  }
  & p {
    font-size: 10px;
    color: #a0a9bb;
    margin-top: 10px;
    line-height: 1.8;
  }
}
.issue {
  padding: 14px 20px;
  border-top: 1px solid #f0f2f7;
  font-size: 11px;
  & strong {
    font-weight: 500;
    color: #b18a4b;
  }
  &.error strong {
    color: #cd6868;
  }
  & p {
    color: #8f99ad;
    margin-top: 7px;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
}
.integration-panel {
  padding: 22px;
  & h2 {
    font-size: 13px;
  }
  & p {
    font-size: 11px;
    color: #98a2b5;
    line-height: 1.8;
    margin: 11px 0 15px;
  }
  & :deep(.el-button) {
    width: 100%;
    margin: 15px 0;
  }
  & > a {
    display: block;
    text-align: center;
  }
}
.rc-file {
  display: block;
  font-size: 11px;
  color: #7d8ba6;
  margin: 8px 0;
  overflow-wrap: anywhere;
}
.path-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
}
.path-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 4px;
  border-bottom: 1px solid #eef1f6;
  & code {
    font-size: 12px;
    color: #6577b1;
    overflow-wrap: anywhere;
  }
  & small {
    display: block;
    font-size: 10px;
    color: #a0a9bb;
    margin-top: 8px;
  }
}
.path-index {
  font-size: 11px;
  color: #a5b0c9;
}
.path-origin {
  margin: 20px 0 5px 36px;
  font-size: 11px;
  color: #a5adbd;
}
</style>
