import React from "react";
import { View } from "react-native";

export type ProgressRef = {
  play: () => void;
  pause: () => void;
  reset: () => void;
  reAnimate: () => void;
};

const CircularProgress = React.forwardRef<ProgressRef, Record<string, unknown>>((_props, ref) => {
  React.useImperativeHandle(ref, () => ({
    play: jest.fn(),
    pause: jest.fn(),
    reset: jest.fn(),
    reAnimate: jest.fn(),
  }));
  return <View testID="circular-progress" />;
});

CircularProgress.displayName = "CircularProgress";

export default CircularProgress;
