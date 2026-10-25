import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api";
import { useSession } from "../session";

const TABS = [
  { to: "account", label: "Account" },
  { to: "courses", label: "Courses" },
  { to: "schools", label: "Schools" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav aria-label="Settings" className="flex gap-2 md:w-48 md:flex-col">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2 text-sm font-extrabold ${
                isActive
                  ? "bg-duo-blue/15 text-duo-blue"
                  : "text-duo-muted hover:bg-white hover:text-duo-ink"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function ReminderToggle() {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    void navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setEnabled(Boolean(sub));
    });
  }, [supported]);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notifications are blocked in your browser settings.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { public_key } = await api.pushPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });
      await api.pushSubscribe(sub.toJSON());
      setEnabled(true);
      setMessage("Reminders are on.");
    } catch (err) {
      setMessage((err as Error).message || "Could not turn on reminders.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api.pushUnsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMessage("Reminders are off.");
    } catch (err) {
      setMessage((err as Error).message || "Could not turn off reminders.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-duo-border pt-4">
      <p className="text-sm font-extrabold text-duo-ink">Practice reminders</p>
      <p className="mt-1 text-xs text-duo-muted">
        Bongo and friends nudge you when you have been away for a couple of days.
      </p>
      {supported ? (
        <button
          type="button"
          onClick={() => void (enabled ? disable() : enable())}
          disabled={busy}
          className="btn btn-green mt-3 disabled:opacity-50"
        >
          {enabled ? "Turn reminders off" : "Turn reminders on"}
        </button>
      ) : (
        <p className="mt-2 text-xs font-semibold text-duo-muted">
          Your browser does not support push reminders.
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs font-semibold text-duo-muted">
          {message}
        </p>
      )}
    </div>
  );
}

export function AccountSettings() {
  const { user } = useSession();
  return (
    <section className="rounded-2xl border border-duo-border bg-white p-5">
      <h2 className="text-lg font-extrabold text-duo-ink">Account</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-duo-muted">Email</dt>
          <dd className="font-bold text-duo-ink">{user?.email}</dd>
        </div>
        <div>
          <dt className="font-semibold text-duo-muted">Joined</dt>
          <dd className="font-bold text-duo-ink">
            {user ? new Date(user.created_at).toLocaleDateString() : ""}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-duo-muted">XP</dt>
          <dd className="font-bold text-duo-ink">{user?.xp ?? 0}</dd>
        </div>
        <div>
          <dt className="font-semibold text-duo-muted">Gems</dt>
          <dd className="font-bold text-duo-ink">{user?.gems ?? 0}</dd>
        </div>
      </dl>
      <ReminderToggle />
    </section>
  );
}

export function CoursesSettings() {
  return (
    <section className="rounded-2xl border border-duo-border bg-white p-5">
      <h2 className="text-lg font-extrabold text-duo-ink">Courses</h2>
      <p className="mt-2 text-sm text-duo-muted">
        Open the Learn page to continue a course. Each completed lesson earns gems, and gems unlock the next level.
      </p>
    </section>
  );
}

export function SchoolsSettings() {
  return (
    <section className="rounded-2xl border border-duo-border bg-white p-5">
      <h2 className="text-lg font-extrabold text-duo-ink">Schools</h2>
      <p className="mt-2 text-sm font-semibold text-duo-muted">Coming soon.</p>
    </section>
  );
}
