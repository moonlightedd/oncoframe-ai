import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AppData } from '@/lib/appTypes';
import { emptyAppData } from '@/lib/appTypes';

interface AppContextValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyAppData);
  return <AppContext.Provider value={{ data, setData }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
