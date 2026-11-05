<script lang="ts">
  import type { Filter } from '#lib/types.ts';
  import type { TodoRow } from '#lib/todos.svelte.ts';
  import TodoItem from './TodoItem.svelte';

  let {
    todos,
    filter,
    loading = false,
    ontoggle,
    onrename,
    ondelete
  }: {
    todos: TodoRow[];
    filter: Filter;
    loading?: boolean;
    ontoggle: (id: string) => void;
    onrename: (id: string, title: string) => void;
    ondelete: (id: string) => void;
  } = $props();

  const empty = $derived(
    filter === 'active'
      ? 'No active tasks.'
      : filter === 'completed'
        ? 'Nothing completed yet.'
        : 'No tasks yet. Add your first one below.'
  );
</script>

{#if loading}
  <p class="empty" role="status">Loading tasks…</p>
{:else if todos.length === 0}
  <p class="empty">{empty}</p>
{:else}
  <ul class="list" aria-label="Tasks">
    {#each todos as todo (todo.id)}
      <TodoItem {todo} {ontoggle} {onrename} {ondelete} />
    {/each}
  </ul>
{/if}

<style>
  .list {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }

  .empty {
    margin: 0;
    padding: 3rem 1rem;
    color: var(--ink-soft);
    text-align: center;
  }
</style>
