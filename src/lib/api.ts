import { invoke } from '@tauri-apps/api/core';
import { toAppError } from './errors';
import type { Todo, TodoApi, TodoPatch } from './types';

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toAppError(error);
  }
}

export const listTodos = () => call<Todo[]>('list_todos');

export const createTodo = (title: string) => call<Todo>('create_todo', { title });

export const updateTodo = (id: string, patch: TodoPatch) => {
  const args: Record<string, unknown> = { id };
  if (patch.title !== undefined) args.title = patch.title;
  if (patch.completed !== undefined) args.completed = patch.completed;
  return call<Todo>('update_todo', args);
};

export const deleteTodo = async (id: string): Promise<void> => {
  await call<null>('delete_todo', { id });
};

export const clearCompleted = () => call<number>('clear_completed');

export const tauriApi: TodoApi = { listTodos, createTodo, updateTodo, deleteTodo, clearCompleted };
