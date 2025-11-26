export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface SignalCycle {
  greenDuration: number;
  yellowDuration: number; // Fixed user setting
  redDuration: number;
  totalDuration: number;
}

export interface Signal {
  id: string;
  name: string;
  location: Coordinate;
  cycle: SignalCycle;
  referenceTimestamp: number; // UNIX timestamp of a known Green start
  createdAt: number;
}

export interface Route {
  id: string;
  name: string;
  startLocation?: Coordinate;
  endLocation?: Coordinate;
  path: Coordinate[]; // Ordered list of points defining the route vector
  signals: Signal[];
  createdAt: number;
}

export enum SignalPhase {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED'
}

export interface NavigationState {
  currentSpeedKmh: number;
  distanceToSignal: number; // meters
  targetSignalId: string | null;
  etaSeconds: number;
  recommendedAction: 'MAINTAIN' | 'ACCELERATE' | 'DECELERATE' | 'STOP';
  targetSpeedKmh?: number;
  timeToPhaseChange: number;
  nextPhase: SignalPhase;
  currentPhase: SignalPhase;
}
