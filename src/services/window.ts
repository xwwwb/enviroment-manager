import { getCurrentWindow } from '@tauri-apps/api/window';

interface CloseGuard {
  hasPendingChanges(): boolean;
  flush(): Promise<void>;
  onError(error: unknown): void | Promise<void>;
}

// 关闭请求先等待落盘，失败时保持窗口打开；组件销毁后及时移除监听。
export function guardWindowClose(guard: CloseGuard): () => void {
  let disposed = false;
  let closing = false;
  let unlisten: (() => void) | undefined;
  const reportError = (error: unknown) => {
    if (!disposed) {
      void Promise.resolve(guard.onError(error)).catch(() => {});
    }
  };
  void (async () => {
    const current = getCurrentWindow();
    const stop = await current.onCloseRequested(async (event) => {
      if (disposed || (!closing && !guard.hasPendingChanges())) {
        return;
      }
      event.preventDefault();
      if (closing) {
        return;
      }
      closing = true;
      try {
        await guard.flush();
        if (!disposed) {
          await current.destroy();
        }
      } catch (error) {
        reportError(error);
      } finally {
        closing = false;
      }
    });
    if (disposed) {
      stop();
    } else {
      unlisten = stop;
    }
  })().catch(reportError);
  return () => {
    disposed = true;
    unlisten?.();
  };
}
