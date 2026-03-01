export const DEFAULT_MAINTENANCE_ITEMS = [
  { name: 'Oil Change', interval_hours: 15, sort_order: 1 },
  { name: 'Air Filter Cleaning', interval_hours: 5, sort_order: 2 },
  { name: 'Coolant Change', interval_hours: 100, sort_order: 3 },
  { name: 'Brake Pads', interval_hours: 100, sort_order: 4 },
  { name: 'Top End Rebuild', interval_hours: 100, sort_order: 5 },
  { name: 'Tire Change', interval_hours: 200, sort_order: 6 },
];

export const VEHICLE_TYPES = [
  { label: 'Dirtbike', value: 'dirtbike' },
  { label: 'ATV', value: 'atv' },
  { label: 'UTV', value: 'utv' },
  { label: 'Other', value: 'other' },
] as const;
