<script lang="ts">
  import type { AppError } from '#lib/types.ts';

  let { error, ondismiss }: { error: AppError | null; ondismiss: () => void } = $props();
</script>

<div class="region">
  {#if error}
    <div class="toast" role="alert">
      <p>{error.message}</p>
      <button type="button" onclick={ondismiss}>Dismiss</button>
    </div>
  {/if}
</div>

<style>
  .region {
    position: fixed;
    inset-inline: 0;
    top: max(0.75rem, env(safe-area-inset-top));
    z-index: 10;
    display: flex;
    justify-content: center;
    padding-inline: max(1rem, env(safe-area-inset-left)) max(1rem, env(safe-area-inset-right));
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 32rem;
    padding: 0.25rem 0.25rem 0.25rem 1rem;
    border: 1px solid var(--danger);
    border-radius: var(--radius-sm);
    background: var(--danger-wash);
    color: var(--ink);
    box-shadow: var(--shadow);
    pointer-events: auto;
    animation: drop 0.18s ease-out;
  }

  p {
    margin: 0;
  }

  button {
    flex: none;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0 0.75rem;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--danger);
    font-weight: 600;
  }

  button:hover {
    text-decoration: underline;
  }

  @keyframes drop {
    from {
      transform: translateY(-0.5rem);
      opacity: 0;
    }
  }
</style>
