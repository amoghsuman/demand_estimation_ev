"use client";

import { Role } from "@/lib/types";

const OPTIONS: { key: Role; label: string }[] = [
  { key: "operator", label: "Charging operator" },
  { key: "government", label: "Government & policy" },
  { key: "fleet", label: "Fleet & OEM" },
];

export default function RoleSwitcher({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted mb-1">Viewing as</span>
      <div className="flex flex-col">
        {OPTIONS.map((opt) => {
          const active = opt.key === role;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={`text-left px-0 py-2 border-b border-line text-sm transition-colors ${
                active ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <span className="flex items-center justify-between">
                {opt.label}
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-copper inline-block" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
