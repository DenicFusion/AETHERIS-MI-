import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SessionSecurityContextType {
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: () => void;
}

const SessionSecurityContext = createContext<SessionSecurityContextType | undefined>(undefined);

export function SessionSecurityProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  const checkIntervalRef = useRef<any>(null);

  const updateActivity = () => {
    if (!user) return;
    localStorage.setItem('aetheris_last_active', Date.now().toString());
  };

  useEffect(() => {
    if (!user) {
      localStorage.removeItem('aetheris_last_active');
      return;
    }

    // Initial inactivity check for an existing active session
    const lastActiveStr = localStorage.getItem('aetheris_last_active');
    if (lastActiveStr) {
      const elapsed = Date.now() - parseInt(lastActiveStr, 10);
      if (elapsed > INACTIVITY_TIMEOUT) {
        localStorage.removeItem('aetheris_last_active');
        logout().then(() => {
          toast.error("Session expired due to inactivity. Please sign in to continue.");
        });
        return;
      }
    } else {
      updateActivity();
    }

    // Activity events
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleEvent = () => updateActivity();

    events.forEach(event => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    // Inactivity interval check
    checkIntervalRef.current = setInterval(() => {
      const lastActive = localStorage.getItem('aetheris_last_active');
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed > INACTIVITY_TIMEOUT) {
          localStorage.removeItem('aetheris_last_active');
          logout().then(() => {
            toast.error("Session expired due to inactivity. Please sign in to continue.");
          });
        }
      }
    }, 10000); // Check every 10s

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, logout]);

  return (
    <SessionSecurityContext.Provider value={{
      isLocked: false,
      lockApp: () => {},
      unlockApp: () => {}
    }}>
      {children}
    </SessionSecurityContext.Provider>
  );
}

export function useSessionSecurity() {
  const context = useContext(SessionSecurityContext);
  if (context === undefined) {
    throw new Error("useSessionSecurity must be used within a SessionSecurityProvider");
  }
  return context;
}
