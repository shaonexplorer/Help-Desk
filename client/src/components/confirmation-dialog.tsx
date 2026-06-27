import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ConfirmationDialogProps {
  /** Whether the dialog is visible. The parent owns this state. */
  open: boolean;
  /** Called when the user cancels (clicks Cancel, backdrop, or presses Escape). */
  onCancel: () => void;
  /** Called when the user confirms the action. */
  onConfirm: () => void;
  /** The dialog title. Keep it short — one line. */
  title: string;
  /** The body. A string is rendered as a paragraph; a ReactNode lets you
   *  interpolate values (e.g. a bolded user name). */
  children: ReactNode;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Tone of the confirm button. Defaults to "destructive". */
  confirmVariant?: "default" | "destructive";
  /** When true, the confirm button is disabled (e.g. during a pending API call). */
  confirmPending?: boolean;
}

/**
 * A small, self-contained confirmation dialog. Renders as a centered overlay
 * with a backdrop. The parent owns `open` and the confirm/cancel callbacks —
 * this component has no internal state beyond focus management.
 *
 * Usage:
 *   <ConfirmationDialog
 *     open={showDeleteDialog}
 *     onCancel={() => setShowDeleteDialog(false)}
 *     onConfirm={handleDelete}
 *     title="Delete this user?"
 *   >
 *     This soft-deletes <strong>{user.name}</strong>. They won't be able to
 *     sign in again, but the record is retained for audit.
 *   </ConfirmationDialog>
 */
export function ConfirmationDialog({
  open,
  onCancel,
  onConfirm,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  confirmPending = false,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape. (Backdrop click is handled by the backdrop's own
  // onClick — that way clicks inside the dialog don't bubble up and close it.)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // Move focus into the dialog on open so screen readers announce it, and
  // restore focus to the previously focused element on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 mx-4 w-full max-w-md rounded-xl border border-[#E4E1D7] bg-white p-0 shadow-2xl outline-none"
        style={{ animation: "fade-in 0.15s ease-out both" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <h2 className="text-base font-medium tracking-tight text-[#16150F]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            title="Close"
            className="grid size-7 shrink-0 place-items-center rounded-md text-[#6B6860] transition-colors hover:bg-[#F7F6F1] hover:text-[#16150F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-5 pb-2 pt-3 text-sm leading-relaxed text-[#6B6860]">
          {children}
        </div>
        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E4E1D7] px-5 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            disabled={confirmPending}
          >
            {confirmPending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
