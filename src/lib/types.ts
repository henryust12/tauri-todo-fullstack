export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AppErrorKind = 'validation' | 'notFound' | 'storage';

export interface AppError {
  kind: AppErrorKind;
  message: string;
}

export type Filter = 'all' | 'active' | 'completed';

export interface TodoPatch {
  title?: string;
  completed?: boolean;
}

/** The IPC boundary. The store depends on this shape, never on Tauri directly. */
export interface TodoApi {
  listTodos(): Promise<Todo[]>;
  createTodo(title: string): Promise<Todo>;
  updateTodo(id: string, patch: TodoPatch): Promise<Todo>;
  deleteTodo(id: string): Promise<void>;
  clearCompleted(): Promise<number>;
}

export const MAX_TITLE_LENGTH = 200;
