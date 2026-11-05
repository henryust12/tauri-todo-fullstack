import type { Todo, TodoApi } from '../types';

/** In-memory TodoApi for unit tests. Methods are plain properties so tests can override them. */
export function createFakeApi(seed: Todo[] = []): TodoApi & { rows: Todo[] } {
  let n = 0;
  const rows: Todo[] = seed.map((t) => ({ ...t }));
  const stamp = () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++n)).toISOString();

  return {
    rows,
    async listTodos() {
      return rows.map((t) => ({ ...t }));
    },
    async createTodo(title) {
      const now = stamp();
      const todo: Todo = {
        id: `id-${now}`,
        title: title.trim(),
        completed: false,
        createdAt: now,
        updatedAt: now
      };
      rows.push(todo);
      return { ...todo };
    },
    async updateTodo(id, patch) {
      const row = rows.find((t) => t.id === id);
      if (!row) throw { kind: 'notFound', message: 'Todo not found.' };
      if (patch.title !== undefined) row.title = patch.title.trim();
      if (patch.completed !== undefined) row.completed = patch.completed;
      row.updatedAt = stamp();
      return { ...row };
    },
    async deleteTodo(id) {
      const index = rows.findIndex((t) => t.id === id);
      if (index === -1) throw { kind: 'notFound', message: 'Todo not found.' };
      rows.splice(index, 1);
    },
    async clearCompleted() {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].completed) rows.splice(i, 1);
      return before - rows.length;
    }
  };
}

export function makeTodo(partial: Partial<Todo> & Pick<Todo, 'id' | 'title'>): Todo {
  return {
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial
  };
}
