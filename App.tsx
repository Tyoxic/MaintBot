import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from './src/db/database';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initErrorLog, addBreadcrumb } from './src/utils/errorLog';

initErrorLog();

function getActiveRouteName(state: any): string | undefined {
  if (!state || typeof state.index !== 'number') return undefined;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const lastRouteRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        addBreadcrumb('app', 'Database ready');
      } catch (e) {
        console.error('Database init failed', e);
      }
      setDbReady(true);
    })();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer
        onStateChange={(state) => {
          const current = getActiveRouteName(state);
          if (current && current !== lastRouteRef.current) {
            addBreadcrumb('navigation', `Navigated to ${current}`);
            lastRouteRef.current = current;
          }
        }}
      >
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}
