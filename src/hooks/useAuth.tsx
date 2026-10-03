import { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Per-origin session backup cookie.
// IMPORTANT: the session is NOT shared across subdomains. Each host (each mentor
// subdomain, app., admin.) keeps its own session, exactly like localStorage does.
// A single apex-wide cookie used to be written here, which made different logins
// (student on mentor-a, mentor on app.) overwrite each other's refresh token and
// randomly log people out. The cookie now only acts as a same-host backup in case
// localStorage gets evicted (Safari / PWA / private mode).
const COOKIE_PREFIX = "ebdaey-auth";

function getCookieName(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "ebdaey.com" || host.endsWith(".ebdaey.com")) {
    return `${COOKIE_PREFIX}_${host.replace(/[^a-z0-9]/gi, "_")}`;
  }
  return null;
}

function clearLegacySharedCookie() {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  if (host !== "ebdaey.com" && !host.endsWith(".ebdaey.com")) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_PREFIX}=; domain=.ebdaey.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
}

function writeSharedSessionCookie(session: Session | null) {
  const name = getCookieName();
  if (!name) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (!session) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
    return;
  }
  try {
    const payload = encodeURIComponent(
      JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token })
    );
    // 30 days
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `${name}=${payload}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

function readSharedSessionCookie(): { access_token: string; refresh_token: string } | null {
  if (typeof document === "undefined") return null;
  const name = getCookieName();
  if (!name) return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.substring(name.length + 1));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.access_token === "string" && typeof parsed.refresh_token === "string") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSessionResolved = useRef(false);
  const intentionalSignOut = useRef(false);
  const recoveringSession = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Drop the old apex-wide cookie so stale/foreign tokens can't resurrect.
    clearLegacySharedCookie();

    const applyAuthState = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      writeSharedSessionCookie(nextSession);
    };

    // Restore from the same-host backup cookie if localStorage has no session yet.
    const hydrateFromSharedCookie = async () => {
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) return existing;
      const shared = readSharedSessionCookie();
      if (!shared) return null;
      const { data, error } = await supabase.auth.setSession(shared);
      if (error) return null;
      return data.session;
    };


    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        // If there's no local session, attempt cross-subdomain hydration before finalising.
        if (!session) {
          hydrateFromSharedCookie().then((restored) => {
            if (cancelled) return;
            applyAuthState(restored ?? null);
            initialSessionResolved.current = true;
            setLoading(false);
          });
          return;
        }
        applyAuthState(session);
        initialSessionResolved.current = true;
        setLoading(false);
        return;
      }

      if (!initialSessionResolved.current) return;

      if (event === 'SIGNED_OUT') {
        if (intentionalSignOut.current) {
          applyAuthState(null);
          setLoading(false);
          return;
        }

        // Token refreshes can race across ebdaey.com subdomains. Before
        // showing a signed-out screen, recover from the newest shared cookie.
        if (!recoveringSession.current) {
          recoveringSession.current = true;
          setLoading(true);
          hydrateFromSharedCookie().then((restored) => {
            if (cancelled) return;
            applyAuthState(restored ?? null);
            recoveringSession.current = false;
            setLoading(false);
          });
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session) applyAuthState(session);
        setLoading(false);
      }
    });

    // Fallback in case INITIAL_SESSION doesn't fire
    const timeout = setTimeout(() => {
      if (!initialSessionResolved.current) {
        hydrateFromSharedCookie().then((restored) => {
          if (cancelled) return;
          applyAuthState(restored ?? null);
          initialSessionResolved.current = true;
          setLoading(false);
        });
      }
    }, 3000);

    // When a backgrounded tab / installed app wakes up, its access token is often
    // expired and the auto-refresh timer was suspended. Revalidate instead of
    // letting the UI fall through to the "sign in again" screen.
    const revalidate = () => {
      if (document.visibilityState !== "visible") return;
      if (!initialSessionResolved.current || intentionalSignOut.current) return;
      hydrateFromSharedCookie().then((restored) => {
        if (cancelled || !restored) return;
        applyAuthState(restored);
      });
    };
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("online", revalidate);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("online", revalidate);
    };

  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const emailRedirectTo = metadata?.role === "mentor"
      ? `${window.location.origin}/auth?resume=1`
      : window.location.origin;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    intentionalSignOut.current = true;
    try {
      await supabase.auth.signOut();
      writeSharedSessionCookie(null);
      setSession(null);
      setUser(null);
    } finally {
      intentionalSignOut.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
