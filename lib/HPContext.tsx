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
}

export type UserRole = 'hr' | 'manager' | 'employee' | 'admin';

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
    try {
      const res = await fetch(`/api/storage?userId=${userId}`);
      const data = await res.json();
      if (data.error) throw new Error(`${data.error}: ${data.details || ''}`);
      skipNextSyncRef.current = true;
      if (data.state) {
        setState(data.state);
        // Pre-fill the payload ref so we don't sync this identical data back
        const syncState: any = { ...data.state };
        delete syncState.hrData;
        delete syncState.managerData;
        delete syncState.surveys;
        delete syncState.feed;
        const isHRUser = (data.user || user)?.role === 'hr' || (data.user || user)?.role === 'admin' || (data.user || user)?.userRole === 'hr';
        if (!isHRUser) {
          delete syncState.rewards;
        }
        lastSyncedPayloadRef.current = JSON.stringify({ state: syncState, user: data.user || user });
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
    } catch (error) {
      console.error("Failed to fetch state:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((userData: any) => {
    setUser(userData);
    localStorage.setItem("hp_user_id", userData.id);
    fetchData(userData.id);
  }, [fetchData]);

  const logout = useCallback(() => {
    setUser(null);
    setState(null);
    localStorage.removeItem("hp_user_id");
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  const fetchDashboards = useCallback(async (userId: string, role: string) => {
    try {
      const activeRole = role === 'admin' ? 'hr' : role;
      if (activeRole === 'hr') {
        const res = await fetch('/api/hr/dashboard');
        const data = await res.json();
        if (data && data.metrics) {
          setState(prev => prev ? { ...prev, hrData: data } : null);
        }
      } else if (activeRole === 'manager') {
        const res = await fetch(`/api/manager/dashboard?userId=${userId}`);
        const data = await res.json();
        setState(prev => prev ? { ...prev, managerData: data } : null);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
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
    try {
      const res = await fetch('/api/hr/surveys');
      const data = await res.json();
      if (data.surveys) {
        setState(prev => prev ? { ...prev, surveys: data.surveys } : null);
      }
    } catch (e) {
      console.error("Failed to refresh surveys:", e);
    }
  }, []);

  // ── Auto-refresh via Server-Sent Events (SSE) ──
  useEffect(() => {
    if (!user?.id) return;
    
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'refresh') {
          // Hanya refresh kalau tab sedang aktif untuk menghemat resource browser
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            fetchData(user.id);
            refreshSurveys();
            const rawRole = user.userRole || user.role;
            const activeRole = rawRole === 'admin' ? 'hr' : rawRole;
            if (activeRole === 'hr' || activeRole === 'manager') {
              fetchDashboards(user.id, activeRole);
            }
            // Kirim event ke komponen lain (HRPeopleScreen, dll)
            window.dispatchEvent(new Event('hp_db_update'));
          }
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [user?.id, fetchData, fetchDashboards, refreshSurveys]);

  const awardXP = useCallback(async (actionType: string, description?: string) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
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
    } catch (e) {
      console.error("Failed to award XP:", e);
    }
  }, [updateUser, updateState]);

  const refresh = useCallback(async () => {
    if (userRef.current?.id) await fetchData(userRef.current.id);
  }, [fetchData]);

  // 4. ALL EFFECTS AT THE END
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const savedUserId = localStorage.getItem("hp_user_id");
    if (savedUserId) fetchData(savedUserId);
    else setLoading(false);
  }, [fetchData]);

  useEffect(() => {
    if (user) {
      const rawRole = user.userRole || user.role;
      const activeRole = rawRole === 'admin' ? 'hr' : rawRole;
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
      if (skipNextSyncRef.current) {
        skipNextSyncRef.current = false;
        // Don't return! Just because we skip this particular trigger doesn't mean we shouldn't save it as the last seen payload if it came from the server, but let's let the payload check handle the real skipping.
      }
      
      // Store latest data for sync
      latestSyncRef.current = { state, user };

      // Optimize payload: remove huge/redundant data before sending to server
      const syncState: any = { ...state };
      delete syncState.hrData;
      delete syncState.managerData;
      delete syncState.surveys;
      delete syncState.feed;
      const isHRUser = user?.role === 'hr' || user?.role === 'admin' || user?.userRole === 'hr';
      if (!isHRUser) {
        delete syncState.rewards;
      }

      const currentPayloadStr = JSON.stringify({ state: syncState, user });
      
      // If the data we are about to sync is exactly the same as the last time we synced it, do nothing!
      if (lastSyncedPayloadRef.current === currentPayloadStr) {
        return;
      }
      
      // Debounce: wait 500ms after last state change before syncing
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(async () => {
        const data = latestSyncRef.current;
        if (!data) return;
        
        try {
          setSyncing(true);
          const finalSyncState: any = { ...data.state };
          delete finalSyncState.hrData;
          delete finalSyncState.managerData;
          delete finalSyncState.surveys;
          delete finalSyncState.feed;
          const isHRUserFinal = data.user?.role === 'hr' || data.user?.role === 'admin' || data.user?.userRole === 'hr';
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
          
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error("Sync failed:", errData.error || response.statusText);
          }
        } catch (e) {
          console.error("Sync error:", e);
        } finally {
          setSyncing(false);
        }
      }, 500);
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
          const isHRUserUnload = data.user?.role === 'hr' || data.user?.role === 'admin' || data.user?.userRole === 'hr';
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
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user]);

  // Broadcast user info on changes
  useEffect(() => {
    if (typeof window === "undefined") return;
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
        }
      }, "*");
    } else {
      window.postMessage({
        type: "FLOWBEE_WEBSITE_USER",
        userId: null,
        user: null
      }, "*");
    }
  }, [user]);

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
