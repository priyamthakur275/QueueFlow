import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { NotificationBell } from "./NotificationBell";
import { Wayzen } from "./Wayzen";
import type { UserRole } from "../types";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}
interface NavGroup {
  label?: string;
  items: NavItem[];
}

const explore: NavGroup = {
  label: "Find a place",
  items: [
    { to: "/hospitals", label: "Hospitals" },
    { to: "/shops", label: "Shops" },
    { to: "/hotels", label: "Hotels" },
  ],
};

function navFor(role: UserRole | null): NavGroup[] {
  if (role === null) return [explore];
  const mine: NavGroup = {
    items: [
      { to: "/dashboard", label: "Overview" },
      { to: "/bookings", label: "My bookings" },
      { to: "/notifications", label: "Notifications" },
    ],
  };
  const walkIn: NavGroup = {
    label: "Walk-in queues",
    items: [
      { to: "/services", label: "Join a queue" },
      { to: "/my-ticket", label: "My ticket" },
    ],
  };
  const groups = [mine, explore, walkIn];
  if (role === "STAFF" || role === "ADMIN") {
    groups.push({
      label: "Staff",
      items: [
        { to: "/staff/venues", label: "Venue queues" },
        { to: "/staff/queues", label: "Walk-in queues" },
        { to: "/staff/analytics", label: "Analytics" },
      ],
    });
  }
  if (role === "ADMIN") {
    groups.push({
      label: "Administration",
      items: [
        { to: "/admin/venues", label: "Venues" },
        { to: "/admin/users", label: "People" },
        { to: "/admin/knowledge", label: "Wayzen knowledge" },
      ],
    });
  }
  groups.push({ items: [{ to: "/profile", label: "Profile & security" }] });
  return groups;
}

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {groups.map((group, i) => (
        <div key={group.label || i}>
          {group.label && <p className="mb-1.5 px-3 text-xs font-medium text-ink-400">{group.label}</p>}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                  ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"}`}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-3">
      <span aria-hidden className="font-display flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">Q</span>
      <span className="font-display text-base font-semibold text-ink-900">QueueFlow</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode; variant?: "customer" | "staff" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = navFor(user?.role ?? null);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const account = user ? (
    <div className="border-t border-ink-100 pt-4">
      <p className="truncate px-3 text-sm font-medium text-ink-800">{user.full_name}</p>
      <p className="truncate px-3 text-xs text-ink-400">{user.email}</p>
      <button onClick={handleLogout} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-800">
        Log out
      </button>
    </div>
  ) : (
    <div className="flex flex-col gap-2 border-t border-ink-100 pt-4">
      <Link to="/login" className="rounded-lg bg-ink-900 px-3 py-2 text-center text-sm font-medium text-white">Sign in</Link>
      <Link to="/register" className="rounded-lg px-3 py-2 text-center text-sm font-medium text-ink-600 hover:bg-ink-50">Create account</Link>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-ink-100 bg-white px-3 py-6 lg:flex">
        <Brand />
        <div className="flex-1"><NavLinks groups={groups} /></div>
        {account}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-100 bg-white/95 px-4 py-3 backdrop-blur lg:justify-end lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}
              className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm font-medium text-ink-700">Menu</button>
            <Brand />
          </div>
          {user ? <NotificationBell /> : <Link to="/login" className="text-sm font-medium text-ink-700">Sign in</Link>}
        </header>
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-ink-950/40" onClick={() => setMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 overflow-y-auto bg-white px-3 py-5">
              <div className="flex items-center justify-between"><Brand />
                <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="px-3 text-xl text-ink-400">×</button>
              </div>
              <div className="flex-1"><NavLinks groups={groups} onNavigate={() => setMenuOpen(false)} /></div>
              {account}
            </div>
          </div>
        )}
        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <Wayzen />
    </div>
  );
}
