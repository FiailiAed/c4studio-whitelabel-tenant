import { useState, useEffect, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type TaskStatus = "todo" | "pending" | "done";

type Task = {
  _id: Id<"tasks">;
  title: string;
  status: TaskStatus;
  clientId: Id<"clients">;
  createdAt: number;
  createdBy: string;
  resources?: { label: string; url: string }[];
};

interface Props {
  task: Task;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; dotClass: string }[] = [
  { value: "todo", label: "To Do", dotClass: "bg-slate-400" },
  { value: "pending", label: "Pending", dotClass: "bg-amber-400" },
  { value: "done", label: "Done", dotClass: "bg-emerald-400" },
];

export default function TaskEditModal({ task, tenantId, open, onOpenChange }: Props) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [resources, setResources] = useState<{ label: string; url: string }[]>(
    task.resources ?? [],
  );
  const [submitting, setSubmitting] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setStatus(task.status);
    setResources(task.resources ?? []);
  }, [task._id, task.title, task.status, task.resources]);

  const updateTask = useMutation(api.tasks.updateTask);
  const updateStatus = useMutation(api.tasks.updateStatus).withOptimisticUpdate(
    (localStore, args) => {
      const board = localStore.getQuery(api.board.getBoard, {
        tenantId: tenantId as Id<"tenants">,
      });
      if (board === undefined) return;
      localStore.setQuery(
        api.board.getBoard,
        { tenantId: tenantId as Id<"tenants"> },
        board.map((client) => ({
          ...client,
          tasks: client.tasks.map((t) =>
            t._id === args.taskId ? { ...t, status: args.status } : t,
          ),
        })),
      );
    },
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await updateTask({ taskId: task._id, title: title.trim(), resources });
      if (status !== task.status) {
        await updateStatus({ taskId: task._id, status });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  function addResource() {
    setResources((prev) => [...prev, { label: "", url: "" }]);
  }

  function updateResource(index: number, field: "label" | "url", value: string) {
    setResources((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function removeResource(index: number) {
    setResources((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <VisuallyHidden>
            <Dialog.Title>Edit Task</Dialog.Title>
          </VisuallyHidden>

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Edit Task
            </h2>
            <Dialog.Close className="flex items-center justify-center size-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]/50 focus:border-[#635bff]"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Status
              </label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(({ value, label, dotClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      status === value
                        ? "bg-[#635bff]/10 border-[#635bff]/30 text-[#635bff] dark:text-[#7a73ff]"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Resources
              </label>
              <div className="space-y-2">
                {resources.map((resource, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={resource.label}
                      onChange={(e) => updateResource(index, "label", e.target.value)}
                      placeholder="Label"
                      className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]/50 focus:border-[#635bff]"
                    />
                    <input
                      type="url"
                      value={resource.url}
                      onChange={(e) => updateResource(index, "url", e.target.value)}
                      placeholder="https://…"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]/50 focus:border-[#635bff]"
                    />
                    <button
                      type="button"
                      onClick={() => removeResource(index)}
                      className="flex items-center justify-center size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                      aria-label="Remove resource"
                    >
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addResource}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#635bff] dark:text-[#7a73ff] hover:underline"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Resource
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Dialog.Close className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-[#635bff] hover:bg-[#5249d5] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
