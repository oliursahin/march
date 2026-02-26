"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ActiveList {
  id: string;
  name: string;
  existingObjectIds: string[];
}

interface ListContextValue {
  activeList: ActiveList | null;
  setActiveList: (list: ActiveList | null) => void;
}

const ListContext = createContext<ListContextValue | null>(null);

export function ListProvider({ children }: { children: React.ReactNode }) {
  const [activeList, setActiveListState] = useState<ActiveList | null>(null);

  const setActiveList = useCallback((list: ActiveList | null) => {
    setActiveListState(list);
  }, []);

  return (
    <ListContext.Provider value={{ activeList, setActiveList }}>
      {children}
    </ListContext.Provider>
  );
}

export function useActiveList() {
  return useContext(ListContext);
}
