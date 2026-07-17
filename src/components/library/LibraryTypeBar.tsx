"use client";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "favorites", label: "★ Favorites", favorite: true },
  { id: "counters", label: "Counters", counter: true },
  { id: "play", label: "Plays" },
  { id: "drill", label: "Drills" },
  { id: "playbook", label: "Playbooks" },
] as const;

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export function LibraryTypeBar({ active, onChange }: Props) {
  return (
    <div className="fd-filter-type-bar org-filter-type-bar" id="fd-filter-type-bar">
      <div className="org-filter-bar-type">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`org-filter-chip org-filter-type${
              f.id === "favorites" ? " org-filter-favorites" : ""
            }${f.id === "counters" ? " org-filter-counters" : ""}${
              active === f.id ? " active" : ""
            }`}
            data-type={f.id}
            onClick={() => onChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
