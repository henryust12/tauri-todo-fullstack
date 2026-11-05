import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FilterBar from './FilterBar.svelte';

describe('FilterBar', () => {
  it('marks the current filter and reports a switch', async () => {
    const onchange = vi.fn();
    render(FilterBar, {
      props: { filter: 'all', counts: { all: 3, active: 2, completed: 1 }, onchange }
    });

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'false');

    await fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(onchange).toHaveBeenCalledWith('completed');
  });
});
