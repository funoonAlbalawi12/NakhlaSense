import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AlertsPage from "./pages/AlertSystemPage";
import ImageAnalysisPage from "./pages/ImageAnalysisPage";
import ZoneManagementPage from "./pages/ZoneManagementPage";
import StationsPage from "./pages/StationsPage";
import StationsManagementPage from "./pages/StationsManagementPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import WeatherPage from "./pages/WeatherPage";
import MissionHistoryPage from "./pages/MissionHistoryPage";
import StationDetailsPage from "./pages/StationDetailsPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import FinishSignIn from "./pages/FinishSignIn";
import FirebaseTest from "./components/FirebaseTest";
import AppSupportChatbot from "./components/AppSupportChatbot";
import { PERMISSIONS, ROLES } from "./auth/permissions";
import { initializeTheme } from "./utils/theme";

function App() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/finish-sign-in" element={<FinishSignIn />} />
            <Route path="/firebase-test" element={<FirebaseTest />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            <Route
              path="/settings"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_DASHBOARD}
                >
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/missions"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}
                  requiredPermission={PERMISSIONS.VIEW_DASHBOARD}
                >
                  <MissionHistoryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_DASHBOARD}
                >
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/alerts"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_ALERTS}
                >
                  <AlertsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/stations"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_STATIONS}
                >
                  <StationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/stations/:stationId"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_STATIONS}
                >
                  <StationDetailsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/stations-management"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}
                  requiredPermission={PERMISSIONS.MANAGE_STATIONS}
                >
                  <StationsManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/zones"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN]}
                  requiredPermission={PERMISSIONS.MANAGE_ZONES}
                >
                  <ZoneManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crop-health"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_CROP_HEALTH}
                >
                  <ImageAnalysisPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ai-analysis"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_CROP_HEALTH}
                >
                  <ImageAnalysisPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/weather"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR, ROLES.FARMER]}
                  requiredPermission={PERMISSIONS.VIEW_WEATHER}
                >
                  <WeatherPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN]}
                  requiredPermission={PERMISSIONS.VIEW_REPORTS}
                >
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.ADMIN]}
                  requiredPermission={PERMISSIONS.MANAGE_USERS}
                >
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          <AppSupportChatbot />
        </>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
