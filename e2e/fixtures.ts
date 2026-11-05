import { test as base, expect } from '@playwright/test';

export interface SeedTodo {
  title: string;
  completed?: boolean;
}

/**
 * Installs a fake Tauri IPC layer before the app boots. It implements the five commands from the
 * IPC contract against an in-memory array, including the `{ kind, message }` error shape.
 * `window.__fakeIpc.failNext(kind, message)` makes the next command reject, for error-path tests.
 * Runs in the browser, so it must stay self-contained.
 */
function installFakeIpc(seed: SeedTodo[]) {
  type Todo = {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
  };
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++tick)).toISOString();
  const make = (title: string, completed = false): Todo => {
    const at = now();
    return { id: crypto.randomUUID(), title, completed, createdAt: at, updatedAt: at };
  };

  const todos: Todo[] = seed.map((s) => make(s.title, s.completed));
  let failure: { kind: string; message: string } | null = null;
  const fail = (kind: string, message: string) => Promise.reject({ kind, message });

  function checkTitle(raw: unknown): string | { kind: string; message: string } {
    const title = typeof raw === 'string' ? raw.trim() : '';
    if (title.length === 0) return { kind: 'validation', message: 'Title cannot be empty.' };
    if ([...title].length > 200)
      return { kind: 'validation', message: 'Title can be at most 200 characters.' };
    return title;
  }

  const commands: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
    list_todos: async () => todos.map((t) => ({ ...t })),
    create_todo: async (args) => {
      const title = checkTitle(args.title);
      if (typeof title !== 'string') return fail(title.kind, title.message);
      const todo = make(title);
      todos.push(todo);
      return { ...todo };
    },
    update_todo: async (args) => {
      const todo = todos.find((t) => t.id === args.id);
      if (!todo) return fail('notFound', 'Todo not found.');
      if (args.title !== undefined) {
        const title = checkTitle(args.title);
        if (typeof title !== 'string') return fail(title.kind, title.message);
        todo.title = title;
      }
      if (args.completed !== undefined) todo.completed = Boolean(args.completed);
      todo.updatedAt = now();
      return { ...todo };
    },
    delete_todo: async (args) => {
      const index = todos.findIndex((t) => t.id === args.id);
      if (index === -1) return fail('notFound', 'Todo not found.');
      todos.splice(index, 1);
      return null;
    },
    clear_completed: async () => {
      const before = todos.length;
      for (let i = todos.length - 1; i >= 0; i--) if (todos[i].completed) todos.splice(i, 1);
      return before - todos.length;
    }
  };

  const w = window as unknown as Record<string, unknown>;
  w.__fakeIpc = {
    failNext(kind: string, message: string) {
      failure = { kind, message };
    }
  };
  w.__TAURI_INTERNALS__ = {
    invoke(cmd: string, args: Record<string, unknown> = {}) {
      if (failure) {
        const f = failure;
        failure = null;
        return fail(f.kind, f.message);
      }
      const handler = commands[cmd];
      return handler ? handler(args) : fail('storage', `Unknown command: ${cmd}`);
    },
    transformCallback() {
      return 0;
    }
  };
}

// The option is an object: Playwright reads a bare array passed to test.use() as a [value, options] tuple.
export const test = base.extend<{ seed: { todos: SeedTodo[] } }>({
  seed: [{ todos: [] }, { option: true }],
  page: async ({ page, seed }, use) => {
    await page.addInitScript(installFakeIpc, seed.todos);
    await use(page);
  }
});

export { expect };

/** Make the next IPC command reject with a contract-shaped error. */
export async function failNext(
  page: import('@playwright/test').Page,
  kind: 'validation' | 'notFound' | 'storage',
  message: string
) {
  await page.evaluate(
    ([k, m]) =>
      (
        window as unknown as { __fakeIpc: { failNext(k: string, m: string): void } }
      ).__fakeIpc.failNext(k, m),
    [kind, message]
  );
}
