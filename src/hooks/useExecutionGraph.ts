import { useCallback, useState } from 'react';

export type ExecutionStep =
  | 'generate-outline'
  | 'generate-draft'
  | 'continue-draft'
  | 'autosave-local'
  | 'autosave-cloud';

export type ExecutionStatus = 'running' | 'success' | 'error';

export interface ExecutionEvent {
  id: string;
  step: ExecutionStep;
  status: ExecutionStatus;
  startedAt: number;
  finishedAt?: number;
  duration?: number;
  meta?: Record<string, unknown>;
  error?: string;
}

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function useExecutionGraph(initialEvents: ExecutionEvent[] = []) {
  const [events, setEvents] = useState<ExecutionEvent[]>(initialEvents);

  const startStep = useCallback(
    (step: ExecutionStep, meta?: Record<string, unknown>) => {
      const id = createId();
      const event: ExecutionEvent = {
        id,
        step,
        status: 'running',
        startedAt: Date.now(),
        meta
      };
      setEvents((prev) => [event, ...prev].slice(0, 50));
      return id;
    },
    []
  );

  const finishStep = useCallback(
    (id: string, status: ExecutionStatus, meta?: Record<string, unknown>) => {
      const timestamp = Date.now();
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? {
                ...event,
                status,
                finishedAt: timestamp,
                duration: timestamp - event.startedAt,
                meta: meta ? { ...event.meta, ...meta } : event.meta,
                error: status === 'error' ? (meta?.error as string) || 'Unknown error' : undefined
              }
            : event
        )
      );
    },
    []
  );

  const runStep = useCallback(
    async <T,>(step: ExecutionStep, task: () => Promise<T>, meta?: Record<string, unknown>) => {
      const id = startStep(step, meta);
      try {
        const result = await task();
        finishStep(id, 'success');
        return result;
      } catch (error: any) {
        finishStep(id, 'error', { error: error?.message || 'Unknown error' });
        throw error;
      }
    },
    [finishStep, startStep]
  );

  return {
    events,
    startStep,
    finishStep,
    runStep
  };
}





