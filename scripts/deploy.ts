import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ClimateSentinel...");

  // 1. Deploy the snarkjs-generated verifier (from Verifier.sol)
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log("Verifier deployed to:", verifierAddr);

  // 2. Deploy ClimateSentinel pointing at the verifier
  const Sentinel = await ethers.getContractFactory("ClimateSentinel");
  const sentinel = await Sentinel.deploy(verifierAddr);
  await sentinel.waitForDeployment();
  const sentinelAddr = await sentinel.getAddress();
  console.log("ClimateSentinel deployed to:", sentinelAddr);

  console.log("\nAdd these to your .env:");
  console.log(`VITE_VERIFIER_ADDRESS=${verifierAddr}`);
  console.log(`VITE_SENTINEL_ADDRESS=${sentinelAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
