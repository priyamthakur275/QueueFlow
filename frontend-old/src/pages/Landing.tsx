import { kindMeta } from "../lib/kinds";
import { Link, Navigate } from "react-router-dom";
import { homeFor, useAuth } from "../lib/auth";
import {} from "../components/ui";
import type { VenueKind } from "../types";

const PLACES: { kind: VenueKind; title: string; body: string }[] = [
  { kind: "HOSPITAL", title: "See a doctor without the waiting room",
    body: "Choose a specialization and doctor, pick a real free slot, and get a token. We'll tell you when your turn is about 20 minutes away." },
  { kind: "SHOP", title: "Book the chair, not the queue",
    body: "Salons, repair desks and consultations. Pick who you want, see how long the service takes, and track your place on the day." },
  { kind: "HOTEL", title: "Know the total before you reserve",
    body: "Live room availability for your dates, with nightly rate, taxes and cancellation terms calculated upfront." },
];

export default function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to={homeFor(user)} replace />;
  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span aria-hidden className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 font-bold text-white">Q</span>
          <span className="font-display text-lg font-semibold">QueueFlow</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link to="/hospitals" className="hidden rounded-lg px-3 py-2 text-ink-600 hover:text-ink-900 sm:inline">Browse</Link>
          <Link to="/login" className="rounded-lg px-3 py-2 text-ink-700 hover:bg-white">Sign in</Link>
          <Link to="/register" className="rounded-lg bg-ink-900 px-4 py-2 text-white hover:bg-ink-800">Create account</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-16">
          <div>
            <h1 className="text-4xl font-semibold leading-[1.05] md:text-6xl">Wait less. Know exactly when it's your turn.</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-600">
              Book hospital consultations and shop services with a queue token that updates live, and reserve hotel rooms with the final price shown before you confirm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/hospitals" className="rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800">Find a hospital</Link>
              <Link to="/shops" className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-sm font-semibold hover:border-ink-400">Shops</Link>
              <Link to="/hotels" className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-sm font-semibold hover:border-ink-400">Hotels</Link>
            </div>
          </div>
          <figure aria-label="Example of a QueueFlow token" className="relative">
            <div className="stub mx-auto max-w-md rotate-[-2deg] shadow-[0_30px_60px_-30px_rgba(20,23,31,0.35)]" style={{ ["--stub-cut" as string]: "58%" }}>
              <div className="grid grid-cols-[58%_42%]">
                <div className="space-y-3 p-6">
                  <p className="text-xs text-ink-400">Example ticket</p>
                  <p className="font-display text-xl font-semibold">Cardiology consultation</p>
                  <p className="text-sm text-ink-500">Thursday, 10:40 am</p>
                  <p className="text-sm text-ink-600">3 ahead of you, about 25 min to go</p>
                </div>
                <div className="stub-divider flex flex-col justify-center gap-1 bg-paper-dim/50 p-6">
                  <p className="text-xs text-ink-500">Your token</p>
                  <p className="token-display font-display text-5xl font-bold">C-014</p>
                  <p className="mt-2 text-xs text-ink-500">Now serving <span className="font-semibold text-ink-900">C-011</span></p>
                </div>
              </div>
            </div>
            <figcaption className="mt-8 text-center text-sm text-ink-500">
              When your turn is about 20 minutes away: <span className="font-medium text-ink-800">"Your appointment is approaching. Please be ready."</span>
            </figcaption>
          </figure>
        </section>

        <section className="border-t border-ink-100 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-3 md:px-8">
            {PLACES.map(({ kind, title, body }) => {
              const meta = kindMeta[kind];
              return (
                <div key={kind}>
                  <p className={`text-sm font-semibold ${meta.text}`}>{meta.plural}</p>
                  <h2 className="mt-2 text-xl font-semibold">{title}</h2>
                  <p className="mt-2 text-ink-600">{body}</p>
                  <Link to={meta.path} className={`mt-4 inline-block text-sm font-semibold underline ${meta.text}`}>Browse {meta.plural.toLowerCase()}</Link>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="grid gap-8 rounded-3xl bg-ink-900 p-8 text-white md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Ask Wayzen</h2>
              <p className="mt-3 max-w-2xl text-ink-200">
                QueueFlow's assistant answers questions from our help articles and venue details, cites where each answer came from, and can line up a booking for you to confirm. It never books anything without your OK, and it doesn't give medical advice.
              </p>
            </div>
            <Link to="/register" className="rounded-xl bg-serving px-5 py-3 text-center text-sm font-semibold text-ink-900">Create a free account</Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-ink-100 px-4 py-8 text-center text-sm text-ink-500">
        QueueFlow. Venues marked Sample are demonstrations, not real businesses.
      </footer>
    </div>
  );
}
