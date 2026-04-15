import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import ClientCard from "./ClientCard";

type Filter = "all" | "todo" | "pending" | "done";

interface Props {
  tenantId: string;
  tenantSlug: string;
  filter: Filter;
  searchQuery: string;
}

export default function ClientBoard({ tenantId, tenantSlug, filter, searchQuery }: Props) {
  const board = useQuery(api.board.getBoard, {
    tenantId: tenantId as Id<"tenants">,
  });

  if (board === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-[#635bff] border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading board…</p>
        </div>
      </div>
    );
  }

  const q = searchQuery.toLowerCase();
  const visibleClients = board.filter((client) => {
    if (q && !client.name.toLowerCase().includes(q)) return false;
    if (filter === "all") return true;
    return client.tasks.some((t) => t.status === filter);
  });

  if (board.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <svg className="size-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No clients yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Add your first client using the button in the sidebar
          </p>
        </div>
      </div>
    );
  }

  if (visibleClients.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No matches</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Try a different filter or search term
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4 md:p-6">
        {visibleClients.map((client) => (
          <ClientCard
            key={client._id}
            client={client}
            tenantId={tenantId}
            tenantSlug={tenantSlug}
            filter={filter}
          />
        ))}
      </div>
    </div>
  );
}
