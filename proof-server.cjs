// UNVERIFIED — USER MUST COMPILE
// CommonJS bridge: takes two satellite states, runs snarkjs groth16 fullprove,
// returns { proof, publicSignals } ready for ClimateSentinel.verifyAndAnchor.

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const ROOT = __dirname;
const WASM = path.join(ROOT, 'build/proximity_js/proximity.wasm');
const ZKEY = path.join(ROOT, 'keys/proximity_final.zkey');

// Hardcoded NORAD IDs. In production these come from the selected conjunction.
const NORAD_A = '49044'; // Sentinel-5P
const NORAD_B = '49260'; // Landsat-9

// 8 sample conjunctions: positions in METERS as decimal strings.
// Format: { satA: {x,y,z}, satB: {x,y,z}, R_m, label }
// Distances vary so some produce proximity=1, some =0.
const SAMPLES = [
  { satA: {x:'0',y:'0',z:'0'}, satB: {x:'100',y:'0',z:'0'},   R_m:'200000', label:'close-100m' },
  { satA: {x:'0',y:'0',z:'0'}, satB: {x:'1000',y:'500',z:'0'},R_m:'200000', label:'close-1km' },
  { satA: {x:'0',y:'0',z:'0'}, satB: {x:'50000',y:'0',z:'0'}, R_m:'200000', label:'mid-50km' },
  { satA: {x:'0',y:'0',z:'0'}, satB: {x:'150000',y:'0',z:'0'},R_m:'200000', label:'near-limit-150km' },
  { satA: {x:'0',y:'0',z:'0'}, satB: {x:'250000',y:'0',z:'0'},R_m:'200000', label:'outside-250km' },
  { satA: {x:'0',y:'0',z:'0'}, satB: {x:'500000',y:'0',z:'0'},R_m:'200000', label:'far-500km' },
  { satA: {x:'1000',y:'1000',z:'1000'}, satB: {x:'2000',y:'1000',z:'1000'}, R_m:'200000', label:'offset-1km' },
  { satA: {x:'0',y:'0',z:'0'}, satB: {x:'199000',y:'0',z:'0'}, R_m:'200000', label:'just-inside' },
];

function generateProof(satA, satB, R_m) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-'));
  const inputPath  = path.join(tmp, 'input.json');
  const proofPath  = path.join(tmp, 'proof.json');
  const publicPath = path.join(tmp, 'public.json');

  const input = {
    satA_x: satA.x, satA_y: satA.y, satA_z: satA.z,
    satB_x: satB.x, satB_y: satB.y, satB_z: satB.z,
    noradA: NORAD_A, noradB: NORAD_B,
    R_m: R_m,
  };
  fs.writeFileSync(inputPath, JSON.stringify(input));

  const cmd = `snarkjs groth16 fullprove ${inputPath} ${WASM} ${ZKEY} ${proofPath} ${publicPath}`;
  execSync(cmd, { stdio: 'pipe' });

  const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
  const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));

  fs.rmSync(tmp, { recursive: true, force: true });

  return {
    proof: {
      pA: proof.pi_a.slice(0, 2),
      pB: [proof.pi_b[0].slice(0, 2), proof.pi_b[1].slice(0, 2)],
      pC: proof.pi_c.slice(0, 2),
    },
    publicSignals,
  };
}

// ── CLI mode ───────────────────────────────────────────────────
if (require.main === module && !process.argv.includes('--serve')) {
  try {
    const s = SAMPLES[0];
    const result = generateProof(s.satA, s.satB, s.R_m);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Proof generation failed:', err.message);
    process.exit(1);
  }
}

// ── Serve mode ─────────────────────────────────────────────────
if (process.argv.includes('--serve')) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/proof') {
      const conjId = parseInt(url.searchParams.get('conjId') || '0', 10);
      const s = SAMPLES[conjId];
      if (!s) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'conjunction not found' }));
        return;
      }
      try {
        const result = generateProof(s.satA, s.satB, s.R_m);
        res.end(JSON.stringify({ conjId, label: s.label, ...result }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (url.pathname === '/health') {
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  });

  const PORT = 3001;
  server.listen(PORT, () => {
    console.log(`proof-server listening on http://localhost:${PORT}`);
    console.log(`  GET /api/proof?conjId=N  (N=0..7)`);
    console.log(`  GET /health`);
  });
}
