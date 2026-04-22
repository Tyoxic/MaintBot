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

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface MaintenanceItemWithHealth extends MaintenanceItem {
  hoursRemaining: number;
  percentRemaining: number;
  health: HealthStatus;
}

export type RootStackParamList = {
  Garage: undefined;
  AddEditVehicle: { vehicleId?: number };
  VehicleDetail: { vehicleId: number };
  LogRide: { vehicleId: number };
  MarkDone: { vehicleId: number; itemId: number };
  MaintenanceHistory: { vehicleId: number };
  ExpertView: { vehicleId: number };
  Profile: undefined;
};
