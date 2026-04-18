import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "../../context/AuthContext";
import { SearchProvider } from "../../context/SearchContext";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoading, user } = useAuth();

  // Monitor role changes and redirect to appropriate dashboard
  useEffect(() => {
    if (isLoading) return;

    console.log("[AppLayout] Checking role-based routing", {
      currentPath: location.pathname,
      userRole: user.role,
    });

    // If user is a patrol officer on resident routes, redirect to patrol dashboard
    if (user.role === "patrol" && location.pathname === "/app/dashboard") {
      console.log("[AppLayout] Patrol officer detected on resident dashboard, redirecting to patrol dashboard");
      navigate("/app/patrol/dashboard", { replace: true });
    }

    // If user is a resident or accessing admin routes without permission, ensure they're on resident dashboard
    if (user.role === "resident" && location.pathname === "/app/patrol/dashboard") {
      console.log("[AppLayout] Resident detected on patrol dashboard, redirecting to resident dashboard");
      navigate("/app/dashboard", { replace: true });
    }
  }, [user.role, location.pathname, navigate, isLoading]);

  // Don't render anything until auth is fully loaded to prevent route flashing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: "#f7f9fb" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f7f9fb" }}>
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuToggle={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}