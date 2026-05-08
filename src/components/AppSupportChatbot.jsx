import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import SupportChatbot from "./SupportChatbot";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS } from "../auth/permissions";

function getPageName(pathname = "") {
  if (pathname === "/") return "landing";
  if (pathname === "/login") return "login";
  if (pathname === "/signup") return "signup";
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/alerts") return "alerts";
  if (pathname === "/stations") return "stations";
  if (pathname === "/stations-management") return "stations-management";
  if (pathname === "/crop-health" || pathname === "/ai-analysis") return "crop-health";
  if (pathname === "/zones") return "zones";
  if (pathname === "/weather") return "weather";
  if (pathname === "/reports") return "reports";
  if (pathname === "/users") return "users";
  return "app";
}

function AppSupportChatbot() {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const hiddenPaths = new Set(["/", "/login", "/signup", "/finish-sign-in"]);

  const context = useMemo(
    () => ({
      currentPage: getPageName(location.pathname),
      role: user?.role || "guest",
      canRunAnalysis: hasPermission(PERMISSIONS.USE_AI_ANALYSIS),
      selectedZoneName: "",
      hasImageSelected: false,
      latestAnalysisStatus: "",
    }),
    [hasPermission, location.pathname, user?.role]
  );

  if (!user || hiddenPaths.has(location.pathname)) {
    return null;
  }

  return <SupportChatbot user={user} context={context} />;
}

export default AppSupportChatbot;
