import { useContext, createContext } from "react";
import { App } from "obsidian";

export const AppCtx = createContext<App | null>(null);
export const useApp = () => useContext(AppCtx)!;
