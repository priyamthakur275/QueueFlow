import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper px-4 py-10">
      <Link to="/" className="mx-auto mb-10 flex items-center gap-2.5">
        <span aria-hidden className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 font-bold text-white">Q</span>
        <span className="font-display text-lg font-semibold text-ink-900">QueueFlow</span>
      </Link>
      <main className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
      </main>
    </div>
  );
}
