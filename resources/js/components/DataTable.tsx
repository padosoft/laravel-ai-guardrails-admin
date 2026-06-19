import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T extends { id: number | string }> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  rowTestId?: string;
}

export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  onRowClick,
  rowTestId = 'agr-table-row',
}: DataTableProps<T>) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={col.align === 'right' ? 'right' : ''}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              data-testid={rowTestId}
              className={onRowClick ? 'clickable' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter') onRowClick(row);
                    }
                  : undefined
              }
            >
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'right' : ''}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
