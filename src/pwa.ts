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

        // Check periodically for a newer service worker while the app is open.
        window.setInterval(() => {
          if (navigator.onLine) void reg.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('Vocal Note service worker registration failed:', error);
      });
  });
}

export function activatePWAUpdate() {
  if (!registration?.waiting) return;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  window.location.reload();
}
