// Shows Bolingo reminder notifications and opens the app when tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "Bolingo", body: "Time for a lesson!", icon: "/mascots/bongo.svg" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* non-JSON payload: keep the default text */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon,
      tag: "bolingo-reminder",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => "focus" in client);
      if (open) return open.focus();
      return self.clients.openWindow("/learn");
    }),
  );
});
