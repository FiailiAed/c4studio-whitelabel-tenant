import { useState, useEffect, useCallback } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@lib/convex";
import Sidebar from "./Sidebar";
import ClientBoard from "./ClientBoard";
import AddClientModal from "./AddClientModal";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type Filter = "all" | "todo" | "pending" | "done";

interface Props {
  tenantId: string;
  tenantSlug: string;
}

function BoardInner({ tenantId, tenantSlug }: Props) {
  const [filter, setFilter] = useState<Filter>(() => {
    if (typeof window === "undefined") return "all";
    const p = new URLSearchParams(window.location.search).get("filter");
    return (p as Filter) || "all";
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });

  const [modalOpen, setModalOpen] = useState(false);

  // Sync filter + search to URL without page reload
  const syncToUrl = useCallback((f: Filter, q: string) => {
    const params = new URLSearchParams(window.location.search);
    if (f === "all") {
      params.delete("filter");
    } else {
      params.set("filter", f);
    }
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  function handleFilterChange(f: Filter) {
    setFilter(f);
    syncToUrl(f, searchQuery);
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    syncToUrl(filter, q);
  }

  // Restore state on back/forward navigation
  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      setFilter((params.get("filter") as Filter) || "all");
      setSearchQuery(params.get("q") ?? "");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Derive task counts from board query for sidebar
  const board = useQuery(api.board.getBoard, {
    tenantId: tenantId as Id<"tenants">,
  });

  const taskCounts = {
    all: board?.reduce((sum, c) => sum + c.tasks.length, 0) ?? 0,
    todo: board?.reduce((sum, c) => sum + c.tasks.filter((t) => t.status === "todo").length, 0) ?? 0,
    pending: board?.reduce((sum, c) => sum + c.tasks.filter((t) => t.status === "pending").length, 0) ?? 0,
    done: board?.reduce((sum, c) => sum + c.tasks.filter((t) => t.status === "done").length, 0) ?? 0,
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-57px)]">
      <Sidebar
        filter={filter}
        onFilterChange={handleFilterChange}
        taskCounts={taskCounts}
        onAddClient={() => setModalOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Search bar */}
        <div className="shrink-0 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search clients…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]/50 focus:border-[#635bff] transition-colors"
            />
          </div>
        </div>

        <ClientBoard
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          filter={filter}
          searchQuery={searchQuery}
        />
      </div>

      <AddClientModal
        tenantId={tenantId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

export default function BoardApp({ tenantId, tenantSlug }: Props) {
  return (
    <ConvexProvider client={convex}>
      <BoardInner tenantId={tenantId} tenantSlug={tenantSlug} />
    </ConvexProvider>
  );
}
