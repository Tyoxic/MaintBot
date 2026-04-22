import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../models/types';
import GarageScreen from '../screens/GarageScreen';
import AddEditVehicleScreen from '../screens/AddEditVehicleScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import LogRideScreen from '../screens/LogRideScreen';
import MarkDoneScreen from '../screens/MarkDoneScreen';
import MaintenanceHistoryScreen from '../screens/MaintenanceHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExpertViewScreen from '../screens/ExpertViewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#333',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="Garage" component={GarageScreen} options={{ title: 'My Garage' }} />
      <Stack.Screen name="AddEditVehicle" component={AddEditVehicleScreen} options={{ title: 'Add Vehicle' }} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Vehicle' }} />
      <Stack.Screen name="LogRide" component={LogRideScreen} options={{ title: 'Log Ride' }} />
      <Stack.Screen name="MarkDone" component={MarkDoneScreen} options={{ title: 'Mark Done' }} />
      <Stack.Screen name="MaintenanceHistory" component={MaintenanceHistoryScreen} options={{ title: 'History' }} />
      <Stack.Screen name="ExpertView" component={ExpertViewScreen} options={{ title: 'Expert View' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile & Settings' }} />
    </Stack.Navigator>
  );
}
