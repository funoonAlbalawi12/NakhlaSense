import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [], requiredPermission }) => {
  const location = useLocation();
  const { isAuthenticated, loading, hasRole, hasPermission } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasRole(allowedRoles)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, requiredPermission }} />;
  }
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, requiredPermission }} />;
  }

  return children;
};

export default ProtectedRoute;
