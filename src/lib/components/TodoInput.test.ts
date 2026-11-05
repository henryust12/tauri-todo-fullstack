import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TodoInput from './TodoInput.svelte';

function setup() {
  const onsubmit = vi.fn();
  render(TodoInput, { props: { onsubmit } });
  return { onsubmit, input: screen.getByLabelText('New task') as HTMLInputElement };
}

describe('TodoInput', () => {
  it('submits the trimmed title and clears the field', async () => {
    const { onsubmit, input } = setup();
    await fireEvent.input(input, { target: { value: '  Write tests  ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onsubmit).toHaveBeenCalledWith('Write tests');
    expect(input.value).toBe('');
  });

  it('ignores whitespace-only input and disables the button', async () => {
    const { onsubmit, input } = setup();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.submit(input.closest('form')!);
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('caps the field at 200 characters and shows a counter near the limit', async () => {
    const { input } = setup();
    expect(input).toHaveAttribute('maxlength', '200');
    expect(screen.queryByText(/\/200$/)).not.toBeInTheDocument();
    await fireEvent.input(input, { target: { value: 'x'.repeat(185) } });
    expect(screen.getByText('185/200')).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription('185/200');
  });
});
