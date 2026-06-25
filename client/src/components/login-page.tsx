import { LoginForm } from "@/components/login-form";
import { Ticket } from "lucide-react";

export function LoginPage() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <aside className="relative hidden w-[440px] shrink-0 flex-col justify-between border-r border-border/50 bg-[#0a0e1a] p-10 lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Ticket className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-sm font-medium tracking-tight text-white">
              Help Desk
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <blockquote className="text-sm leading-relaxed text-slate-400">
            &ldquo;The quiet competence of a good support tool is that you
            forget it&rsquo;s there — until you need it.&rdquo;
          </blockquote>

          <div className="flex gap-8 border-t border-white/10 pt-6">
            <div>
              <p className="text-2xl font-light tabular-nums text-white">
                99.9%
              </p>
              <p className="mt-0.5 text-xs text-slate-500">uptime</p>
            </div>
            <div>
              <p className="text-2xl font-light tabular-nums text-white">
                &lt;2m
              </p>
              <p className="mt-0.5 text-xs text-slate-500">avg. response</p>
            </div>
            <div>
              <p className="text-2xl font-light tabular-nums text-white">
                12k+
              </p>
              <p className="mt-0.5 text-xs text-slate-500">tickets resolved</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600">v0.1 — work in progress</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile brand bar */}
        <div className="mb-10 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
            <Ticket className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <span className="text-sm font-medium tracking-tight text-foreground">
            Help Desk
          </span>
        </div>

        <div
          className="w-full max-w-sm"
          style={{
            animation: "fade-in 0.5s ease-out both",
          }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-light tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your agent workspace.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Don&rsquo;t have an account?{" "}
            <a
              href="#"
              className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Request access
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
