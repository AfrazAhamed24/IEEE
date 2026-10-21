// UNVERIFIED — USER MUST COMPILE
import { create } from 'zustand';

type Satellite = {
  id: string;
  name: string;
  tle1: string;
  tle2: string;
  class: 'payload' | 'debris' | 'rocket body';
};

type Conjunction = {
  id: string;
  satAId: string;
  satBId: string;
  tcaMs: number;
  distSqM: number;
  proximity: boolean;
};

type RiskState = 'safe' | 'warning' | 'breach';

interface Store {
  t: number;
  selectedSatId: string | null;
  selectedConjId: string | null;
  satellites: Satellite[];
  conjunctions: Conjunction[];
  riskState: RiskState;

  // Actions
  setT: (t: number) => void;
  selectSat: (satId: string | null) => void;
  selectConj: (conjId: string | null) => void;
  setSatellites: (sats: Satellite[]) => void;
  setConjunctions: (conjs: Conjunction[]) => void;
  setRiskState: (state: RiskState) => void;
}

export const useStore = create<Store>((set) => ({
  t: 0,
  selectedSatId: null,
  selectedConjId: null,
  satellites: [],
  conjunctions: [],
  riskState: 'safe',

  setT: (t) => set({ t }),
  selectSat: (satId) => set({ selectedSatId: satId }),
  selectConj: (conjId) => set({ selectedConjId: conjId }),
  setSatellites: (sats) => set({ satellites: sats }),
  setConjunctions: (conjs) => set({ conjunctions: conjs }),
  setRiskState: (state) => set({ riskState: state }),
}));