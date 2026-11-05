<script lang="ts">
  import type { Filter } from '#lib/types.ts';

  let {
    filter,
    counts,
    onchange,
    orientation = 'horizontal'
  }: {
    filter: Filter;
    counts: Record<Filter, number>;
    onchange: (filter: Filter) => void;
    orientation?: 'horizontal' | 'vertical';
  } = $props();

  const options: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];
</script>

<div
  class="filters"
  class:vertical={orientation === 'vertical'}
  role="group"
  aria-label="Filter tasks"
>
  {#each options as option (option.value)}
    <button
      type="button"
      aria-pressed={filter === option.value}
      onclick={() => onchange(option.value)}
    >
      <span>{option.label}</span>
      <span class="count" aria-hidden="true">{counts[option.value]}</span>
    </button>
  {/each}
</div>

<style>
  .filters {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }

  .filters.vertical {
    flex-direction: column;
    padding: 0;
    background: none;
  }

  button {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: var(--tap);
    padding: 0 0.9rem;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--ink-soft);
    font-weight: 500;
  }

  .vertical button {
    flex: none;
    justify-content: space-between;
    border-radius: var(--radius-sm);
  }

  button:hover {
    color: var(--ink);
  }

  button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--accent);
    font-weight: 650;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
  }

  .vertical button[aria-pressed='true'] {
    background: var(--accent-wash);
    box-shadow: none;
  }

  .count {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }
</style>
