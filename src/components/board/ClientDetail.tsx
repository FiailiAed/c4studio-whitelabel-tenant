import { ConvexProvider, useQuery } from "convex/react";
import { convex } from "@lib/convex";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type Status = "todo" | "pending" | "done";

const STATUS_LABEL: Record<Status, string> = {
  todo: "To Do",
  pending: "Pending",
  done: "Done",
};

const STATUS_STYLES: Record<Status, string> = {
  todo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  done: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

interface Props {
  clientId: string;
}

function ClientDetailInner({ clientId }: Props) {
  const client = useQuery(api.clients.getClient, {
    clientId: clientId as Id<"clients">,
  });
  const tasks = useQuery(api.clients.listClientTasks, {
    clientId: clientId as Id<"clients">,
  });
  const invoices = useQuery(api.clients.listClientInvoices, {
    clientId: clientId as Id<"clients">,
  });

  if (client === undefined || tasks === undefined || invoices === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="size-8 rounded-full border-2 border-[#635bff] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-slate-500 dark:text-slate-400">Client not found.</p>
      </div>
    );
  }

  const taskCounts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* Client header */}
      <div className="flex items-center gap-4">
        <span
          className="inline-flex items-center justify-center size-12 rounded-xl text-white text-lg font-bold shrink-0"
          style={{ backgroundColor: client.themeColor }}
        >
          {client.abbrev}
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {client.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{taskCounts.todo} to do</span>
            <span>·</span>
            <span className="text-amber-500">{taskCounts.pending} pending</span>
            <span>·</span>
            <span className="text-emerald-500">{taskCounts.done} done</span>
          </div>
        </div>
      </div>

      {/* Task history */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Task History
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${STATUS_STYLES[task.status]}`}
                >
                  {STATUS_LABEL[task.status]}
                </span>
                <span
                  className={`flex-1 text-sm ${
                    task.status === "done"
                      ? "line-through text-slate-400 dark:text-slate-500"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {task.title}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invoice history */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Invoice History
        </h2>
        {!client.stripeCustomerId ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No Stripe customer linked to this client.
          </p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No paid invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800"
              >
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                  Paid
                </span>
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {(invoice.amountPaid / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: invoice.currency.toUpperCase(),
                  })}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(invoice.paidAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ClientDetail({ clientId }: Props) {
  return (
    <ConvexProvider client={convex}>
      <ClientDetailInner clientId={clientId} />
    </ConvexProvider>
  );
}
