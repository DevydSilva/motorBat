/**
 * Texto da pesquisa global do cabeçalho — partilhado com as páginas para filtrar listas.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const HeaderSearchContext = createContext(null);

export function HeaderSearchProvider({ children }) {
  const [query, setQueryState] = useState("");
  const setQuery = useCallback((value) => {
    setQueryState(typeof value === "string" ? value : "");
  }, []);
  const value = useMemo(() => ({ query, setQuery }), [query, setQuery]);
  return <HeaderSearchContext.Provider value={value}>{children}</HeaderSearchContext.Provider>;
}

export function useHeaderSearch() {
  const ctx = useContext(HeaderSearchContext);
  if (!ctx) {
    return { query: "", setQuery: () => {} };
  }
  return ctx;
}
