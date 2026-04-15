import { useState } from "react";
import type { Id } from "@convex/_generated/dataModel";
import TaskEditModal from "./TaskEditModal";

type Task = {
  _id: Id<"tasks">;
  title: string;
  status: "todo" | "pending" | "done";
  createdAt: number;
  createdBy: string;
  clientId: Id<"clients">;
  resources?: { label: string; url: string }[];
};

interface Props {
  task: Task;
  tenantId: string;
}

const STATUS_STYLES: Record<Task["status"], string> = {
  todo: "bg-slate-400",
  pending: "bg-amber-400",
  done: "bg-emerald-400",
};

export default function TaskItem({ task, tenantId }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setEditOpen(true)}
          className="w-full flex items-start gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md px-1 py-0.5 -mx-1 transition-colors group"
        >
          <span
            className={`shrink-0 size-2 rounded-full mt-1 transition-colors ${STATUS_STYLES[task.status]}`}
            aria-hidden="true"
          />
          <span
            className={`text-xs flex-1 leading-relaxed ${
              task.status === "done"
                ? "line-through text-slate-400 dark:text-slate-500"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {task.title}
          </span>
        </button>

        {task.resources && task.resources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-4">
            {task.resources.map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-[#635bff] dark:text-[#7a73ff] underline hover:no-underline truncate max-w-[160px]"
              >
                {resource.label || resource.url}
              </a>
            ))}
          </div>
        )}
      </div>

      <TaskEditModal
        task={task}
        tenantId={tenantId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
