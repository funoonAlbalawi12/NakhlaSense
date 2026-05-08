import React, { createContext, useContext, useEffect, useState } from "react";
import { getIdTokenResult, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import {
  getUserRole,
  ROLE_PERMISSIONS,
  ROLES,
} from "../auth/permissions";
import {
  PENDING_OTP_KEY,
  PENDING_SIGNUP_KEY,
} from "../firebase/services/authService";
import { ensureUserProfile } from "../firebase/services/userProfileService";

const AuthContext = createContext();
const DEV_USER_KEY = "nakhla_dev_user";

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        localStorage.removeItem(DEV_USER_KEY);
        const pendingOtpEmail = String(sessionStorage.getItem(PENDING_OTP_KEY) || "")
          .trim()
          .toLowerCase();
        const currentEmail = String(firebaseUser.email || "").trim().toLowerCase();

        if (pendingOtpEmail && pendingOtpEmail === currentEmail) {
          setUser(null);
          setLoading(false);
          return;
        }

        const tokenResult = await getIdTokenResult(firebaseUser, true);
        const claimedRole = tokenResult.claims.role || null;
        const pendingSignup = (() => {
          try {
            return JSON.parse(sessionStorage.getItem(PENDING_SIGNUP_KEY) || "null");
          } catch {
            return null;
          }
        })();
        const profile = await ensureUserProfile(
          firebaseUser,
          claimedRole || pendingSignup?.role || ROLES.OPERATOR,
          pendingSignup || {}
        );
        sessionStorage.removeItem(PENDING_SIGNUP_KEY);
        const resolvedRole = claimedRole || profile?.role || ROLES.OPERATOR;
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: profile?.name || firebaseUser.displayName || "",
          role: resolvedRole,
          providerId: firebaseUser.providerData?.[0]?.providerId || null,
          isDev: false,
        });
        setLoading(false);
        return;
      }

      const savedDevUser = localStorage.getItem(DEV_USER_KEY);
      setUser(savedDevUser ? JSON.parse(savedDevUser) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginDev = (email, role = ROLES.OPERATOR) => {
    const devUser = {
      uid: `dev-${Date.now()}`,
      email,
      name: String(email || "").split("@")[0] || "Dev User",
      role,
      isDev: true
    };

    localStorage.setItem(DEV_USER_KEY, JSON.stringify(devUser));
    setUser(devUser);
  };

  const hasRole = (roles = []) => {
    if (!roles.length) return true;
    const role = getUserRole(user);
    return roles.includes(role);
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    const role = getUserRole(user);
    return (ROLE_PERMISSIONS[role] || []).includes(permission);
  };

  const logout = async () => {
    if (user?.isDev) {
      localStorage.removeItem(DEV_USER_KEY);
      setUser(null);
      return;
    }

    await signOut(auth);
  };

  const updateCurrentUser = (changes = {}) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      if (next.isDev) {
        localStorage.setItem(DEV_USER_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    hasRole,
    hasPermission,
    loginDev,
    logout,
    updateCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
