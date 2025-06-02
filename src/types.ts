// Application Settings Interface
export interface AppSettings {
  courtsCount: number;
  playersPerCourt: number;
  extraCourtFee: number;
}

// Player Interface
export interface Player {
  id: string;
  name: string;
  registeredAt: Date;
}

// Weekly Registration Interface
export interface WeeklyRegistration {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  players: Player[];
  settings: AppSettings;
}

// Registration Summary Interface
export interface RegistrationSummary {
  totalPlayers: number;
  requiredCourts: number;
  extraCourts: number;
  extraPlayersCount: number;
  totalExtraFee: number;
  feePerExtraPlayer: number;
}