"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, SlidersHorizontal } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string;
  nowrap?: boolean;
  render: (row: T, index: number) => React.ReactNode;
  emphasize?: boolean;
  sortable?: boolean;
  sortValue?: (row: T) => number | string;
}

export default function RankedTable<T>({
  columns,
  rows,
  keyFn,
  onRowClick,
  emptyMessage,
  showRank = true,
  rankLabel = "#",
  selectedKey,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: React.ReactNode;
  showRank?: boolean;
  rankLabel?: string;
  selectedKey?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable && !col.sortValue) return;
    if (sortKey === col.key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDirection("desc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;

    const getValue = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[col.key] as number | string);

    return [...rows].sort((a, b) => {
      const valA = getValue(a);
      const valB = getValue(b);

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? "").toLowerCase();
      const strB = String(valB ?? "").toLowerCase();
      return sortDirection === "asc"
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [rows, sortKey, sortDirection, columns]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/70 py-12 px-4 text-center shadow-xs">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-panel2 border border-line text-muted mb-2.5">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div className="text-xs text-muted max-w-[260px]">
          {emptyMessage ?? "No locations found matching your filter."}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line/80 bg-panel shadow-[0_2px_12px_-2px_rgba(27,29,34,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse table-fixed">
          <colgroup>
            {showRank && <col style={{ width: "38px" }} />}
            {columns.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
            {Boolean(onRowClick) && <col style={{ width: "22px" }} />}
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 border-b border-line/90 bg-panel/95 backdrop-blur-md">
              {showRank && (
                <th
                  title="Rank position"
                  className="py-2.5 pl-3 pr-1 text-left text-[10px] font-bold uppercase tracking-wider text-muted/70 align-middle"
                >
                  {rankLabel}
                </th>
              )}
              {columns.map((col) => {
                const isSortable = Boolean(col.sortable || col.sortValue);
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    title={col.label}
                    onClick={() => isSortable && handleHeaderClick(col)}
                    className={`py-2.5 px-2 text-[10px] font-bold uppercase tracking-wider select-none align-middle transition-colors ${
                      col.nowrap ? "truncate" : "break-words"
                    } ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${
                      isSortable
                        ? "cursor-pointer text-muted hover:text-ink hover:bg-panel2/40"
                        : "text-muted"
                    } ${isSorted ? "text-copperSoft font-extrabold" : ""}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{col.label}</span>
                      {isSortable && (
                        <span className="shrink-0 text-muted/60">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-copperSoft" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-copperSoft" />
                            )
                          ) : (
                            <ArrowUpDown className="h-2.5 w-2.5 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
              {Boolean(onRowClick) && (
                <th className="py-2.5 pr-2.5 pl-0 text-right align-middle text-[10px] text-muted/40">
                  <span className="sr-only">Inspect</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {sortedRows.map((row, idx) => {
              const rank = idx + 1;
              const rowKey = keyFn(row);
              const isSelected = selectedKey ? selectedKey === rowKey : false;

              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={`group relative transition-all duration-150 ${
                    onRowClick
                      ? "cursor-pointer hover:bg-amber-500/[0.045] focus:outline-none focus:bg-amber-500/[0.06]"
                      : ""
                  } ${
                    isSelected
                      ? "bg-amber-500/[0.08] shadow-[inset_3px_0_0_0_#C9A227]"
                      : idx % 2 === 1
                      ? "bg-panel2/[0.18]"
                      : "bg-panel"
                  }`}
                >
                  {showRank && (
                    <td className="py-2.5 pl-3 pr-1 align-middle whitespace-nowrap">
                      {rank === 1 ? (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-b from-amber-400/25 to-amber-500/10 text-amber-900 border border-amber-500/40 text-[10px] font-extrabold shadow-xs"
                          title="Rank #1 Highest Priority"
                        >
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-b from-slate-200/90 to-slate-300/40 text-slate-800 border border-slate-300 text-[10px] font-bold shadow-xs"
                          title="Rank #2 Priority"
                        >
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-b from-amber-700/15 to-amber-800/10 text-amber-900 border border-amber-700/30 text-[10px] font-bold shadow-xs"
                          title="Rank #3 Priority"
                        >
                          3
                        </span>
                      ) : (
                        <span className="inline-block w-5 text-center font-mono text-[10px] font-semibold text-muted/70">
                          {rank < 10 ? `0${rank}` : rank}
                        </span>
                      )}
                    </td>
                  )}

                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-2 align-middle leading-snug ${
                        col.nowrap ? "truncate" : "break-words"
                      } ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${
                        col.emphasize ? "text-copperSoft font-semibold" : "text-ink"
                      }`}
                    >
                      {col.render(row, idx)}
                    </td>
                  ))}

                  {Boolean(onRowClick) && (
                    <td className="py-2.5 pr-2.5 pl-0 align-middle text-right whitespace-nowrap">
                      <ChevronRight className="inline-block h-3.5 w-3.5 text-muted/30 group-hover:text-copper group-hover:translate-x-0.5 transition-all duration-150" />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
