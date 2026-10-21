# AGENTS.md — Orbital Climate Sentinel

## Current architecture
- frontend/ — vanilla HTML/CSS/JS. THE SUBMISSION UI. Do not rewrite in React.
- apps/web/ — DEAD. Ignore. Do not touch. Do not import.
- circuits/proximity.circom — done, compiles (495 constraints)
- keys/proximity_final.zkey — done
- keys/verification_key.json — done
- contracts/Verifier.sol — done (Groth16Verifier)
- contracts/ClimateSentinel.sol — done
- scripts/deploy.ts — done, waiting for deployment

## Absolute rules
1. NEVER claim a file is written without pasting full contents.
2. NEVER invent an API. HALT and stop if unsure.
3. Commands go AFTER code blocks, not inside them.
4. Every file starts with `// UNVERIFIED — USER MUST COMPILE` (line 1).
5. ONE FILE PER SESSION. Wait for the next session number.

## Exact APIs
snarkjs CLI:
    snarkjs groth16 fullprove input.json circuit.wasm key.zkey proof.json public.json
    snarkjs groth16 verify verification_key.json public.json proof.json

ethers v6:
    import { BrowserProvider, Contract } from 'ethers';
    const signer = await new BrowserProvider(window.ethereum).getSigner();
    const contract = new Contract(addr, abi, signer);
    const tx = await contract.verifyAndAnchor(pA, pB, pC, pubSignals);
    await tx.wait();

Node http module (not express):
    const http = require('http');
    const server = http.createServer((req, res) => { ... });
    server.listen(3001);

Node child_process:
    const { execSync } = require('child_process');
    const out = execSync('snarkjs groth16 fullprove ...', { encoding: 'utf8' });

## Public signals (proximity.circom)
Order from circom: [commitmentA, commitmentB, proximity, dist_sq_m, R_m]
Solidity: verifyAndAnchor(uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[5] _pubSignals)
