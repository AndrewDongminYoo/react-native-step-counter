import React from "react";
import type { ReactNode } from "react";

export const SafeAreaProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const SafeAreaView = ({ children }: { children: ReactNode }) => <>{children}</>;
export const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
