import { toAppError } from './errors';
import { MAX_TITLE_LENGTH } from './types';
import type { AppError, Filter, Todo, TodoApi, TodoPatch } from './types';

/** A todo as the UI sees it; `pending` marks an optimistic create that the backend has not confirmed. */
export type TodoRow = Todo & { pending?: boolean };

export class TodoStore {
  todos = $state<TodoRow[]>([]);
  filter = $state<Filter>('all');
  loading = $state(false);
  error = $state<AppError | null>(null);

  counts = $derived({
    all: this.todos.length,
    active: this.todos.filter((t) => !t.completed).length,
    completed: this.todos.filter((t) => t.completed).length
  });

  filtered = $derived(
    this.filter === 'all'
      ? this.todos
      : this.todos.filter((t) => (this.filter === 'completed' ? t.completed : !t.completed))
  );

  #api: TodoApi;
  #seq = 0;

  constructor(api: TodoApi) {
    this.#api = api;
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      this.todos = await this.#api.listTodos();
    } catch (e) {
      this.error = toAppError(e);
    } finally {
      this.loading = false;
    }
  }

  setFilter(filter: Filter): void {
    this.filter = filter;
  }

  dismissError(): void {
    this.error = null;
  }

  #validate(title: string): string | null {
    const trimmed = title.trim();
    if (!trimmed) {
      this.error = { kind: 'validation', message: 'Title cannot be empty.' };
      return null;
    }
    if ([...trimmed].length > MAX_TITLE_LENGTH) {
      this.error = {
        kind: 'validation',
        message: `Title can be at most ${MAX_TITLE_LENGTH} characters.`
      };
      return null;
    }
    return trimmed;
  }

  #find(id: string): TodoRow | undefined {
    return this.todos.find((t) => t.id === id);
  }

  async add(title: string): Promise<boolean> {
    const trimmed = this.#validate(title);
    if (trimmed === null) return false;
    this.error = null;

    // Plain timestamp for an optimistic row, never mutated, so it needs no reactivity.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const now = new Date().toISOString();
    const tempId = `pending-${++this.#seq}`;
    this.todos.push({
      id: tempId,
      title: trimmed,
      completed: false,
      createdAt: now,
      updatedAt: now,
      pending: true
    });

    try {
      const created = await this.#api.createTodo(trimmed);
      const index = this.todos.findIndex((t) => t.id === tempId);
      if (index !== -1) this.todos[index] = created;
      return true;
    } catch (e) {
      this.todos = this.todos.filter((t) => t.id !== tempId);
      this.error = toAppError(e);
      return false;
    }
  }

  async #patch(id: string, patch: TodoPatch): Promise<boolean> {
    const row = this.#find(id);
    if (!row || row.pending) return false;
    this.error = null;

    const before = { title: row.title, completed: row.completed };
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.completed !== undefined) row.completed = patch.completed;

    try {
      const saved = await this.#api.updateTodo(id, patch);
      const index = this.todos.findIndex((t) => t.id === id);
      if (index !== -1) this.todos[index] = saved;
      return true;
    } catch (e) {
      const current = this.#find(id);
      if (current) {
        // Only undo the fields this call touched, so concurrent edits survive.
        if (patch.title !== undefined) current.title = before.title;
        if (patch.completed !== undefined) current.completed = before.completed;
      }
      this.error = toAppError(e);
      return false;
    }
  }

  toggle(id: string): Promise<boolean> {
    const row = this.#find(id);
    if (!row) return Promise.resolve(false);
    return this.#patch(id, { completed: !row.completed });
  }

  rename(id: string, title: string): Promise<boolean> {
    const trimmed = this.#validate(title);
    if (trimmed === null) return Promise.resolve(false);
    return this.#patch(id, { title: trimmed });
  }

  async remove(id: string): Promise<boolean> {
    const index = this.todos.findIndex((t) => t.id === id);
    const row = this.todos[index];
    if (!row || row.pending) return false;
    this.error = null;

    this.todos.splice(index, 1);
    try {
      await this.#api.deleteTodo(id);
      return true;
    } catch (e) {
      this.todos.splice(Math.min(index, this.todos.length), 0, row);
      this.error = toAppError(e);
      return false;
    }
  }

  async clearCompleted(): Promise<boolean> {
    const removed = this.todos.filter((t) => t.completed && !t.pending);
    if (removed.length === 0) return false;
    this.error = null;

    // Local lookup only, not state.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const ids = new Set(removed.map((t) => t.id));
    this.todos = this.todos.filter((t) => !ids.has(t.id));
    try {
      await this.#api.clearCompleted();
      return true;
    } catch (e) {
      // Backend order is oldest first, so restoring by creation time puts rows back where they were.
      this.todos = [...this.todos, ...removed].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      );
      this.error = toAppError(e);
      return false;
    }
  }
}
