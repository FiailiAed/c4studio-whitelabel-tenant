import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface Props {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddClientModal({ tenantId, open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [abbrev, setAbbrev] = useState("");
  const [themeColor, setThemeColor] = useState("#635bff");
  const [submitting, setSubmitting] = useState(false);

  const createClient = useMutation(api.clients.createClient);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !abbrev.trim()) return;
    setSubmitting(true);
    try {
      await createClient({
        tenantId: tenantId as Id<"tenants">,
        name: name.trim(),
        abbrev: abbrev.trim().toUpperCase().slice(0, 4),
        themeColor,
      });
      setName("");
      setAbbrev("");
      setThemeColor("#635bff");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <VisuallyHidden>
            <Dialog.Title>Add New Client</Dialog.Title>
          </VisuallyHidden>

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Add New Client
            </h2>
            <Dialog.Close className="flex items-center justify-center size-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Client Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]/50 focus:border-[#635bff]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Abbreviation <span className="text-slate-400">(max 4 chars)</span>
              </label>
              <input
                type="text"
                value={abbrev}
                onChange={(e) => setAbbrev(e.target.value.slice(0, 4))}
                placeholder="ACM"
                maxLength={4}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]/50 focus:border-[#635bff] font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Theme Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="size-9 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  placeholder="#635bff"
                  pattern="^#[0-9a-fA-F]{6}$"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]/50 focus:border-[#635bff] font-mono"
                />
                <span
                  className="size-9 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700"
                  style={{ backgroundColor: themeColor }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Dialog.Close className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting || !name.trim() || !abbrev.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-[#635bff] hover:bg-[#5249d5] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Adding…" : "Add Client"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
