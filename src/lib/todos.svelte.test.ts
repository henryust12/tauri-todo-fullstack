import { describe, it, expect, vi } from 'vitest';
import { TodoStore } from './todos.svelte';
import { createFakeApi, makeTodo } from './testing/fake-api';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const seed = [
  makeTodo({ id: 'a', title: 'Alpha', createdAt: '2026-01-01T00:00:01.000Z' }),
  makeTodo({ id: 'b', title: 'Bravo', completed: true, createdAt: '2026-01-01T00:00:02.000Z' }),
  makeTodo({ id: 'c', title: 'Charlie', createdAt: '2026-01-01T00:00:03.000Z' })
];

async function loaded() {
  const api = createFakeApi(seed);
  const store = new TodoStore(api);
  await store.load();
  return { api, store };
}

describe('TodoStore', () => {
  it('loads todos and derives counts and filtered lists', async () => {
    const { store } = await loaded();
    expect(store.counts).toEqual({ all: 3, active: 2, completed: 1 });
    expect(store.filtered.map((t) => t.id)).toEqual(['a', 'b', 'c']);

    store.setFilter('active');
    expect(store.filtered.map((t) => t.id)).toEqual(['a', 'c']);
    store.setFilter('completed');
    expect(store.filtered.map((t) => t.id)).toEqual(['b']);
  });

  it('reports a load failure as an AppError', async () => {
    const api = createFakeApi();
    api.listTodos = () => Promise.reject({ kind: 'storage', message: 'disk gone' });
    const store = new TodoStore(api);
    await store.load();
    expect(store.error).toEqual({ kind: 'storage', message: 'disk gone' });
    expect(store.loading).toBe(false);
  });

  it('adds optimistically, then swaps in the saved todo', async () => {
    const { api, store } = await loaded();
    const gate = deferred<ReturnType<typeof makeTodo>>();
    api.createTodo = () => gate.promise;

    const done = store.add('  Delta  ');
    expect(store.todos.at(-1)).toMatchObject({ title: 'Delta', pending: true });

    gate.resolve(makeTodo({ id: 'real', title: 'Delta' }));
    await done;
    expect(store.todos.at(-1)).toMatchObject({ id: 'real', title: 'Delta' });
    expect(store.todos.at(-1)?.pending).toBeUndefined();
  });

  it('rolls back a failed create and surfaces the error', async () => {
    const { api, store } = await loaded();
    api.createTodo = () => Promise.reject({ kind: 'storage', message: 'nope' });
    expect(await store.add('Delta')).toBe(false);
    expect(store.todos).toHaveLength(3);
    expect(store.error?.message).toBe('nope');
  });

  it('rejects empty and over-long titles without calling the api', async () => {
    const { api, store } = await loaded();
    const spy = vi.spyOn(api, 'createTodo');
    expect(await store.add('   ')).toBe(false);
    expect(store.error?.kind).toBe('validation');
    expect(await store.add('x'.repeat(201))).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(await store.add('x'.repeat(200))).toBe(true);
  });

  it('toggles optimistically and keeps the saved result', async () => {
    const { api, store } = await loaded();
    const gate = deferred<ReturnType<typeof makeTodo>>();
    api.updateTodo = () => gate.promise;

    const done = store.toggle('a');
    expect(store.todos[0].completed).toBe(true);
    expect(store.counts.active).toBe(1);

    gate.resolve(makeTodo({ id: 'a', title: 'Alpha', completed: true }));
    await done;
    expect(store.todos[0].completed).toBe(true);
  });

  it('rolls back a failed toggle', async () => {
    const { api, store } = await loaded();
    api.updateTodo = () => Promise.reject({ kind: 'notFound', message: 'gone' });
    expect(await store.toggle('a')).toBe(false);
    expect(store.todos[0].completed).toBe(false);
    expect(store.error).toEqual({ kind: 'notFound', message: 'gone' });
  });

  it('renames with a trimmed title and rolls back on error', async () => {
    const { api, store } = await loaded();
    await store.rename('a', '  Alpha 2 ');
    expect(store.todos[0].title).toBe('Alpha 2');

    api.updateTodo = () => Promise.reject(new Error('boom'));
    await store.rename('a', 'Alpha 3');
    expect(store.todos[0].title).toBe('Alpha 2');
    expect(store.error).toEqual({ kind: 'storage', message: 'boom' });
  });

  it('removes optimistically and restores the row at its position on error', async () => {
    const { api, store } = await loaded();
    api.deleteTodo = () => Promise.reject({ kind: 'storage', message: 'locked' });
    const pending = store.remove('b');
    expect(store.todos.map((t) => t.id)).toEqual(['a', 'c']);
    await pending;
    expect(store.todos.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(store.error?.message).toBe('locked');
  });

  it('clears completed todos', async () => {
    const { api, store } = await loaded();
    await store.clearCompleted();
    expect(store.todos.map((t) => t.id)).toEqual(['a', 'c']);
    expect(api.rows.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('restores cleared todos in order when clearing fails', async () => {
    const { api, store } = await loaded();
    api.clearCompleted = () => Promise.reject({ kind: 'storage', message: 'locked' });
    await store.clearCompleted();
    expect(store.todos.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(store.error?.message).toBe('locked');
  });

  it('clears the error on dismiss', async () => {
    const { store } = await loaded();
    await store.add('');
    expect(store.error).not.toBeNull();
    store.dismissError();
    expect(store.error).toBeNull();
  });
});
