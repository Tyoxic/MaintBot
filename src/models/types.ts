export type VehicleType = 'dirtbike' | 'atv' | 'utv' | 'other';

export interface Vehicle {
  id: number;
  name: string;
  year: number | null;
  make: string;
  model: string;
  type: VehicleType;
  vin: string;
  photo_uri: string;
  current_hours: number;
  current_miles: number;
  reg_expiry: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceItem {
  id: number;
  vehicle_id: number;
  name: string;
  interval_hours: number;
  last_done_hours: number;
  interval_miles: number;
  last_done_miles: number;
  is_custom: number;
  sort_order: number;
  created_at: string;
}

export interface MaintenanceLogEntry {
  id: number;
  vehicle_id: number;
  maintenance_item_id: number | null;
  item_name: string;
  hours_at_service: number;
  miles_at_service: number | null;
  notes: string;
  performed_at: string;
}

export interface RideLogEntry {
  id: number;
  vehicle_id: number;
  hours_before: number;
  hours_after: number;
  notes: string;
  logged_at: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleNote {
  id: number;
  vehicle_id: number;
  title: string;
  content: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface MaintenanceItemWithHealth extends MaintenanceItem {
  hoursRemaining: number;
  milesRemaining: number;
  percentRemaining: number;
  health: HealthStatus;
  // Which dimension is driving the health status — useful for display.
  drivenBy: 'hours' | 'miles' | 'none';
}

export type RootStackParamList = {
  Garage: undefined;
  AddEditVehicle: { vehicleId?: number };
  VehicleDetail: { vehicleId: number };
  LogRide: { vehicleId: number };
  MarkDone: { vehicleId: number; itemId: number };
  MaintenanceHistory: { vehicleId: number };
  ServiceLog: { vehicleId: number };
  VehicleNotes: { vehicleId: number };
  EditNote: { vehicleId: number; noteId: number };
  Profile: undefined;
};
