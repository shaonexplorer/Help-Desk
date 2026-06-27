import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z
    .string()
    .email('Enter a valid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If the user was redirected here from a protected route, send them back there.
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await authClient.signIn.email(
        { email: values.email, password: values.password },
        {
          onSuccess: () => {
            // useSession() re-fetches automatically; ProtectedRoute will
            // see the new user and render the dashboard.
            navigate(from, { replace: true });
          },
          onError: (ctx) => {
            // BetterFetchError has no `code`; the server's message is in
            // ctx.error.error (the parsed JSON body { error: "..." }).
            const body = ctx.error.error as { error?: string } | undefined;
            const message =
              (typeof body?.error === "string" && body.error) ||
              (typeof ctx.error?.message === "string" && ctx.error.message) ||
              "Something went wrong.";
            setServerError(message);
          },
        },
      );
    } catch (err) {
      // signIn only throws on network failure; API errors come through onError.
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-5">
      {serverError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={errors.email ? 'true' : undefined}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          <a
            href="#"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Forgot?
          </a>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={errors.password ? 'true' : undefined}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" disabled={isLoading} className="mt-1 w-full">
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
