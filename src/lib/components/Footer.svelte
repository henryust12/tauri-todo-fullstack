<script lang="ts">
  let {
    activeCount,
    completedCount,
    onclear
  }: {
    activeCount: number;
    completedCount: number;
    onclear: () => void;
  } = $props();
</script>

<div class="footer">
  <p class="left" role="status">
    {activeCount}
    {activeCount === 1 ? 'item' : 'items'} left
  </p>
  <button type="button" disabled={completedCount === 0} onclick={onclear}>Clear completed</button>
</div>

<style>
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .left {
    margin: 0;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }

  button {
    min-height: var(--tap);
    padding: 0 0.9rem;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--ink);
    font-weight: 500;
  }

  button:hover:not(:disabled) {
    background: var(--surface-2);
  }

  button:disabled {
    color: var(--ink-soft);
    opacity: 0.6;
    cursor: default;
  }
</style>
