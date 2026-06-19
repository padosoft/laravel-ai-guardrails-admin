import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from '../../../resources/js/components/DataTable';

interface Row {
  id: number;
  name: string;
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name' },
];

const rows: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];

describe('DataTable keyboard activation', () => {
  it('Enter key activates a clickable row', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} onRowClick={onRowClick} />);

    const user = userEvent.setup();
    const tableRows = screen.getAllByTestId('agr-table-row');
    tableRows[0].focus();
    await user.keyboard('{Enter}');

    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('Space key activates a clickable row', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} onRowClick={onRowClick} />);

    const user = userEvent.setup();
    const tableRows = screen.getAllByTestId('agr-table-row');
    tableRows[1].focus();
    await user.keyboard(' ');

    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it('Space key does not activate row when no onRowClick provided', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} />);

    const user = userEvent.setup();
    const tableRows = screen.getAllByTestId('agr-table-row');
    tableRows[0].focus();
    await user.keyboard(' ');

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
