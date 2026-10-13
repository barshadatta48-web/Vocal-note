import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const PUBLIC_ROUTES = ['/login', '/signup', '/landing'] as const;

export type PublicRoute = typeof PUBLIC_ROUTES[number];

export interface RouterContextType {
  currentPath: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  isPublicRoute: (path?: string) => boolean;
  resetRouteToLogin: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

// Normalize path: strip trailing slash, ensure leading slash
export const normalizePath = (path: string): string => {
  if (!path) return '/';
  const clean = path.split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean || '/';
};

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/';
  });

  // Listen to browser popstate (back / forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const normalized = normalizePath(window.location.pathname);
      setCurrentPath(normalized);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const targetPath = normalizePath(to);
    
    // Prevent redundant state updates if already on the requested route
    setCurrentPath((prev) => {
      if (prev === targetPath) return prev;

      if (typeof window !== 'undefined') {
        try {
          if (options?.replace) {
            window.history.replaceState({ path: targetPath }, '', targetPath);
          } else {
            window.history.pushState({ path: targetPath }, '', targetPath);
          }
        } catch (e) {
          console.warn('[Router] Failed to push state to history:', e);
        }
      }

      return targetPath;
    });
  }, []);

  const isPublicRoute = useCallback((pathToCheck?: string) => {
    const path = normalizePath(pathToCheck ?? currentPath);
    return PUBLIC_ROUTES.some((pub) => path === pub || path.startsWith(pub));
  }, [currentPath]);

  const resetRouteToLogin = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({ path: '/login' }, '', '/login');
      } catch (e) {
        console.warn('[Router] Failed to reset history:', e);
      }
    }
    setCurrentPath('/login');
  }, []);

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        navigate,
        isPublicRoute,
        resetRouteToLogin,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useAppRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useAppRouter must be used within a RouterProvider');
  }
  return context;
};
