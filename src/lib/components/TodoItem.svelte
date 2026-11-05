<script lang="ts">
  import { MAX_TITLE_LENGTH } from '$lib/types';
  import type { TodoRow } from '$lib/todos.svelte';

  let {
    todo,
    ontoggle,
    onrename,
    ondelete
  }: {
    todo: TodoRow;
    ontoggle: (id: string) => void;
    onrename: (id: string, title: string) => void;
    ondelete: (id: string) => void;
  } = $props();

  let editing = $state(false);
  let draft = $state('');
  // Escape and Enter unmount the input, which can also fire blur; settle only once per edit.
  let settled = true;

  function startEdit() {
    if (todo.pending) return;
    draft = todo.title;
    settled = false;
    editing = true;
  }

  function cancel() {
    if (settled) return;
    settled = true;
    editing = false;
  }

  function save() {
    if (settled) return;
    settled = true;
    editing = false;
    const title = draft.trim();
    if (title === '') {
      ondelete(todo.id);
    } else if (title !== todo.title) {
      onrename(todo.id, title);
    }
  }

  function onEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  }

  function onTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      startEdit();
    }
  }

  function focusAndSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<li class="item" class:done={todo.completed} class:pending={todo.pending}>
  <label class="check">
    <input
      type="checkbox"
      checked={todo.completed}
      disabled={todo.pending}
      aria-label={todo.title}
      onchange={() => ontoggle(todo.id)}
    />
    <svg class="box" viewBox="0 0 24 24" aria-hidden="true">
      <rect class="frame" x="3" y="3" width="18" height="18" rx="5" />
      <path class="tick" d="M7.5 12.5l3 3 6-7" pathLength="1" />
    </svg>
  </label>

  {#if editing}
    <input
      class="edit"
      type="text"
      aria-label="Edit task title"
      maxlength={MAX_TITLE_LENGTH}
      bind:value={draft}
      onkeydown={onEditKeydown}
      onblur={save}
      {@attach focusAndSelect}
    />
  {:else}
    <button
      type="button"
      class="title"
      ondblclick={startEdit}
      onkeydown={onTitleKeydown}
      title="Double-click or press Enter to edit"
    >
      <span class="text">{todo.title}</span>
    </button>
    <button
      type="button"
      class="action"
      aria-label={`Edit ${todo.title}`}
      disabled={todo.pending}
      onclick={startEdit}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
      </svg>
    </button>
    <button
      type="button"
      class="action danger"
      aria-label={`Delete ${todo.title}`}
      disabled={todo.pending}
      onclick={() => ondelete(todo.id)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" />
      </svg>
    </button>
  {/if}
</li>

<style>
  .item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 3.5rem;
    padding: 0.125rem 0.25rem 0.125rem 0.125rem;
    border-bottom: 1px solid var(--line);
  }

  .item.pending {
    opacity: 0.6;
  }

  .check {
    position: relative;
    display: grid;
    flex: none;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    cursor: pointer;
  }

  .check input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }

  .box {
    width: 1.75rem;
    height: 1.75rem;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .frame {
    stroke: var(--ink-soft);
    stroke-width: 1.75;
    transition:
      fill 0.15s,
      stroke 0.15s;
  }

  .tick {
    stroke: var(--accent-ink);
    stroke-width: 2.25;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 0.22s ease-out 0.05s;
  }

  .check input:checked + .box .frame {
    fill: var(--accent);
    stroke: var(--accent);
  }

  .check input:checked + .box .tick {
    stroke-dashoffset: 0;
  }

  .check input:focus-visible + .box {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
    border-radius: 6px;
  }

  .title {
    flex: 1;
    min-width: 0;
    min-height: var(--tap);
    padding: 0 0.25rem;
    border: 0;
    background: none;
    text-align: left;
    cursor: text;
    overflow-wrap: anywhere;
  }

  /* The strike line sweeps across the text instead of toggling instantly. */
  .text {
    background-image: linear-gradient(currentColor, currentColor);
    background-repeat: no-repeat;
    background-position: 0 58%;
    background-size: 0% 2px;
    transition:
      background-size 0.28s ease-out,
      color 0.2s;
  }

  .done .text {
    background-size: 100% 2px;
    color: var(--ink-soft);
  }

  .edit {
    flex: 1;
    min-width: 0;
    min-height: var(--tap);
    margin-left: 0.25rem;
    padding: 0 0.7rem;
    border: 1.5px solid var(--accent);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-size: 1rem;
  }

  .edit:focus-visible {
    outline-offset: 0;
  }

  .action {
    display: grid;
    flex: none;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--ink-soft);
  }

  .action svg {
    width: 1.35rem;
    height: 1.35rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .action:hover:not(:disabled) {
    background: var(--surface-2);
    color: var(--ink);
  }

  .action.danger:hover:not(:disabled) {
    background: var(--danger-wash);
    color: var(--danger);
  }

  .action:disabled {
    cursor: default;
  }
</style>
