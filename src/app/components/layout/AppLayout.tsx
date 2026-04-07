import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "../../context/AuthContext";
import { SearchProvider } from "../../context/SearchContext";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isPatrol } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPatrol) {
      navigate("/app/patrol/dashboard", { replace: true });
    }
  }, [isPatrol, navigate]);

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