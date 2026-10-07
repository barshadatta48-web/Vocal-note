export type PWAUpdateHandlers = {
  onOffline?: () => void;
  onOnline?: () => void;
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
};

let registration: ServiceWorkerRegistration | null = null;

export function registerPWA(handlers: PWAUpdateHandlers = {}) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const update = () => {
    if (navigator.onLine) handlers.onOnline?.();
    else handlers.onOffline?.();
  };

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;

        const notifyUpdate = () => {
          if (reg.waiting) handlers.onUpdateAvailable?.(reg);
        };

        notifyUpdate();
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate();
            }
          });
        });

        // Check regularly so an installed PWA picks up deployed changes promptly.
        window.setInterval(() => {
          if (navigator.onLine) void reg.update();
        }, 5 * 60 * 1000);
      })
      .catch((error) => {
        console.error('Vocal Note service worker registration failed:', error);
      });
  });
}

export function activatePWAUpdate() {
  if (!registration?.waiting) return;

  const waitingWorker = registration.waiting;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });

  const reload = () => window.location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });

  // Safety fallback if the browser does not emit controllerchange promptly.
  window.setTimeout(reload, 3000);
}
