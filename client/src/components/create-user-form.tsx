import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const createUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or fewer"),
  role: z.enum(["ADMIN", "AGENT"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

/**
 * Create-user form — react-hook-form + zod, matching the login-form field
 * markup pattern. On success the users query is invalidated so the roster
 * refetches, and the user is sent back to the crew page.
 */
export function CreateUserForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "AGENT" },
  });

  const onSubmit = async (values: CreateUserValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await createUser(values);
      // Invalidate the cached roster so the new member appears.
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users", { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Failed to create user.",
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={errors.password ? "true" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
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

      <div className="mt-1 flex items-center gap-3">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Creating…" : "Create member"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/users", { replace: true })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
