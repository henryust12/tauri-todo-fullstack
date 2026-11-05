<script lang="ts">
  import { onMount } from 'svelte';
  import { tauriApi } from '#lib/api.ts';
  import { TodoStore } from '#lib/todos.svelte.ts';
  import ErrorToast from '#lib/components/ErrorToast.svelte';
  import FilterBar from '#lib/components/FilterBar.svelte';
  import Footer from '#lib/components/Footer.svelte';
  import TodoInput from '#lib/components/TodoInput.svelte';
  import TodoList from '#lib/components/TodoList.svelte';

  const store = new TodoStore(tauriApi);

  onMount(() => {
    void store.load();
  });
</script>

<svelte:head>
  <title>Tauri Todo</title>
</svelte:head>

<div class="app">
  <aside class="sidebar" data-testid="sidebar" aria-label="Filters and totals">
    <FilterBar
      orientation="vertical"
      filter={store.filter}
      counts={store.counts}
      onchange={(f) => store.setFilter(f)}
    />
    <Footer
      activeCount={store.counts.active}
      completedCount={store.counts.completed}
      onclear={() => store.clearCompleted()}
    />
  </aside>

  <main class="main">
    <header class="head">
      <h1>Tauri Todo</h1>
    </header>

    <div class="inline-filters">
      <FilterBar filter={store.filter} counts={store.counts} onchange={(f) => store.setFilter(f)} />
    </div>

    <div class="scroll">
      <TodoList
        todos={store.filtered}
        filter={store.filter}
        loading={store.loading}
        ontoggle={(id) => store.toggle(id)}
        onrename={(id, title) => store.rename(id, title)}
        ondelete={(id) => store.remove(id)}
      />
    </div>

    <div class="inline-footer">
      <Footer
        activeCount={store.counts.active}
        completedCount={store.counts.completed}
        onclear={() => store.clearCompleted()}
      />
    </div>

    <div class="dock">
      <TodoInput onsubmit={(title) => store.add(title)} />
    </div>
  </main>
</div>

<ErrorToast error={store.error} ondismiss={() => store.dismissError()} />

<style>
  .app {
    min-height: 100dvh;
  }

  .sidebar {
    display: none;
  }

  .main {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: var(--surface);
  }

  .head {
    padding: max(1.25rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) 0.75rem
      max(1rem, env(safe-area-inset-left));
  }

  h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 750;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .inline-filters {
    padding: 0 max(1rem, env(safe-area-inset-right)) 0.75rem max(1rem, env(safe-area-inset-left));
  }

  .scroll {
    flex: 1;
    padding-inline: max(0.75rem, env(safe-area-inset-left)) max(0.75rem, env(safe-area-inset-right));
  }

  .inline-footer {
    padding: 0.25rem max(1rem, env(safe-area-inset-right)) 0.25rem
      max(1rem, env(safe-area-inset-left));
  }

  /* Input stays reachable by thumb: sticky to the bottom, clear of the home indicator. */
  .dock {
    position: sticky;
    bottom: 0;
    padding: 0.75rem max(1rem, env(safe-area-inset-right))
      calc(0.75rem + env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
    border-top: 1px solid var(--line);
    background: var(--surface);
  }

  /* Tablet portrait: a centered card. */
  @media (min-width: 640px) {
    .app {
      display: grid;
      place-items: start center;
      padding: 2.5rem 1.5rem;
    }

    .main {
      width: min(100%, 40rem);
      min-height: min(48rem, calc(100dvh - 5rem));
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: var(--shadow);
      overflow: clip;
    }

    .dock {
      padding-bottom: 0.75rem;
    }
  }

  /* Desktop: filters and totals move into a sidebar, the list takes the main pane. */
  @media (min-width: 1024px) {
    .app {
      grid-template-columns: 17rem minmax(0, 40rem);
      justify-content: center;
      gap: 2rem;
    }

    .sidebar {
      position: sticky;
      top: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding-top: 5.75rem;
    }

    .inline-filters,
    .inline-footer {
      display: none;
    }
  }
</style>
