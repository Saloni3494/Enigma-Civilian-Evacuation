import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/authority" : "/civilian"} replace />;
}
