<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { Grid, Document, Setting } from '@element-plus/icons-vue';
import { useConfigStore } from './pinia/config';
import { guardWindowClose } from './services/window';
import { ElMessageBox } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { appName, appTitle, appVersion } from './consts';

const store = useConfigStore();
const navigation = [
  { to: '/', label: '环境变量', icon: Grid },
  { to: '/preview', label: '预览与检查', icon: Document },
  { to: '/settings', label: '设置与备份', icon: Setting },
];
const retrySave = () => void store.persistNow().catch(() => {});
let releaseCloseGuard: (() => void) | undefined;
onMounted(() => {
  releaseCloseGuard = guardWindowClose({
    hasPendingChanges: () => store.dirty || store.saving,
    flush: store.persistNow,
    onError: (error) =>
      ElMessageBox.alert(`窗口关闭保护发生错误，尚未关闭窗口。\n${String(error)}`, '配置保存与窗口操作', {
        type: 'error',
        confirmButtonText: '知道了',
      }).then(() => {}),
  });
  void store.initialize();
});
onUnmounted(() => releaseCloseGuard?.());
</script>

<template>
  <el-config-provider :locale="zhCn">
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#/" aria-label="环境变量管理器 首页">
          <img src="/icon.png" alt="" />
          <span>
            {{ appTitle }}
            <small>{{ appName }}</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <RouterLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: $route.path === item.to }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
            <span v-if="item.to === '/'" class="nav-count">{{ store.config.blocks.length }}</span>
          </RouterLink>
        </nav>
        <div class="sidebar-bottom">
          <div class="local-status">
            <span class="status-dot" />
            本地桌面应用
          </div>
          <p>配置保存在这台设备上</p>
          <div class="sidebar-version">
            <span>{{ appTitle }}</span>
            <span>v{{ appVersion }}</span>
          </div>
        </div>
      </aside>
      <div class="workspace">
        <main>
          <div v-if="store.saveError" class="save-error">
            <el-alert
              title="配置自动保存失败"
              :description="store.saveError"
              type="error"
              :closable="false"
              show-icon
            />
            <el-button type="danger" plain @click="retrySave">重试保存</el-button>
          </div>
          <el-alert
            v-if="store.loadError"
            title="配置加载失败，已阻止覆盖原文件"
            :description="store.loadError"
            type="error"
            :closable="false"
            show-icon
          />
          <RouterView v-if="store.ready && !store.loadError" />
          <el-skeleton v-else-if="!store.ready" :rows="8" animated />
        </main>
      </div>
    </div>
  </el-config-provider>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  width: 200px;
  flex: 0 0 200px;
  height: 100vh;
  overflow: hidden;
  background: #fff;
  border-right: 1px solid #e7eaf2;
  padding: 31px 20px 18px;
  display: flex;
  flex-direction: column;
}
.brand {
  display: flex;
  gap: 9px;
  align-items: center;
  color: #25304a;
  margin: 0 5px 43px;
  & img {
    width: 36px;
    height: 36px;
    border-radius: 11px;
  }
  & > span {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.5px;
    white-space: nowrap;
  }
  & small {
    display: block;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 1px;
    margin-top: 3px;
    color: #929bb0;
  }
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #707b92;
  padding: 13px 14px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  & :deep(.el-icon) {
    font-size: 17px;
  }
  &:hover {
    background: #f7f8fc;
  }
  &.active {
    background: #edf0fe;
    color: #5266d8;
    font-weight: 600;
  }
}
.nav-count {
  margin-left: auto;
  border-radius: 5px;
  background: #dfe5fd;
  padding: 2px 7px;
  font-size: 10px;
}
.sidebar-bottom {
  margin-top: auto;
  padding: 70px 12px 0;
  & p {
    font-size: 10px;
    line-height: 1.8;
    color: #9aa3b5;
    margin: 7px 0 20px;
  }
}
.local-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #59667c;
}
.sidebar-version {
  border-top: 1px solid #edf0f5;
  padding-top: 15px;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9aa3b5;
}
.workspace {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}
main {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 33px 35px 25px;
  max-width: 1700px;
  margin: 0 auto;
}
.save-error {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
</style>
