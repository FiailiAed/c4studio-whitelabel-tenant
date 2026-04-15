import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/astro/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import TaskItem from "./TaskItem";
import CreateInvoiceModal from "./CreateInvoiceModal";

type Task = {
  _id: Id<"tasks">;
  title: string;
  status: "todo" | "pending" | "done";
  createdAt: number;
  createdBy: string;
  clientId: Id<"clients">;
  resources?: { label: string; url: string }[];
};

type Client = {
  _id: Id<"clients">;
  name: string;
  abbrev: string;
  themeColor: string;
  stripeCustomerId?: string;
  tasks: Task[];
};

interface Props {
  client: Client;
  tenantId: string;
  tenantSlug: string;
  filter: "all" | "todo" | "pending" | "done";
}

export default function ClientCard({ client, tenantId, tenantSlug, filter }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const { userId } = useAuth();
  const createTask = useMutation(api.tasks.createTask);

  const visibleTasks =
    filter === "all"
      ? client.tasks
      : client.tasks.filter((t) => t.status === filter);

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const title = inputRef.current?.value.trim();
    if (!title || !userId) return;
    inputRef.current!.value = "";
    await createTask({
      clientId: client._id,
      title,
      createdBy: userId,
    });
  }

  return (
    <div className="flex flex-col rounded-lg bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 stripe-shadow dark:stripe-shadow-dark overflow-hidden">
      {/* Card header band */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs text-white shrink-0"
            style={{ backgroundColor: client.themeColor }}
          >
            {client.abbrev}
          </span>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
            {client.name}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {client.stripeCustomerId && (
            <button
              type="button"
              onClick={() => setInvoiceOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              aria-label="Create invoice"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Invoice
            </button>
          )}
          <a
            href={`/t/${tenantSlug}/client/${client._id}`}
            className="flex items-center justify-center size-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="View client detail"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </a>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 p-4 space-y-3 min-h-[80px]">
        {visibleTasks.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
            {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
          </p>
        ) : (
          visibleTasks.map((task) => (
            <TaskItem key={task._id} task={task} tenantId={tenantId} />
          ))
        )}
      </div>

      {/* Inline task input */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add task… (Enter)"
          onKeyDown={handleKeyDown}
          className="w-full text-xs px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-slate-200 dark:focus:border-slate-700 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors"
        />
      </div>

      {client.stripeCustomerId && (
        <CreateInvoiceModal
          client={client}
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
        />
      )}
    </div>
  );
}
