// UNVERIFIED — USER MUST COMPILE
import * as satellite from 'satellite.js';

type EciVec3 = { x: number; y: number; z: number };
type SatRec = ReturnType<typeof satellite.twoline2satrec>;
type SatClass = 'payload' | 'debris' | 'rocket body';

type TleEntry = {
  id: string;
  tle1: string;
  tle2: string;
  satelliteClass: SatClass;
  epochMs: number;
};

type PrecomputeBatchParams = {
  tleList: TleEntry[];
  t0: number;
  t1: number;
  dt: number;
};

type InitMessage = { type: 'init'; id: string; tle1: string; tle2: string };
type PropagateMessage = {
  type: 'propagate';
  id: string;
  t: number;
  epochMs: number;
  satelliteClass: SatClass;
  tle1: string;
  tle2: string;
};
type PrecomputeBatchMessage = { type: 'precomputeBatch' } & PrecomputeBatchParams;
type WorkerMessage = InitMessage | PropagateMessage | PrecomputeBatchMessage;

type ReadyResponse = { type: 'ready'; id: string };
type ResultResponse = {
  type: 'result';
  id: string;
  posEci: EciVec3;
  velEci: EciVec3;
  sigmaRtn: { sigmaR: number; sigmaT: number; sigmaN: number };
};
type BatchResponse = {
  type: 'batch';
  data: Float64Array;
  count: number;
  stride: number;
};
type WorkerResponse = ReadyResponse | ResultResponse | BatchResponse;

const SIGMA_R_M = 100;
const SIGMA_T_M = 1000;
const SIGMA_N_M = 200;

const CLASS_MULTIPLIER: Record<SatClass, number> = {
  payload: 1.0,
  debris: 1.5,
  'rocket body': 1.3,
};

const satrecCache = new Map<string, SatRec>();

function computeSigmaRtnKm(satelliteClass: SatClass) {
  const mult = CLASS_MULTIPLIER[satelliteClass];
  return {
    sigmaR: (SIGMA_R_M * mult) / 1000,
    sigmaT: (SIGMA_T_M * mult) / 1000,
    sigmaN: (SIGMA_N_M * mult) / 1000,
  };
}

function isVec3(v: unknown): v is EciVec3 {
  return (
    typeof v === 'object' &&
    v !== null &&
    'x' in v &&
    'y' in v &&
    'z' in v &&
    typeof (v as EciVec3).x === 'number' &&
    typeof (v as EciVec3).y === 'number' &&
    typeof (v as EciVec3).z === 'number'
  );
}

function precomputeBatch(params: PrecomputeBatchParams): Float64Array {
  const { tleList, t0, t1, dt } = params;
  if (dt <= 0) return new Float64Array(0);

  const steps = Math.floor((t1 - t0) / dt) + 1;
  const stride = 10;
  const data = new Float64Array(steps * stride);

  for (let s = 0; s < tleList.length; s++) {
    const entry = tleList[s];
    const satrec = satellite.twoline2satrec(entry.tle1, entry.tle2);
    const { sigmaR, sigmaT, sigmaN } = computeSigmaRtnKm(entry.satelliteClass);

    for (let i = 0; i < steps; i++) {
      const t = t0 + i * dt;
      const prop = satellite.propagate(satrec, new Date(t));
      const base = i * stride;

      if (prop === null || !isVec3(prop.position) || !isVec3(prop.velocity)) {
        data[base + 0] = t;
        data[base + 7] = sigmaR;
        data[base + 8] = sigmaT;
        data[base + 9] = sigmaN;
        continue;
      }

      data[base + 0] = t;
      data[base + 1] = prop.position.x;
      data[base + 2] = prop.position.y;
      data[base + 3] = prop.position.z;
      data[base + 4] = prop.velocity.x;
      data[base + 5] = prop.velocity.y;
      data[base + 6] = prop.velocity.z;
      data[base + 7] = sigmaR;
      data[base + 8] = sigmaT;
      data[base + 9] = sigmaN;
    }
  }
  return data;
}

self.onmessage = (e: MessageEvent<WorkerMessage>): void => {
  const msg = e.data;

  if (msg.type === 'init') {
    const s = satellite.twoline2satrec(msg.tle1, msg.tle2);
    satrecCache.set(msg.id, s);
    const resp: ReadyResponse = { type: 'ready', id: msg.id };
    self.postMessage(resp);
    return;
  }

  if (msg.type === 'propagate') {
    const s = satrecCache.get(msg.id);
    if (!s) return;

    const prop = satellite.propagate(s, new Date(msg.t));
    if (prop === null || !isVec3(prop.position) || !isVec3(prop.velocity)) {
      return;
    }

    const sigma = computeSigmaRtnKm(msg.satelliteClass);
    const resp: ResultResponse = {
      type: 'result',
      id: msg.id,
      posEci: { x: prop.position.x, y: prop.position.y, z: prop.position.z },
      velEci: { x: prop.velocity.x, y: prop.velocity.y, z: prop.velocity.z },
      sigmaRtn: sigma,
    };
    self.postMessage(resp);
    return;
  }

  if (msg.type === 'precomputeBatch') {
    const data = precomputeBatch(msg);
    const resp: BatchResponse = {
      type: 'batch',
      data,
      count: data.length / 10,
      stride: 10,
    };
    self.postMessage(resp);
    return;
  }
};
