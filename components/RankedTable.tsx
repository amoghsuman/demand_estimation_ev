export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  emphasize?: boolean;
}

export default function RankedTable<T>({
  columns,
  rows,
  keyFn,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string;
}) {
  return (
    <div className="overflow-y-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`sticky top-0 bg-panel text-xs font-normal text-muted pb-2 pt-1 ${
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
            <tr key={keyFn(row)} className="border-t border-line">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2.5 ${col.align === "right" ? "text-right" : "text-left"} ${
                    col.emphasize ? "text-copper font-medium" : "text-ink"
                  }`}
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
