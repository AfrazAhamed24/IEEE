// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IVerifier.sol";

/// @title ClimateSentinel
/// @notice Privacy-preserving conjunction anchoring for climate satellites.
/// @dev ZKP public signal order (from proximity.circom):
///   [commitmentA, commitmentB, proximity, dist_sq_m, R_m]
contract ClimateSentinel {

    IVerifier public immutable verifier;
    uint256 public constant R_DEFAULT_M = 200_000; // 200 km
    uint256 public proofCounter;

    // Satellite NORAD ID -> last seen epoch (for freshness checks)
    mapping(uint256 => uint256) public lastSeenEpoch;

    event DataAnchored(
        uint256 indexed proofId,
        uint256 commitmentA,
        uint256 commitmentB,
        uint256 dist_sq_m,
        uint256 R_m,
        uint256 timestamp
    );

    event ManeuverRecorded(
        uint256 indexed maneuverId,
        uint256 commitmentA,
        int256 deltaV_mm_s,
        uint256 separation_after_m,
        uint256 timestamp
    );

    event VerifierSet(address verifier);

    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
        emit VerifierSet(_verifier);
    }

    /// @notice Verify a ZK proximity proof and anchor it on-chain.
    /// @param _pA Groth16 proof point A
    /// @param _pB Groth16 proof point B
    /// @param _pC Groth16 proof point C
    /// @param _pubSignals [commitmentA, commitmentB, proximity, dist_sq_m, R_m]
    /// @return accepted true if proof verifies and proximity == 1
    function verifyAndAnchor(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[5] calldata _pubSignals
    ) external returns (bool accepted) {
        // 1. Groth16 proof must be valid
        require(verifier.verifyProof(_pA, _pB, _pC, _pubSignals), "invalid proof");

        // 2. Extract public signals
        uint256 commitmentA = _pubSignals[0];
        uint256 commitmentB = _pubSignals[1];
        uint256 proximity   = _pubSignals[2];
        uint256 dist_sq_m   = _pubSignals[3];
        uint256 R_m         = _pubSignals[4];

        // 3. Proximity must be true
        require(proximity == 1, "proximity not satisfied");

        // 4. Distance must actually be under threshold (sanity)
        require(dist_sq_m <= R_m * R_m, "dist exceeds threshold");

        // 5. Anchor the fact
        proofCounter++;
        emit DataAnchored(
            proofCounter,
            commitmentA,
            commitmentB,
            dist_sq_m,
            R_m,
            block.timestamp
        );

        return true;
    }

    /// @notice Record an evasion maneuver on-chain.
    function recordManeuver(
        uint256 commitmentA,
        int256 deltaV_mm_s,
        uint256 separation_after_m
    ) external {
        proofCounter++;
        emit ManeuverRecorded(
            proofCounter,
            commitmentA,
            deltaV_mm_s,
            separation_after_m,
            block.timestamp
        );
    }
}
