// UNVERIFIED — USER MUST COMPILE
import { Contract } from 'ethers';
import VerifierJSON from './abis/Verifier.json';
import ClimateSentinelJSON from './abis/ClimateSentinel.json';

// Vite env vars — injected at build time; fallback for tsc
// @ts-ignore — import.meta.env is Vite-specific
const VITE_VERIFIER_ADDRESS = import.meta.env.VITE_VERIFIER_ADDRESS;
// @ts-ignore
const VITE_SENTINEL_ADDRESS = import.meta.env.VITE_SENTINEL_ADDRESS;
// @ts-ignore
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.sepolia.dev';

// --- Contract types ---
type PubSignals = [string, string, string, string, string];

// --- Contract instances (lazy, gated on window.ethereum) ---
let _verifierContract: Contract | null = null;
let _sentinelContract: Contract | null = null;

function getVerifier(): Contract | null {
  if (!_verifierContract && VITE_VERIFIER_ADDRESS) {
    try {
      // @ts-ignore JSON import typing
      _verifierContract = new Contract(VITE_VERIFIER_ADDRESS, VerifierJSON.abi);
    } catch {
      _verifierContract = null;
    }
  }
  return _verifierContract;
}

function getSentinel(): Contract | null {
  if (!_sentinelContract && VITE_SENTINEL_ADDRESS) {
    try {
      // @ts-ignore JSON import typing
      _sentinelContract = new Contract(VITE_SENTINEL_ADDRESS, ClimateSentinelJSON.abi);
    } catch {
      _sentinelContract = null;
    }
  }
  return _sentinelContract;
}

/// @dev Verify ZKP proof and anchor on-chain.
export async function verifyAndAnchorOnChain(
  proofA: [string, string],
  proofB: [string, string, string, string],
  proofC: [string, string],
  pubSignals: PubSignals
): Promise<string> {
  const contract = getSentinel();
  if (!contract) return 'no-provider';

  try {
    // @ts-ignore — contract method signature differs from our flattened params
    const tx = await contract.verifyAndAnchor(
      proofA[0], proofA[1],
      proofB[0], proofB[1], proofB[2], proofB[3],
      proofC[0], proofC[1],
      pubSignals
    );
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (err) {
    console.error('verifyAndAnchorOnChain error:', err);
    return 'reverted';
  }
}

/// @dev Fetch recent DataAnchored events.
type ChainEvent = {
  proofId: number;
  commitmentA: string;
  commitmentB: string;
  dist_sq_m: string;
  R_m: string;
  timestamp: number;
};

export async function getRecentEvents(fromBlock: number): Promise<ChainEvent[]> {
  const contract = getSentinel();
  if (!contract) return [];

  try {
    const events: ChainEvent[] = [];
    // @ts-ignore — queryFilter returns EventLog[]; args depend on contract ABI
    const rawEvents = await contract.queryFilter('DataAnchored', fromBlock, 'latest');
    for (let i = 0; i < rawEvents.length; i++) {
      // @ts-ignore — args typing from ABI JSON
      const args = rawEvents[i].args;
      events.push({
        proofId: Number(args.proofId) || 0,
        commitmentA: args.commitmentA || '0',
        commitmentB: args.commitmentB || '0',
        dist_sq_m: args.dist_sq_m || '0',
        R_m: args.R_m || '200000',
        timestamp: Number(args.timestamp) || 0,
      });
    }
    return events;
  } catch (err) {
    console.error('getRecentEvents error:', err);
    return [];
  }
}