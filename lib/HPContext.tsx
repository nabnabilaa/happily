"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

interface HPState {
  mood: string | null;
  energy: string | null;
  tag: string | null;
  intention: string;
  priorities: any[];
  feed: any[];
  goals: any[];
  habits: any[];
  surveys: any[];
  skills: any[];
  learning: any[];
  coaching: any;
  wellbeing: any;
  points: number;
  coins: number;
  notifications: number;
  rewards: any[];
  rewardHistory: any[];
  logbook: any[];
  lastActivityDate: string | null;
  penaltyActive: boolean;
  penaltyThresholdDays: number;
  workSchedule: {
    start: string;
    end: string;
    breakStart: string;
    breakEnd: string;
    midDayCheckInTime: string;
  };
  todayAttendance?: {
    checkIn?: string;
    checkOut?: string;
  };
  personalWellbeingGoal?: string;
  wellbeingRoutine?: Array<{ id: string; title: string; done: boolean }>;
  contacts: Array<{ id: string; name: string; role: string; email: string; phone: string; isPrivate?: boolean }>;
  hrData?: any;
  managerData?: any;
  onboarded?: boolean;
  focusTaskId?: number | null;
  focusProgress?: number;
  moods?: any[];
  energyOpts?: any[];
  companyValues?: string[];
  coachSuggestions?: string[];
  overtimeStatus?: string;
}

export type UserRole = 'hr' | 'manager' | 'employee';

interface HPUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  streak: number;
  points: number;
  coins: number;
  level: number;
  rank: string;
  userRole?: UserRole | null;
  avatarImage?: string;
  department?: string;
}

interface HPContextType {
  state: HPState | null;
  user: HPUser | null;
  updateState: (update: Partial<HPState> | ((prev: HPState) => HPState)) => void;
  updateUser: (update: Partial<HPUser> | ((prev: HPUser) => HPUser)) => void;
  setUserRole: (role: UserRole) => void;
  login: (userData: any) => void;
  logout: () => void;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshSurveys: () => Promise<void>;
  resetData: () => Promise<void>;
  syncSkillProgress: (source: string, amount: number) => void;
  awardXP: (actionType: string, description?: string) => Promise<void>;
  toasts: any[];
  notify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
}

const HPContext = createContext<HPContextType | undefined>(undefined);

// ── Helpers (Moved outside to keep hooks order stable) ───────────────────────
const calculateLevel = (points: number) => {
  if (points < 0) return 1;
  if (points < 1000) {
    return Math.floor(points / 100) + 1;
  }
  if (points < 4000) {
    const diff = points - 1000;
    return 11 + Math.floor(diff / 300);
  }
  const diff = points - 4000;
  return 21 + Math.floor(diff / 1000);
};

const calculateRank = (level: number) => {
  if (level <= 10) return 'E';
  if (level <= 20) return 'D';
  if (level <= 35) return 'C';
  if (level <= 50) return 'B';
  if (level <= 70) return 'A';
  return 'S';
};

// Calculate progress within current level (0.0 - 1.0)
export const calculateLevelProgress = (points: number) => {
  if (points < 0) return 0;
  if (points < 1000) {
    return (points % 100) / 100;
  }
  if (points < 4000) {
    return ((points - 1000) % 300) / 300;
  }
  return ((points - 4000) % 1000) / 1000;
};

export function HPProvider({ children }: { children: React.ReactNode }) {
  // 1. ALL STATES FIRST
  const [state, setState] = useState<HPState | null>(null);
  const [user, setUser] = useState<HPUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<any[]>([]);

  // 2. REFS
  const userRef = useRef<HPUser | null>(null);
  const skipNextSyncRef = useRef(false);
  const lastSyncedPayloadRef = useRef<string | null>(null);
  const loginInProgressRef = useRef(false); // blocks sync during user transitions
  const activeFetchDataRef = useRef<Promise<void> | null>(null);
  const activeFetchDashboardsRef = useRef<Promise<void> | null>(null);

  // 3. CALLBACKS
  const updateState = useCallback((update: Partial<HPState> | ((prev: HPState) => HPState)) => {
    setState((prev) => {
      if (!prev) return null;
      if (typeof update === "function") return update(prev);
      return { ...prev, ...update };
    });
  }, []);

  const updateUser = useCallback((update: Partial<HPUser> | ((prev: HPUser) => HPUser)) => {
    setUser((prev) => {
      if (!prev) return null;
      let next = typeof update === "function" ? update(prev) : { ...prev, ...update };
      if (next.points !== prev.points) {
        const newLevel = calculateLevel(next.points);
        const newRank = calculateRank(newLevel);
        next = { ...next, level: newLevel, rank: newRank, coins: next.points };
      }
      return next;
    });
  }, []);

  const notify = useCallback((title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async (userId: string) => {
    if (activeFetchDataRef.current) return activeFetchDataRef.current;

    const promise = (async () => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        console.warn("Browser is offline, loading state from local cache directly.");
        try {
          const cachedDataRaw = localStorage.getItem(`hp_cached_state_${userId}`);
          if (cachedDataRaw) {
            const data = JSON.parse(cachedDataRaw);
            skipNextSyncRef.current = true;
            if (data.state) {
              setState(prev => {
                const preserved: any = {};
                if (prev?.managerData) preserved.managerData = prev.managerData;
                if (prev?.hrData) preserved.hrData = prev.hrData;
                if (prev?.surveys) preserved.surveys = prev.surveys;
                if (prev?.feed) preserved.feed = prev.feed;
                return { ...data.state, ...preserved };
              });
            }
            if (data.user) {
              setUser(data.user);
            }
            console.log("Loaded state successfully from offline local cache.");
          }
        } catch (e) {
          console.error("Failed to parse local cache state:", e);
        }
        setLoading(false);
        loginInProgressRef.current = false;
        activeFetchDataRef.current = null;
        return;
      }

      try {
        const res = await fetch(`/api/storage?userId=${userId}`);
        const data = await res.json();
        if (data.error) throw new Error(`${data.error}: ${data.details || ''}`);
        
        // Cache successfully fetched data
        localStorage.setItem(`hp_cached_state_${userId}`, JSON.stringify(data));

        skipNextSyncRef.current = true;
        if (data.state) {
          // Sanitize habits to ensure 'done' status matches today's date in completedDates
          const todayReal = new Date();
          const todayStr = `${todayReal.getFullYear()}-${String(todayReal.getMonth() + 1).padStart(2, '0')}-${String(todayReal.getDate()).padStart(2, '0')}`;
          const sanitizedHabits = (data.state.habits || []).map((h: any) => {
            const done = h.completedDates ? h.completedDates.includes(todayStr) : h.done;
            return { ...h, done };
          });
          const sanitizedState = { ...data.state, habits: sanitizedHabits };

          setState(prev => {
            // Preserve dashboard data that is fetched separately and not included in synced state
            const preserved: any = {};
            if (prev?.managerData) preserved.managerData = prev.managerData;
            if (prev?.hrData) preserved.hrData = prev.hrData;
            if (prev?.surveys) preserved.surveys = prev.surveys;
            if (prev?.feed) preserved.feed = prev.feed;
            return { ...sanitizedState, ...preserved };
          });
          // Pre-fill the payload ref so we don't sync this identical data back
          const syncState: any = { ...sanitizedState };
          delete syncState.hrData;
          delete syncState.managerData;
          delete syncState.surveys;
          delete syncState.feed;
          const isHRUser = (data.user || userRef.current)?.role === 'hr' || (data.user || userRef.current)?.userRole === 'hr';
          if (!isHRUser) {
            delete syncState.rewards;
          }
          lastSyncedPayloadRef.current = JSON.stringify({ state: syncState, user: data.user || userRef.current });
        }
        else {
          setState({
            mood: null, energy: null, tag: null, intention: "",
            priorities: [], feed: [], goals: [], habits: [],
            surveys: [], skills: [], learning: [], coaching: null, wellbeing: { dims: [], programs: [] },
            points: data.user?.points || 0, coins: data.user?.points || 0, notifications: 0, 
            rewards: [], rewardHistory: [],
            logbook: [], lastActivityDate: new Date().toISOString(),
            penaltyActive: false, penaltyThresholdDays: 3,
            workSchedule: { start: "08:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00", midDayCheckInTime: "12:00" },
            contacts: [],
            onboarded: false,
            focusTaskId: null,
            focusProgress: 0,
            moods: data.state?.moods || [],
            energyOpts: data.state?.energyOpts || [],
            companyValues: data.state?.companyValues || [],
            coachSuggestions: data.state?.coachSuggestions || [],
          });
        }
        if (data.user) setUser(data.user);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        const isNetworkError = error instanceof TypeError || 
          errorMsg.toLowerCase().includes('failed to fetch') || 
          errorMsg.toLowerCase().includes('networkerror') ||
          errorMsg.toLowerCase().includes('fetch failed');

        if (isNetworkError) {
          console.warn("Failed to fetch state (network issue), falling back to local cache:", errorMsg);
        } else {
          console.error("Failed to fetch state, falling back to local cache:", errorMsg, error);
        }
        // Fallback to local storage cache
        try {
          const cachedDataRaw = localStorage.getItem(`hp_cached_state_${userId}`);
          if (cachedDataRaw) {
            const data = JSON.parse(cachedDataRaw);
            skipNextSyncRef.current = true;
            if (data.state) {
              setState(data.state);
            }
            if (data.user) {
              setUser(data.user);
            }
            console.log("Loaded state successfully from offline local cache.");
          }
        } catch (e) {
          console.error("Failed to parse local cache state:", e);
        }
      } finally {
        setLoading(false);
        loginInProgressRef.current = false; // login transition complete, safe to sync again
        activeFetchDataRef.current = null;
      }
    })();

    activeFetchDataRef.current = promise;
    return promise;
  }, []);

  const login = useCallback((userData: any) => {
    // Block auto-sync during the transition to prevent stale data overwriting the new user's DB
    loginInProgressRef.current = true;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current); // cancel any pending sync from old user
    skipNextSyncRef.current = true;
    setUser(userData);
    localStorage.setItem("hp_user_id", userData.id);
    fetchData(userData.id);
  }, [fetchData]);

  const logout = useCallback(() => {
    // Cancel any pending Google FedCM / One Tap requests BEFORE navigating
    // This prevents the "[GSI_LOGGER]: FedCM get() rejects with AbortError" console error
    if (typeof window !== "undefined") {
      try {
        const g = (window as any).google;
        if (g?.accounts?.id) {
          g.accounts.id.cancel();        // cancel pending FedCM credential requests
          g.accounts.id.disableAutoSelect(); // prevent auto-select from re-triggering
        }
      } catch (_) { /* GSI not loaded — safe to ignore */ }
    }

    localStorage.removeItem("hp_user_id");
    localStorage.setItem("hp_logout_toast", "true");
    setUser(null);
    setState(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  const fetchDashboards = useCallback(async (userId: string, role: string) => {
    if (activeFetchDashboardsRef.current) return activeFetchDashboardsRef.current;

    const promise = (async () => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        activeFetchDashboardsRef.current = null;
        return;
      }
      try {
        if (role === 'hr') {
          const res = await fetch('/api/hr/dashboard');
          const data = await res.json();
          if (data && data.metrics) {
            setState(prev => prev ? { ...prev, hrData: data } : null);
          }
        } else if (role === 'manager') {
          const res = await fetch(`/api/manager/dashboard?userId=${userId}`);
          const data = await res.json();
          setState(prev => prev ? { ...prev, managerData: data } : null);
        }
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        const isNetworkError = e instanceof TypeError || 
          errorMsg.toLowerCase().includes('failed to fetch') || 
          errorMsg.toLowerCase().includes('networkerror') ||
          errorMsg.toLowerCase().includes('fetch failed');
        if (isNetworkError) {
          console.warn("Dashboard fetch error (network issue):", errorMsg);
        } else {
          console.error("Dashboard fetch error:", e);
        }
      } finally {
        activeFetchDashboardsRef.current = null;
      }
    })();

    activeFetchDashboardsRef.current = promise;
    return promise;
  }, []);



  const setUserRole = useCallback((role: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, userRole: role };
    });
  }, []);

  const syncSkillProgress = useCallback((source: string, amount: number) => {
    setState((prev) => {
      if (!prev) return null;
      let targetSkill = "";
      const s = source.toLowerCase();
      
      // Use configurable skill mapping from global_settings if available
      const skillMapping = (prev as any)._skillMapping;
      if (skillMapping && Array.isArray(skillMapping)) {
        // skillMapping = [{ skill: "Design Systems", keywords: ["design system", "component", "token"] }, ...]
        for (const mapping of skillMapping) {
          if (mapping.keywords?.some((kw: string) => s.includes(kw.toLowerCase()))) {
            targetSkill = mapping.skill;
            break;
          }
        }
      }
      
      // Fallback: general keyword matching
      if (!targetSkill) {
        if (s.includes("design") || s.includes("component") || s.includes("token") || s.includes("figma")) targetSkill = "Design";
        else if (s.includes("user") || s.includes("research") || s.includes("insight")) targetSkill = "Research";
        else if (s.includes("prototype") || s.includes("flow") || s.includes("wireframe")) targetSkill = "Prototyping";
        else if (s.includes("lead") || s.includes("mentor") || s.includes("manage")) targetSkill = "Leadership";
        else if (s.includes("code") || s.includes("develop") || s.includes("api") || s.includes("bug")) targetSkill = "Development";
        else if (s.includes("review") || s.includes("test") || s.includes("qa")) targetSkill = "Quality";
        else if (s.includes("present") || s.includes("pitch") || s.includes("report")) targetSkill = "Communication";
        else if (s.trim().length > 0) {
          const words = s.split(' ');
          targetSkill = words[0].charAt(0).toUpperCase() + words[0].slice(1);
        } else {
          targetSkill = "General";
        }
      }

      const newSkills = [...(prev.skills || [])];
      const skillIndex = newSkills.findIndex(sk => sk.name.toLowerCase() === targetSkill.toLowerCase());
      if (skillIndex > -1) {
        newSkills[skillIndex] = { ...newSkills[skillIndex], current: Math.min(100, newSkills[skillIndex].current + amount) };
      } else {
        newSkills.push({ name: targetSkill, current: amount, target: 100 });
      }
      return { ...prev, skills: newSkills };
    });
  }, []);

  const resetData = useCallback(async () => {
    setLoading(true);
    window.location.reload();
  }, []);

  const refreshSurveys = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) return;
    try {
      const res = await fetch('/api/hr/surveys');
      const data = await res.json();
      if (data.surveys) {
        setState(prev => prev ? { ...prev, surveys: data.surveys } : null);
      }
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError || (e.message && (
        e.message.toLowerCase().includes('failed to fetch') || 
        e.message.toLowerCase().includes('networkerror') ||
        e.message.toLowerCase().includes('fetch failed')
      ));
      if (isNetworkError) {
        console.warn("Failed to refresh surveys (network issue):", e.message || e);
      } else {
        console.error("Failed to refresh surveys:", e);
      }
    }
  }, []);

  // ── Auto-refresh via Real-time Engine (Pusher with SSE Fallback) ──
  useEffect(() => {
    if (!user || !user.id) return;

    const userId = user.id;
    const activeRole = user.userRole || user.role;
    let cleanupFn = () => {};
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

    const handleRealtimeData = (data: any) => {
      if (data.type === 'refresh') {
        // Hanya refresh kalau tab sedang aktif untuk menghemat resource browser
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchData(userId);
          refreshSurveys();
          if (activeRole === 'hr' || activeRole === 'manager') {
            fetchDashboards(userId, activeRole);
          }
          // Kirim event ke komponen lain (HRPeopleScreen, dll)
          window.dispatchEvent(new Event('hp_db_update'));
          // Notify extension running on this page context
          window.postMessage({ type: "FLOWBEE_WEBSITE_UPDATE" }, "*");
        }
      } else if (data.type === 'new_message') {
        // If targeted to a specific user, ignore if not us
        if (data.targetUserId && data.targetUserId !== userId) return;

        // Cross-platform notification trigger
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(data.title || "Pesan Baru", {
              body: data.text || "Kamu mendapat pesan baru.",
              icon: "/icon-192.png"
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
              if (permission === "granted") {
                new Notification(data.title || "Pesan Baru", { body: data.text });
              }
            });
          }
        }
        // Internal UI Notification
        notify(data.title || "Pesan Baru", data.text, "info");
      }
    };

    let sseActive = false;
    let eventSourceInstance: EventSource | null = null;

    function startSSE() {
      if (sseActive) return;
      sseActive = true;
      console.log("[Realtime] Starting SSE connection fallback...");
      eventSourceInstance = new EventSource(`/api/events?userId=${userId}`);
      
      eventSourceInstance.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeData(data);
        } catch (e) {
          console.error("SSE parse error", e);
        }
      };
    }

    function stopSSE() {
      if (eventSourceInstance) {
        eventSourceInstance.close();
        eventSourceInstance = null;
      }
      sseActive = false;
      console.log("[Realtime] SSE fallback stopped.");
    }

    if (pusherKey) {
      // 1. Pusher Mode (Production/Serverless)
      import('pusher-js').then(({ default: PusherClient }) => {
        try {
          const pusher = new PusherClient(pusherKey, {
            cluster: pusherCluster,
            forceTLS: true,
          });

          // Bind connection events for runtime limit/failure detection
          pusher.connection.bind('state_change', (states: any) => {
            console.log(`[Realtime] Pusher state changed: ${states.previous} -> ${states.current}`);
            if (states.current === 'failed' || states.current === 'unavailable') {
              console.warn("[Realtime] Pusher failed/unavailable. Falling back to SSE.");
              startSSE();
            } else if (states.current === 'connected') {
              stopSSE();
            }
          });

          pusher.connection.bind('error', (err: any) => {
            console.error("[Realtime] Pusher connection error:", err);
            // 4004 is Pusher's error code for over quota / limit reached
            if (err?.error?.code === 4004 || err?.status === 403) {
              console.warn("[Realtime] Pusher limit reached or Auth error. Switching to SSE.");
              startSSE();
            }
          });

          const channelName = `user-${userId}`;
          const channel = pusher.subscribe(channelName);

          channel.bind('db_update', (data: any) => {
            handleRealtimeData(data);
          });

          cleanupFn = () => {
            channel.unbind_all();
            pusher.unsubscribe(channelName);
            pusher.disconnect();
            stopSSE();
          };
        } catch (e) {
          console.error("Failed to initialize Pusher client, falling back to SSE", e);
          startSSE();
        }
      }).catch(err => {
        console.error("Failed to load pusher-js package, falling back to SSE", err);
        startSSE();
      });
    } else {
      // 2. SSE Fallback Mode (Local Dev/Default)
      startSSE();
    }

    return () => {
      cleanupFn();
    };
  }, [user, fetchData, fetchDashboards, refreshSurveys, notify]);

  const awardXP = useCallback(async (actionType: string, description?: string) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    if (typeof window !== "undefined" && !navigator.onLine) {
      console.warn("Browser is offline, queueing XP award for offline sync.");
      return;
    }
    try {
      const res = await fetch("/api/xp/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, actionType, description }),
      });
      const data = await res.json();
      if (data.success) {
        updateUser({ points: data.newTotal, coins: data.newTotal });
        updateState((s: any) => ({ ...s, points: data.newTotal, coins: data.newTotal }));
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      const isNetworkError = e instanceof TypeError || 
        errorMsg.toLowerCase().includes('failed to fetch') || 
        errorMsg.toLowerCase().includes('networkerror') ||
        errorMsg.toLowerCase().includes('fetch failed');
      if (isNetworkError) {
        console.warn("Failed to award XP (network issue):", errorMsg);
      } else {
        console.error("Failed to award XP:", e);
      }
    }
  }, [updateUser, updateState]);

  const refresh = useCallback(async () => {
    if (userRef.current?.id) {
      const fetchDataPromise = fetchData(userRef.current.id);
      const activeRole = userRef.current.userRole || userRef.current.role;
      if (activeRole === 'hr' || activeRole === 'manager') {
        await Promise.all([
          fetchDataPromise,
          fetchDashboards(userRef.current.id, activeRole)
        ]);
      } else {
        await fetchDataPromise;
      }
    }
  }, [fetchData, fetchDashboards]);

  // 4. ALL EFFECTS AT THE END
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const savedUserId = localStorage.getItem("hp_user_id");
    if (savedUserId) {
      fetchData(savedUserId);
    } else {
      setLoading(false);
      // Check if we just logged out to trigger the toast
      if (typeof window !== "undefined") {
        const justLoggedOut = localStorage.getItem("hp_logout_toast");
        if (justLoggedOut === "true") {
          localStorage.removeItem("hp_logout_toast");
          setTimeout(() => {
            notify("Logout Berhasil", "Anda telah keluar dari akun.", "success");
          }, 300);
        }
      }
    }
  }, [fetchData, notify]);

  useEffect(() => {
    if (user) {
      const activeRole = user.userRole || user.role;
      if (activeRole === 'hr' || activeRole === 'manager') {
        fetchDashboards(user.id, activeRole);
      }
    }
  }, [user, fetchDashboards]);

  useEffect(() => {
    if (user?.id && !loading) {
      fetch('/api/hr/surveys')
        .then(r => r.json())
        .then(data => {
          if (data.surveys) setState(prev => prev ? { ...prev, surveys: data.surveys } : null);
        })
        .catch(() => {});
    }
  }, [user?.id, loading]);

  // Auto-sync to DB with debounce + keepalive (survives page refresh)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSyncRef = useRef<{ state: any; user: any } | null>(null);

  useEffect(() => {
    if (!loading && user && state) {
      // CRITICAL: Never sync during a login transition — state belongs to old user!
      if (loginInProgressRef.current) {
        return;
      }

      if (skipNextSyncRef.current) {
        skipNextSyncRef.current = false;
        return; // Actually skip this sync cycle (data just came from server)
      }
      
      // Store latest data for sync
      latestSyncRef.current = { state, user };

      // Optimize payload: remove huge/redundant data before sending to server
      const syncState: any = { ...state };
      delete syncState.hrData;
      delete syncState.managerData;
      delete syncState.surveys;
      delete syncState.feed;
      const isHRUser = user?.role === 'hr' || user?.userRole === 'hr';
      if (!isHRUser) {
        delete syncState.rewards;
      }

      const currentPayloadStr = JSON.stringify({ state: syncState, user });
      
      // If the data we are about to sync is exactly the same as the last time we synced it, do nothing!
      if (lastSyncedPayloadRef.current === currentPayloadStr) {
        return;
      }
      
      // Debounce: wait 1500ms after last state change before syncing (longer to avoid rapid login transitions)
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(async () => {
        // Double-check: still not in a login transition when the timer fires
        if (loginInProgressRef.current) return;

        const data = latestSyncRef.current;
        if (!data) return;
        
        if (typeof window !== "undefined" && !navigator.onLine) {
          console.warn("Browser is offline, skipping sync.");
          return;
        }

        try {
          setSyncing(true);
          const finalSyncState: any = { ...data.state };
          delete finalSyncState.hrData;
          delete finalSyncState.managerData;
          delete finalSyncState.surveys;
          delete finalSyncState.feed;
          const isHRUserFinal = data.user?.role === 'hr' || data.user?.userRole === 'hr';
          if (!isHRUserFinal) {
            delete finalSyncState.rewards;
          }
          
          const finalPayload = JSON.stringify({ state: finalSyncState, user: data.user, userId: data.user.id });
          lastSyncedPayloadRef.current = JSON.stringify({ state: finalSyncState, user: data.user }); // Update ref immediately with consistent structure (no userId)

          const response = await fetch("/api/storage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: finalPayload,
          });
          
          if (response.ok) {
            if (typeof window !== "undefined") {
              window.postMessage({ type: "FLOWBEE_WEBSITE_UPDATE" }, "*");
            }
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error("Sync failed:", errData.error || response.statusText);
          }
        } catch (e: any) {
          const errorMsg = e?.message || String(e);
          const isNetworkError = e instanceof TypeError || 
            errorMsg.toLowerCase().includes('failed to fetch') || 
            errorMsg.toLowerCase().includes('networkerror') ||
            errorMsg.toLowerCase().includes('fetch failed');
          if (isNetworkError) {
            console.warn("Sync error (network issue):", errorMsg);
          } else {
            console.error("Sync error:", e);
          }
        } finally {
          setSyncing(false);
        }
      }, 1500);
    }
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [state, user, loading]);

  // Also sync immediately on page unload (backup) with stripped payload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const data = latestSyncRef.current;
      if (data) {
        try {
          const syncState = { ...data.state };
          delete syncState.hrData;
          delete syncState.managerData;
          delete syncState.surveys;
          delete syncState.feed;
          const isHRUserUnload = data.user?.role === 'hr' || data.user?.userRole === 'hr';
          if (!isHRUserUnload) {
            delete syncState.rewards;
          }

          const payload = JSON.stringify({ state: syncState, user: data.user, userId: data.user.id });
          // Only send if within beacon limits (usually 64KB)
          if (payload.length < 60000) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/storage', blob);
          }
        } catch (e) {
          // silent fallback
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Listen to messages from extension companion
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      if (event.data?.type === "FLOWBEE_REQ_USER") {
        if (user) {
          window.postMessage({
            type: "FLOWBEE_WEBSITE_USER",
            userId: user.id,
            user: {
              id: user.id,
              name: user.name,
              role: user.userRole || user.role,
              points: user.points,
              coins: user.coins,
              level: user.level,
              rank: user.rank,
              streak: user.streak,
              avatarImage: user.avatarImage,
              department: user.department,
            }
          }, "*");
        } else {
          window.postMessage({
            type: "FLOWBEE_WEBSITE_USER",
            userId: null,
            user: null
          }, "*");
        }
      }

      if (event.data?.type === "FLOWBEE_DB_UPDATE") {
        refresh();
        refreshSurveys();
        window.dispatchEvent(new Event('hp_db_update'));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user, refresh, refreshSurveys]);

  // Broadcast user info on changes
  const userPayloadString = user ? JSON.stringify({
    id: user.id,
    name: user.name,
    role: user.userRole || user.role,
    points: user.points,
    coins: user.coins,
    level: user.level,
    rank: user.rank,
    streak: user.streak,
    avatarImage: user.avatarImage,
    department: user.department,
  }) : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userPayloadString) {
      const payload = JSON.parse(userPayloadString);
      window.postMessage({
        type: "FLOWBEE_WEBSITE_USER",
        userId: payload.id,
        user: payload
      }, "*");
    } else {
      window.postMessage({
        type: "FLOWBEE_WEBSITE_USER",
        userId: null,
        user: null
      }, "*");
    }
  }, [userPayloadString]);

  return (
    <HPContext.Provider value={{ 
      state, user, updateState, updateUser, setUserRole, login, logout, awardXP,
      loading, refresh,
      refreshSurveys, resetData, syncSkillProgress,
      toasts, notify, dismissToast
    }}>
      {children}
    </HPContext.Provider>
  );
}

export function useHP() {
  const context = useContext(HPContext);
  if (context === undefined) throw new Error("useHP must be used within a HPProvider");
  return context;
}
