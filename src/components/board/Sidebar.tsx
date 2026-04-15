import type { ReactNode } from "react";

type Filter = "all" | "todo" | "pending" | "done";

interface TaskCounts {
  all: number;
  todo: number;
  pending: number;
  done: number;
}

interface Props {
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  taskCounts: TaskCounts;
  onAddClient: () => void;
}

const FILTERS: { key: Filter; label: string; dotClass: string; icon: ReactNode }[] = [
  {
    key: "all",
    label: "All Tasks",
    dotClass: "bg-slate-300 dark:bg-slate-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    ),
  },
  {
    key: "todo",
    label: "To Do",
    dotClass: "bg-slate-400",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    key: "pending",
    label: "Pending",
    dotClass: "bg-amber-400",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    key: "done",
    label: "Done",
    dotClass: "bg-emerald-400",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    ),
  },
];

export default function Sidebar({
  filter,
  onFilterChange,
  taskCounts,
  onAddClient,
}: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#f7f9fc] dark:bg-[#111827] h-full">
        <div className="flex flex-col gap-0.5 p-3 flex-1">
          <p className="px-3 pt-1 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Views
          </p>
          {FILTERS.map(({ key, label, icon }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                onClick={() => onFilterChange(key)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                  isActive
                    ? "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-700 text-slate-700 dark:text-slate-200"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <svg
                  className={`size-4 shrink-0 ${isActive ? "text-[#635bff] dark:text-[#7a73ff]" : "text-slate-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {icon}
                </svg>
                <span className="flex-1">{label}</span>
                <span
                  className={`text-xs tabular-nums ${
                    isActive
                      ? "text-[#635bff] dark:text-[#7a73ff]"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {taskCounts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onAddClient}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#635bff] hover:bg-[#5249d5] text-white text-sm font-medium transition-colors"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Client
          </button>
        </div>
      </aside>

      {/* Mobile filter strip */}
      <div className="flex md:hidden items-center gap-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-[#f7f9fc] dark:bg-[#111827] overflow-x-auto shrink-0">
        {FILTERS.map(({ key, label, dotClass }) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-white dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-slate-700 text-slate-700 dark:text-slate-200"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
              {label}
              <span className="opacity-60">{taskCounts[key]}</span>
            </button>
          );
        })}
        <div className="ml-auto shrink-0">
          <button
            onClick={onAddClient}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#635bff] text-white text-xs font-medium"
          >
            <svg className="size-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Client
          </button>
        </div>
      </div>
    </>
  );
}
