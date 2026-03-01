import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from './src/db/database';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      await getDatabase();
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
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}
