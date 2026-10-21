pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

// Proves: two satellites (identified by NORAD ID commitments) are
// within a threshold distance R_m (in meters), without revealing
// their exact positions or NORAD IDs.
//
// Public signal order (circom outputs first, then public inputs):
//   [commitmentA, commitmentB, proximity, dist_sq_m, R_m]
//
// Fixed-point convention: positions are km * 1000 (integer meters).

template ProximityVerify() {
    // Private inputs: satellite states
    signal input satA_x;
    signal input satA_y;
    signal input satA_z;
    signal input satB_x;
    signal input satB_y;
    signal input satB_z;

    // Private inputs: NORAD IDs
    signal input noradA;
    signal input noradB;

    // Public input: distance threshold in meters
    signal input R_m;

    // Public outputs
    signal output commitmentA;
    signal output commitmentB;
    signal output proximity;
    signal output dist_sq_m;

    // ---- 1. Poseidon commitments of NORAD IDs ----
    component poseA = Poseidon(1);
    poseA.inputs[0] <== noradA;
    commitmentA <== poseA.out;

    component poseB = Poseidon(1);
    poseB.inputs[0] <== noradB;
    commitmentB <== poseB.out;

    // ---- 2. Relative position (meters) ----
    signal rel_x;
    signal rel_y;
    signal rel_z;
    rel_x <== satA_x - satB_x;
    rel_y <== satA_y - satB_y;
    rel_z <== satA_z - satB_z;

    // ---- 3. Squared distance (m^2) — split into separate quadratic
    //         constraints because R1CS requires each constraint to be
    //         a single product of linear forms.
    signal rel_x_sq;
    signal rel_y_sq;
    signal rel_z_sq;
    signal dist_sq;

    rel_x_sq <== rel_x * rel_x;
    rel_y_sq <== rel_y * rel_y;
    rel_z_sq <== rel_z * rel_z;
    dist_sq  <== rel_x_sq + rel_y_sq + rel_z_sq;
    dist_sq_m <== dist_sq;

    // ---- 4. Threshold comparison: proximity = 1 iff dist_sq <= R_m^2 ----
    signal R_sq;
    R_sq <== R_m * R_m;

    component lt = LessThan(64);
    lt.in[0] <== dist_sq;
    lt.in[1] <== R_sq;
    proximity <== lt.out;
}

component main { public [R_m] } = ProximityVerify();
