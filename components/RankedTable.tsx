export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: string;
  render: (row: T) => React.ReactNode;
  emphasize?: boolean;
}

export default function RankedTable<T>({
  columns,
  rows,
  keyFn,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-y-auto">
      <table className="w-full text-[13px] border-collapse table-fixed">
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th
                key={col.key}
                title={col.label}
                className={`sticky top-0 bg-panel text-[13px] font-medium text-muted leading-tight break-words pb-2.5 pt-1 px-2 first:pl-0 last:pr-0 align-bottom ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyFn(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-line ${
                onRowClick ? "cursor-pointer hover:bg-panel2/50" : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-2 first:pl-0 last:pr-0 leading-snug break-words ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${col.emphasize ? "text-copperSoft font-semibold" : "text-ink"}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
