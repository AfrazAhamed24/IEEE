// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Interface matching the Groth16 verifier snarkjs generates.
/// The verifier contract is exported by:
///   snarkjs zkey export solidityverifier proximity_final.zkey Verifier.sol
/// That contract implements this interface. Our ClimateSentinel wraps it.
interface IVerifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[5] calldata _pubSignals
    ) external view returns (bool);
}
