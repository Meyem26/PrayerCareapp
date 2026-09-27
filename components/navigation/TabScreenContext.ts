import { createContext, useContext } from 'react';

/** True for screens rendered inside the bottom tab navigator (the tab bar owns the bottom inset). */
export const TabScreenContext = createContext(false);

export function useIsTabScreen(): boolean {
  return useContext(TabScreenContext);
}
