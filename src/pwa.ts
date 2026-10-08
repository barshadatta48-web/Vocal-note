export type PWAUpdateHandlers = {
  onOffline?: () => void;
  onOnline?: () => void;
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
};

let registration: ServiceWorkerRegistration | null = null;
let isRegistering = false;

export function registerPWA(handlers: PWAUpdateHandlers = {}) {
  try {
    if (typeof window === 'undefined') {
      console.warn('[PWA] Window is undefined, skipping registration.');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.info('[PWA] ServiceWorker API is not available on navigator.');
      return;
    }

    if (registration) {
      console.log('[PWA] Service worker is already registered with scope:', registration.scope);
      return;
    }

    if (isRegistering) {
      console.log('[PWA] Registration already in progress. Skipping duplicate invocation.');
      return;
    }

    isRegistering = true;
    console.log('[PWA] Starting service worker registration for /sw.js...');

    const update = () => {
      try {
        if (navigator.onLine) {
          console.log('[PWA] Connectivity status: online');
          handlers.onOnline?.();
        } else {
          console.log('[PWA] Connectivity status: offline');
          handlers.onOffline?.();
        }
      } catch (err) {
        console.warn('[PWA] Error in online/offline callback:', err);
      }
    };

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const initSW = async () => {
      try {
        console.log('[PWA] Calling navigator.serviceWorker.register("/sw.js", { scope: "/" })...');
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        registration = reg;
        isRegistering = false;
        console.log('[PWA] Registration successful! Scope:', reg.scope, {
          active: !!reg.active,
          installing: !!reg.installing,
          waiting: !!reg.waiting,
        });

        const notifyUpdate = () => {
          if (reg.waiting) {
            console.log('[PWA] A waiting service worker is ready to activate.');
            handlers.onUpdateAvailable?.(reg);
          }
        };

        notifyUpdate();

        reg.addEventListener('updatefound', () => {
          console.log('[PWA] New service worker version found (installing)...');
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            console.log('[PWA] Installing worker state changed to:', worker.state);
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New worker installed and waiting.');
              notifyUpdate();
            }
          });
        });

        // Periodic check for deployed updates
        window.setInterval(() => {
          if (navigator.onLine) {
            console.log('[PWA] Periodic check for service worker update...');
            reg.update().catch((err) => console.warn('[PWA] Periodic update check failed:', err));
          }
        }, 5 * 60 * 1000);
      } catch (error) {
        isRegistering = false;
        console.error('[PWA Error Boundary] navigator.serviceWorker.register failed:', error);
        console.info('[PWA Error Boundary] Application shell continues rendering unaffected.');
      }
    };

    if (document.readyState === 'complete') {
      void initSW();
    } else {
      window.addEventListener('load', () => void initSW(), { once: true });
    }
  } catch (outerError) {
    isRegistering = false;
    console.error('[PWA Error Boundary] Uncaught exception in registerPWA:', outerError);
  }
}

export function activatePWAUpdate() {
  try {
    if (!registration?.waiting) return;

    console.log('[PWA] Activating waiting service worker...');
    const waitingWorker = registration.waiting;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });

    window.setTimeout(reload, 3000);
  } catch (err) {
    console.error('[PWA] Error activating update:', err);
  }
}
