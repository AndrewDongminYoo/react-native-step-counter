import React from "react";
import { View } from "react-native";

export const Svg = ({ children }: { children?: React.ReactNode }) => (
  <View testID="svg">{children}</View>
);

export const Rect = () => null;
export const Path = () => null;
export const Circle = () => null;
export const G = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export default Svg;
