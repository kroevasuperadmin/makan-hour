import React, { useState } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { color, Icon, useReducedMotion } from '@makan/ui';
import mark from './order-mark.json';

// Plays once when an order is placed. Reduced motion keeps the still bowl.
export function OrderMark() {
  const reduced = useReducedMotion();
  const [dead, setDead] = useState(false);
  if (reduced || dead) {
    return (
      <View style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bowl" size={20} c={color.onAccent} />
      </View>
    );
  }
  return (
    <LottieView
      source={mark}
      autoPlay
      loop={false}
      style={{ width: 96, height: 72 }}
      webStyle={{ width: 96, height: 72 }}
      onAnimationFailure={() => setDead(true)}
    />
  );
}
