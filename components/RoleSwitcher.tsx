"use client";

import { Role } from "@/lib/types";

const OPTIONS: { key: Role; label: string }[] = [
  { key: "operator", label: "Operator" },
  { key: "government", label: "Government" },
  { key: "fleet", label: "Fleet" },
];

export default function RoleSwitcher({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-panel2/60 p-1">
      {OPTIONS.map((opt) => {
        const active = opt.key === role;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
              active
                ? "bg-panel text-ink font-medium shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
