import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createTicket, fetchUsers } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TICKET_CATEGORIES = [
  "BUG",
  "FEATURE_REQUEST",
  "SUPPORT",
  "BILLING",
  "OTHER",
] as const;

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "BUG", label: "Bug" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "SUPPORT", label: "Support" },
  { value: "BILLING", label: "Billing" },
  { value: "OTHER", label: "Other" },
] as const;

const createTicketSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or fewer"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or fewer"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  category: z.enum(TICKET_CATEGORIES),
  assignedToId: z.string().optional(),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

/**
 * Create-ticket form — react-hook-form + zod, matching the create-user-form
 * field markup pattern. The assigned-to dropdown is populated from the crew
 * roster (filtered to active users). On success the user is sent back to the
 * dashboard.
 */
export function CreateTicketForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "MEDIUM",
      category: "SUPPORT",
      assignedToId: "",
    },
  });

  // Fetch active crew members for the assigned-to dropdown.
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const activeUsers = (usersData?.users ?? []).filter(
    (u) => !u.deletedAt,
  );

  const onSubmit = async (values: CreateTicketValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      // Only send assignedToId if a user was actually selected.
      const payload = {
        ...values,
        assignedToId: values.assignedToId || undefined,
      };
      await createTicket(payload);
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate("/tickets", { replace: true });
    } catch (err) {
      let message = "Failed to create ticket.";
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data &&
        typeof (err.response.data as Record<string, unknown>).error === "string"
      ) {
        message = (err.response.data as Record<string, string>).error;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectClass =
    "h-8 w-full rounded-lg border border-[#E4E1D7] bg-white px-2.5 text-sm text-[#16150F] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full flex-col gap-5"
    >
      {serverError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="Brief summary of the issue"
          aria-invalid={errors.subject ? "true" : undefined}
          {...register("subject")}
        />
        {errors.subject && (
          <p className="text-xs text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={5}
          placeholder="Provide details about the issue or request…"
          aria-invalid={errors.description ? "true" : undefined}
          className="w-full rounded-lg border border-[#E4E1D7] bg-white px-2.5 py-2 text-sm text-[#16150F] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            {...register("priority")}
            className={selectClass}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.priority && (
            <p className="text-xs text-destructive">
              {errors.priority.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            {...register("category")}
            className={selectClass}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assignedToId">Assign to</Label>
        <select
          id="assignedToId"
          {...register("assignedToId")}
          className={selectClass}
        >
          <option value="">Unassigned</option>
          {activeUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>
        {errors.assignedToId && (
          <p className="text-xs text-destructive">
            {errors.assignedToId.message}
          </p>
        )}
      </div>

      <div className="mt-1 flex items-center gap-3">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Submitting…" : "Open ticket"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/", { replace: true })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
