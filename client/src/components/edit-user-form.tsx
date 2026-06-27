import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateUser, type RosterUser } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const editUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer")
    .optional(),
  email: z
    .string()
    .email("Enter a valid email address")
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or fewer")
    .optional()
    .or(z.literal("")),
  role: z.enum(["ADMIN", "AGENT"]).optional(),
});

type EditUserValues = z.infer<typeof editUserSchema>;

type EditUserFormProps = {
  user: RosterUser;
  onSuccess: () => void;
  onCancel: () => void;
};

/**
 * Edit-user form — react-hook-form + zod, pre-populated from the existing
 * roster entry. All fields are optional; only changed fields are sent. On
 * success the users query is invalidates so the roster refetches, and the
 * parent closes the panel via onSuccess.
 */
export function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user.name ?? "",
      email: user.email,
      password: "",
      role: user.role,
    },
  });

  const onSubmit = async (values: EditUserValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      // Strip empty password so the server treats it as "no change".
      const payload: Record<string, unknown> = {};
      if (values.name !== undefined && values.name !== "") payload.name = values.name;
      if (values.email !== undefined && values.email !== "") payload.email = values.email;
      if (values.password !== undefined && values.password !== "") payload.password = values.password;
      if (values.role !== undefined) payload.role = values.role;

      await updateUser(user.id, payload);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
    } catch (err) {
      let message = "Failed to update user.";
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

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex h-full flex-col"
    >
      {serverError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            autoComplete="name"
            placeholder="Agent name"
            aria-invalid={errors.name ? "true" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            autoComplete="email"
            placeholder="agent@company.com"
            aria-invalid={errors.email ? "true" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-password">Password</Label>
          <Input
            id="edit-password"
            type="password"
            autoComplete="new-password"
            placeholder="Leave blank to keep current"
            aria-invalid={errors.password ? "true" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-role">Role</Label>
          <select
            id="edit-role"
            {...register("role")}
            className="h-8 w-full rounded-lg border border-[#E4E1D7] bg-white px-2.5 text-sm text-[#16150F] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="AGENT">Agent</option>
            <option value="ADMIN">Admin</option>
          </select>
          {errors.role && (
            <p className="text-xs text-destructive">{errors.role.message}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
