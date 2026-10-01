import { onScopeDispose, readonly, ref } from 'vue';
import { ElMessage } from 'element-plus';

// 每个页面或弹窗独立的任务状态；离开页面后不再弹出过期操作的通知。
export function useTask() {
  const busy = ref(false);
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  async function perform(action: () => Promise<unknown>, success?: string) {
    if (busy.value || disposed) {
      return;
    }
    busy.value = true;
    try {
      const result = await action();
      // 操作返回 false 表示没有实际变更，例如取消文件选择，不显示成功消息。
      if (success && result !== false && !disposed) {
        ElMessage.success(success);
      }
    } catch (error) {
      if (!disposed && error !== 'cancel' && error !== 'close') {
        ElMessage.error({
          message: error instanceof Error ? error.message : String(error),
          duration: 6000,
        });
      }
    } finally {
      busy.value = false;
    }
  }
  return { busy: readonly(busy), perform };
}
