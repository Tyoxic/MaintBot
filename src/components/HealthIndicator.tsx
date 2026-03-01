import React from 'react';
import { View } from 'react-native';
import { HealthStatus } from '../models/types';
import { HEALTH_COLORS } from '../utils/colors';

interface Props {
  status: HealthStatus;
  size?: number;
}

export default function HealthIndicator({ status, size = 12 }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: HEALTH_COLORS[status],
        marginRight: 8,
      }}
    />
  );
}
