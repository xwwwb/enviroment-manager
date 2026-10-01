import { computed, nextTick, onScopeDispose, ref, type DeepReadonly } from 'vue';
import type { Block } from './config';

interface DragOptions {
  allBlocks(): readonly DeepReadonly<Block>[];
  visibleBlocks(): readonly DeepReadonly<Block>[];
  select(id: string): void;
  move(id: string, target: number): void;
}

// DOM 测量、指针捕获、窗口监听和动画帧集中在此处；排序结果通过回调交给 Pinia。
export function useBlockDrag(options: DragOptions) {
  const dragging = ref('');
  const dropIndex = ref<number | null>(null);
  const blockItems = ref<HTMLElement>();
  const pointer = ref({ x: 0, y: 0 });
  const dragSize = ref({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  let dragCandidate: { id: string; pointerId: number; x: number; y: number } | undefined;
  let scrollFrame = 0;
  const draggedBlock = computed(() => options.allBlocks().find((block) => block.id === dragging.value));
  const listEntries = computed(() => {
    const entries: { key: string; block: DeepReadonly<Block> | null }[] = options
      .visibleBlocks()
      .filter((block) => block.id !== dragging.value)
      .map((block) => ({ key: `block:${block.id}`, block }));
    if (dragging.value && dropIndex.value !== null) {
      entries.splice(dropIndex.value, 0, { key: 'drop-placeholder', block: null });
    }
    return entries;
  });
  const dragStyle = computed(() => ({
    left: `${pointer.value.x - dragSize.value.offsetX}px`,
    top: `${pointer.value.y - dragSize.value.offsetY}px`,
    width: `${dragSize.value.width}px`,
    height: `${dragSize.value.height}px`,
  }));
  // 达到移动阈值才进入拖拽，普通点击仍保留选择与焦点行为。
  function prepareDrag(event: PointerEvent, block: DeepReadonly<Block>) {
    if (event.button !== 0 || !event.isPrimary || !blockItems.value) {
      return;
    }
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dragCandidate = { id: block.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    dragSize.value = {
      width: bounds.width,
      height: bounds.height,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    pointer.value = { x: event.clientX, y: event.clientY };
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('blur', cancelDrag);
    blockItems.value.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  // 根据可见行的中线计算插入位置，搜索过滤不改变真实配置顺序。
  function updateDropTarget() {
    const container = blockItems.value;
    if (!container || !dragging.value) {
      return;
    }
    const bounds = container.getBoundingClientRect();
    const { x, y } = pointer.value;
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
      dropIndex.value = null;
      return;
    }
    const rows = [...container.querySelectorAll<HTMLElement>('.block-item')].filter(
      (row) => row.dataset.blockId !== dragging.value && !row.classList.contains('block-shift-leave-active'),
    );
    const index = rows.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    dropIndex.value = index < 0 ? rows.length : index;
  }
  function autoScroll() {
    const container = blockItems.value;
    if (!container || !dragging.value) {
      return;
    }
    const bounds = container.getBoundingClientRect();
    const { x, y } = pointer.value;
    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
      const before = container.scrollTop;
      if (y < bounds.top + 32) {
        container.scrollTop -= 8;
      } else if (y > bounds.bottom - 32) {
        container.scrollTop += 8;
      }
      if (container.scrollTop !== before) {
        updateDropTarget();
      }
    }
    scrollFrame = requestAnimationFrame(autoScroll);
  }
  async function moveDrag(event: PointerEvent) {
    if (!dragCandidate || event.pointerId !== dragCandidate.pointerId) {
      return;
    }
    pointer.value = { x: event.clientX, y: event.clientY };
    if (!dragging.value) {
      if (Math.hypot(event.clientX - dragCandidate.x, event.clientY - dragCandidate.y) < 6) {
        return;
      }
      dragging.value = dragCandidate.id;
      dropIndex.value = options.visibleBlocks().findIndex((block) => block.id === dragging.value);
      await nextTick();
      if (!dragging.value) {
        return;
      }
      scrollFrame = requestAnimationFrame(autoScroll);
    }
    updateDropTarget();
  }
  // 取消、失焦和组件卸载共用清理，避免全局监听和动画帧残留。
  function cancelDrag() {
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', finishDrag);
    window.removeEventListener('pointercancel', cancelDrag);
    window.removeEventListener('blur', cancelDrag);
    cancelAnimationFrame(scrollFrame);
    const pointerId = dragCandidate?.pointerId;
    dragCandidate = undefined;
    dragging.value = '';
    dropIndex.value = null;
    if (pointerId !== undefined && blockItems.value?.hasPointerCapture(pointerId)) {
      blockItems.value.releasePointerCapture(pointerId);
    }
  }
  function finishDrag(event: PointerEvent) {
    if (!dragCandidate || event.pointerId !== dragCandidate.pointerId) {
      return;
    }
    const id = dragCandidate.id;
    if (!dragging.value) {
      options.select(id);
      const row = [...(blockItems.value?.querySelectorAll<HTMLElement>('.block-item') ?? [])].find(
        (item) => item.dataset.blockId === id,
      );
      row?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    } else {
      pointer.value = { x: event.clientX, y: event.clientY };
      updateDropTarget();
      const remaining = options.visibleBlocks().filter((block) => block.id !== id);
      if (dropIndex.value !== null && remaining.length) {
        const before = remaining[dropIndex.value];
        const after = remaining.at(-1)!;
        const source = options.allBlocks().findIndex((block) => block.id === id);
        const destination = options.allBlocks().findIndex((block) => block.id === (before ?? after).id);
        const insertion = destination + (before ? 0 : 1);
        options.move(id, insertion - (source < insertion ? 1 : 0));
      }
    }
    cancelDrag();
  }
  onScopeDispose(cancelDrag);

  return { dragging, blockItems, draggedBlock, listEntries, dragStyle, dragSize, prepareDrag, cancelDrag };
}
