import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TodoItem from './TodoItem.svelte';
import { makeTodo } from '../testing/fake-api';

function setup(overrides = {}) {
  const props = {
    todo: makeTodo({ id: 't1', title: 'Buy milk' }),
    ontoggle: vi.fn(),
    onrename: vi.fn(),
    ondelete: vi.fn(),
    ...overrides
  };
  render(TodoItem, { props });
  return props;
}

const editField = () => screen.getByRole('textbox', { name: 'Edit task title' });

describe('TodoItem', () => {
  it('toggles through the checkbox', async () => {
    const props = setup();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Buy milk' }));
    expect(props.ontoggle).toHaveBeenCalledWith('t1');
  });

  it('enters edit mode on double-click, the edit button and Enter', async () => {
    setup();
    await fireEvent.dblClick(screen.getByText('Buy milk'));
    expect(editField()).toHaveValue('Buy milk');
    await fireEvent.keyDown(editField(), { key: 'Escape' });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
    expect(editField()).toBeInTheDocument();
    await fireEvent.keyDown(editField(), { key: 'Escape' });

    await fireEvent.keyDown(screen.getByRole('button', { name: /^Buy milk$/ }), { key: 'Enter' });
    expect(editField()).toBeInTheDocument();
  });

  it('saves a trimmed title on Enter', async () => {
    const props = setup();
    await fireEvent.dblClick(screen.getByText('Buy milk'));
    await fireEvent.input(editField(), { target: { value: '  Buy oat milk ' } });
    await fireEvent.keyDown(editField(), { key: 'Enter' });
    expect(props.onrename).toHaveBeenCalledWith('t1', 'Buy oat milk');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('saves on blur', async () => {
    const props = setup();
    await fireEvent.dblClick(screen.getByText('Buy milk'));
    await fireEvent.input(editField(), { target: { value: 'Buy tea' } });
    await fireEvent.blur(editField());
    expect(props.onrename).toHaveBeenCalledWith('t1', 'Buy tea');
  });

  it('cancels on Escape without saving, even if blur follows', async () => {
    const props = setup();
    await fireEvent.dblClick(screen.getByText('Buy milk'));
    await fireEvent.input(editField(), { target: { value: 'Something else' } });
    const field = editField();
    await fireEvent.keyDown(field, { key: 'Escape' });
    await fireEvent.blur(field);
    expect(props.onrename).not.toHaveBeenCalled();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  it('does not rename when the title is unchanged', async () => {
    const props = setup();
    await fireEvent.dblClick(screen.getByText('Buy milk'));
    await fireEvent.keyDown(editField(), { key: 'Enter' });
    expect(props.onrename).not.toHaveBeenCalled();
    expect(props.ondelete).not.toHaveBeenCalled();
  });

  it('deletes without a confirm prompt when the title is saved empty', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const props = setup();
    await fireEvent.dblClick(screen.getByText('Buy milk'));
    await fireEvent.input(editField(), { target: { value: '   ' } });
    await fireEvent.keyDown(editField(), { key: 'Enter' });
    expect(props.ondelete).toHaveBeenCalledWith('t1');
    expect(props.onrename).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('deletes through the delete button', async () => {
    const props = setup();
    await fireEvent.click(screen.getByRole('button', { name: 'Delete Buy milk' }));
    expect(props.ondelete).toHaveBeenCalledWith('t1');
  });
});
