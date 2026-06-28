import { CreateTicketForm } from "@/components/create-ticket-form";
import { ArrowLeft, TicketPlus } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Create-ticket page — a dispatch-board card on the warm-paper surface shared
 * with the crew roster. The monospace eyebrow and ink-blue accent tie the
 * pages together.
 */
export function CreateTicketPage() {
  return (
    <main className="crew flex-1 bg-[#F7F6F1] text-[#16150F]">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        {/* Back link */}
        <Link
          to="/tickets"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6B6860] transition-colors hover:text-[#1E3A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30 focus-visible:ring-offset-2 rounded"
        >
          <ArrowLeft className="size-3.5" />
          Back to blotter
        </Link>

        {/* Eyebrow */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#1E3A5F]">
            Dispatch
          </span>
          <span className="h-3 w-px bg-[#E4E1D7]" />
          <span className="font-mono text-xs text-[#6B6860]">
            new ticket
          </span>
        </div>

        <p className="mb-8 max-w-lg text-2xl font-light leading-snug tracking-tight text-[#16150F]">
          Open a new ticket. Describe the issue, set the priority, and
          optionally assign it to a crew member.
        </p>

        {/* Form card */}
        <div className="rounded-xl border border-[#E4E1D7] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-[#E8EEF5] text-[#1E3A5F]">
              <TicketPlus className="size-3.5" />
            </span>
            <h2 className="text-base font-medium tracking-tight text-[#16150F]">
              Ticket details
            </h2>
          </div>
          <CreateTicketForm />
        </div>
      </div>
    </main>
  );
}
