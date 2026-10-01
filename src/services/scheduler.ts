// 每个调用方拥有独立的防抖任务；销毁 store 时可取消尚未开始的保存。
export function createDebouncer(delay: number, action: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }
  return {
    cancel,
    schedule() {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        action();
      }, delay);
    },
  };
}
