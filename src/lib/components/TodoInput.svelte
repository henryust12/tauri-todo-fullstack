<script lang="ts">
  import { MAX_TITLE_LENGTH } from '$lib/types';

  let { onsubmit }: { onsubmit: (title: string) => void } = $props();

  let value = $state('');

  const remaining = $derived(MAX_TITLE_LENGTH - value.length);
  const nearLimit = $derived(remaining <= 20);
  const empty = $derived(value.trim() === '');

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const title = value.trim();
    value = '';
    if (title) onsubmit(title);
  }
</script>

<form class="composer" onsubmit={submit}>
  <label class="sr-only" for="new-todo">New task</label>
  <div class="field">
    <input
      id="new-todo"
      type="text"
      name="title"
      placeholder="Add a task"
      autocomplete="off"
      enterkeyhint="done"
      maxlength={MAX_TITLE_LENGTH}
      aria-describedby={nearLimit ? 'new-todo-count' : undefined}
      bind:value
    />
    {#if nearLimit}
      <span id="new-todo-count" class="counter" class:over={remaining <= 0}>
        {value.length}/{MAX_TITLE_LENGTH}
      </span>
    {/if}
  </div>
  <button type="submit" disabled={empty}>Add</button>
</form>

<style>
  .composer {
    display: flex;
    gap: 0.5rem;
    align-items: stretch;
  }

  .field {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  input {
    width: 100%;
    min-height: var(--tap);
    padding: 0 0.9rem;
    border: 1.5px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-size: 1rem; /* 16px keeps iOS from zooming on focus */
  }

  input::placeholder {
    color: var(--ink-soft);
  }

  input:focus-visible {
    outline-offset: 0;
    border-color: var(--accent);
  }

  .counter {
    position: absolute;
    right: 0.7rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0 0.35rem;
    border-radius: 4px;
    background: var(--surface);
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }

  .counter.over {
    color: var(--danger);
    font-weight: 600;
  }

  button {
    min-width: 4.5rem;
    min-height: var(--tap);
    padding: 0 1.1rem;
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  button:disabled {
    background: var(--surface-2);
    color: var(--ink-soft);
    cursor: not-allowed;
  }
</style>
