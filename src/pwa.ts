export type PWAUpdateHandlers = {
  onOffline?: () => void;
  onOnline?: () => void;
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
};

let registration: ServiceWorkerRegistration | null = null;
let isRegistering = false;

export function registerPWA(handlers: PWAUpdateHandlers = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (registration || isRegistering) return;
  isRegistering = true;

  const update = () => {
    if (navigator.onLine) handlers.onOnline?.();
    else handlers.onOffline?.();
  };

  window.addEventListener('online', update);
  window.addEventListener('offline', update);

  const initSW = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
        isRegistering = false;

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

        // Check periodically so an installed PWA picks up deployed updates promptly
        window.setInterval(() => {
          if (navigator.onLine) void reg.update().catch(() => {});
        }, 5 * 60 * 1000);
      })
      .catch((error) => {
        isRegistering = false;
        console.warn('Vocal Note service worker registration note:', error);
      });
  };

  if (document.readyState === 'complete') {
    initSW();
  } else {
    window.addEventListener('load', initSW, { once: true });
  }
}

export function activatePWAUpdate() {
  if (!registration?.waiting) return;

  const waitingWorker = registration.waiting;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });

  const reload = () => window.location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });

  window.setTimeout(reload, 3000);
}
