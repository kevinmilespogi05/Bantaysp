import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";

interface SearchContextType {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQueryRaw] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback(
    (q: string) => {
      setQueryRaw(q);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setDebouncedQuery(q);
        if (q.trim() && !location.pathname.startsWith("/app/reports")) {
          navigate("/app/reports");
        }
      }, 300);
    },
    [navigate, location.pathname]
  );

  return (
    <SearchContext.Provider value={{ query, setQuery, debouncedQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
