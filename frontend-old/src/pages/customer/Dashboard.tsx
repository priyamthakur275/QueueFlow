import { kindMeta } from "../../lib/kinds";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { ErrorState, Skeleton } from "../../components/States";
import { TokenStub } from "../../components/TokenStub";
import { PageHeader } from "../../components/ui";
import { api, extractErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useRealtime } from "../../lib/realtime";
import type { Booking, Reservation, VenueKind } from "../../types";
import { BookingRow, ReservationRow } from "../bookings/MyBookings";

const PLACES: { kind: VenueKind; line: string }[] = [
  { kind: "HOSPITAL", line: "Doctor consultations with a queue token" },
  { kind: "SHOP", line: "Salons, repairs and consultations" },
  { kind: "HOTEL", line: "Rooms with the price shown upfront" },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { subscribeBookings } = useRealtime();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => subscribeBookings(() => setRevision((r) => r + 1)), [subscribeBookings]);
  useEffect(() => {
    Promise.all([api.get<Booking[]>("/api/bookings"), api.get<Reservation[]>("/api/reservations")])
      .then(([b, r]) => { setBookings(b.data); setReservations(r.data); setError(null); })
      .catch((e) => setError(extractErrorMessage(e)));
  }, [revision]);

  const next = bookings?.[0];
  const firstName = user?.full_name.split(" ")[0];

  return (
    <AppShell>
      <PageHeader title={`Hello, ${firstName}`} description="Your next visit and everything you've booked." />
      {error && <ErrorState message={error} />}
      {!bookings && !error && <Skeleton className="h-48" />}
      {next && (
        <section className="mb-10">
          <h2 className="mb-3 text-base font-semibold text-ink-900">Next appointment</h2>
          <Link to={`/bookings/${next.reference}`} className="block rounded-2xl focus-visible:outline-2">
            <TokenStub booking={next} />
          </Link>
        </section>
      )}
      {bookings && bookings.length === 0 && (
        <section className="mb-10 rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-8">
          <h2 className="text-lg font-semibold text-ink-900">No upcoming appointments</h2>
          <p className="mt-1 text-sm text-ink-500">When you book, your queue token and live position show up here.</p>
        </section>
      )}
      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold text-ink-900">Book something</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLACES.map(({ kind, line }) => {
            const meta = kindMeta[kind];
            return (
              <Link key={kind} to={meta.path} className={`rounded-2xl px-5 py-5 transition-colors ${meta.tint} hover:brightness-[0.98]`}>
                <p className={`font-display text-lg font-semibold ${meta.text}`}>{meta.plural}</p>
                <p className="mt-1 text-sm text-ink-600">{line}</p>
              </Link>
            );
          })}
        </div>
      </section>
      {bookings && bookings.length > 1 && (
        <section className="mb-10">
          <h2 className="mb-3 text-base font-semibold text-ink-900">Later appointments</h2>
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {bookings.slice(1, 5).map((b) => <BookingRow key={b.id} booking={b} />)}
          </ul>
        </section>
      )}
      {!!reservations?.length && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">Upcoming stays</h2>
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {reservations.slice(0, 4).map((r) => <ReservationRow key={r.id} reservation={r} />)}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
