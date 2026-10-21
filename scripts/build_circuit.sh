#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> [1/6] Compile circom circuit"
mkdir -p build keys
circom circuits/proximity.circom --r1cs --wasm --sym -o build/

echo "==> [2/6] Powers of tau (12 = small test circuit)"
if [ ! -f keys/pot12_final.ptau ]; then
  snarkjs powersoftau new bn128 12 keys/pot12_0000.ptau -v
  snarkjs powersoftau contribute keys/pot12_0000.ptau keys/pot12_0001.ptau \
    --name="ClimateChain" -v -e="$(head -c 32 /dev/urandom | xxd -p)"
  snarkjs powersoftau prepare phase2 keys/pot12_0001.ptau keys/pot12_final.ptau -v
fi

echo "==> [3/6] Groth16 setup"
snarkjs groth16 setup build/proximity.r1cs keys/pot12_final.ptau keys/proximity_0000.zkey
snarkjs zkey contribute keys/proximity_0000.zkey keys/proximity_final.zkey \
  --name="ClimateChain c2" -v -e="$(head -c 32 /dev/urandom | xxd -p)"

echo "==> [4/6] Export verification key"
snarkjs zkey export verificationkey keys/proximity_final.zkey keys/verification_key.json

echo "==> [5/6] Export Solidity verifier"
snarkjs zkey export solidityverifier keys/proximity_final.zkey contracts/Verifier.sol

echo "==> [6/6] Done. Artifacts:"
ls -la build/proximity.r1cs build/proximity_js/proximity.wasm keys/proximity_final.zkey contracts/Verifier.sol
echo
echo "Next: npx hardhat compile && npx hardhat run scripts/deploy.ts --network sepolia"
