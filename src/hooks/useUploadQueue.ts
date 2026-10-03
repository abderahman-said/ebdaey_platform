import { useState, useCallback, useRef } from "react";

export interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  filePreviewUrl?: string;
  fileType?: string;
}

type UploadFn = (
  task: UploadTask,
  onProgress: (progress: number) => void,
  signal: AbortSignal
) => Promise<{ previewUrl?: string; fileType?: string }>;

const MAX_CONCURRENT = 2;

export function useUploadQueue() {
  const [tasks, setTasks] = useState<Map<string, UploadTask>>(new Map());
  const activeCount = useRef(0);
  const queue = useRef<{ id: string; fn: UploadFn }[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const updateTask = useCallback((id: string, updates: Partial<UploadTask>) => {
    setTasks(prev => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, ...updates });
      }
      return next;
    });
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const processNext = useCallback(() => {
    while (activeCount.current < MAX_CONCURRENT && queue.current.length > 0) {
      const item = queue.current.shift()!;
      activeCount.current++;

      const controller = new AbortController();
      abortControllers.current.set(item.id, controller);

      updateTask(item.id, { status: "uploading", progress: 0 });

      item
        .fn(
          { id: item.id, fileName: "", progress: 0, status: "uploading" },
          (progress) => updateTask(item.id, { progress }),
          controller.signal
        )
        .then((result) => {
          updateTask(item.id, {
            status: "done",
            progress: 100,
            filePreviewUrl: result?.previewUrl,
            fileType: result?.fileType,
          });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          updateTask(item.id, { status: "error", error: err?.message || "خطأ" });
        })
        .finally(() => {
          activeCount.current--;
          abortControllers.current.delete(item.id);
          processNext();
        });
    }
  }, [updateTask]);

  const enqueue = useCallback(
    (id: string, fileName: string, fn: UploadFn) => {
      const task: UploadTask = { id, fileName, progress: 0, status: "queued" };
      setTasks(prev => {
        const next = new Map(prev);
        next.set(id, task);
        return next;
      });
      queue.current.push({ id, fn });
      processNext();
    },
    [processNext]
  );

  const cancel = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) controller.abort();
    queue.current = queue.current.filter(q => q.id !== id);
    setTasks(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isUploading = useCallback(
    (id: string) => {
      const task = tasks.get(id);
      return task?.status === "uploading" || task?.status === "queued";
    },
    [tasks]
  );

  const getTask = useCallback(
    (id: string) => tasks.get(id) || null,
    [tasks]
  );

  return { tasks, enqueue, cancel, isUploading, getTask, removeTask };
}
