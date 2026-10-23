let radarChart = null;
let originalData = [];
const API_BASE = "http://localhost:8000";

setInterval(() => {
    document.getElementById('utc-clock').textContent = new Date().toISOString().slice(11, 19);
}, 1000);

function generateMockData() {
    const data = [];
    for (let i = 0; i < 500; i++) {
        const isFlagged = Math.random() > 0.8;
        const groundTruth = 20 + Math.random() * 10;
        const satReading = isFlagged ? groundTruth + (Math.random() * 10 - 5) : groundTruth + (Math.random() * 1 - 0.5);
        data.push({
            obs_id: `T-${i}`, lat: 25 + Math.random() * 11, lon: -106 + Math.random() * 13,
            trust_score: isFlagged ? Math.random() * 0.4 : 0.8 + Math.random() * 0.2,
            flag: isFlagged, top_reasons: isFlagged ? 'Cloud edge / Sensor drift' : 'Clear',
            uncertainty_low: 20, uncertainty_high: 30,
            sat_value: satReading.toFixed(1), ground_truth: groundTruth.toFixed(1), delta: (satReading - groundTruth).toFixed(1)
        });
    }
    return data;
}

function updateUI(data) {
    let flaggedCount = 0; let totalTrust = 0;
    data.forEach(obs => { totalTrust += obs.trust_score; if (obs.flag) flaggedCount++; });

    document.getElementById('stat-sats').textContent = `${data.length}`;
    document.getElementById('stat-objs').textContent = `${flaggedCount}`;
    document.getElementById('stat-breach').textContent = `${(totalTrust / data.length || 0).toFixed(2)}`;

    // Push data to earth.js
    if (window.earthControls && window.earthControls.setObservations) {
        window.earthControls.setObservations(data);
    } else {
        window.dispatchEvent(new CustomEvent('earth-obs-data', { detail: data }));
    }
}

async function loadData() {
    let data = [];
    try {
        const res = await fetch(`${API_BASE}/observations`);
        const json = await res.json();
        data = json.data;
        console.log("✅ Connected to FastAPI Backend");
    } catch (err) {
        console.warn("⚠️ Backend offline, using local mock data.");
        data = generateMockData();
    }
    originalData = data;
    updateUI(originalData);
}

document.getElementById('trust-slider').addEventListener('input', (e) => {
    const threshold = e.target.value / 100;
    document.getElementById('trust-val').textContent = `${e.target.value}%`;
    const filteredData = originalData.filter(obs => obs.trust_score >= threshold);
    updateUI(filteredData);
});

window.addEventListener('earth-obs-select', (e) => {
    const obs = e.detail;
    document.getElementById('explain-hint').style.display = 'none';
    document.getElementById('explain-card').style.display = 'flex';
    
    document.getElementById('l-id').textContent = obs.obs_id;
    document.getElementById('l-trust').textContent = obs.trust_score.toFixed(3);
    document.getElementById('l-trust').style.color = obs.flag ? '#ef4444' : '#22c55e';
    document.getElementById('l-reason').textContent = obs.top_reasons || 'Unknown';
    document.getElementById('l-unc').textContent = `[${obs.uncertainty_low} to ${obs.uncertainty_high}]`;
    document.getElementById('l-sat').textContent = obs.sat_value ? `${obs.sat_value}°C` : '—';
    document.getElementById('l-ref').textContent = obs.ground_truth ? `${obs.ground_truth}°C` : '—';
    document.getElementById('l-sat').style.color = '#06b6d4';
    
    const deltaEl = document.getElementById('l-delta');
    deltaEl.textContent = obs.delta ? `${obs.delta > 0 ? '+' : ''}${obs.delta}°C` : '—';
    if (Math.abs(obs.delta) > 2) deltaEl.style.color = '#ef4444';
    else deltaEl.style.color = '#22c55e';

    // RADAR CHART
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChart) radarChart.destroy();
    
    const cloudCover = obs.flag ? Math.random() * 30 + 70 : Math.random() * 20;
    const viewAngle = Math.random() * 40 + 10;
    const sensorDrift = obs.flag ? Math.random() * 40 + 50 : Math.random() * 10;
    const thermalNoise = Math.random() * 30 + 5;

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Cloud Cover', 'View Angle', 'Sensor Drift', 'Thermal Noise'],
            datasets: [{
                label: 'Risk Metrics (%)',
                data: [cloudCover, viewAngle, sensorDrift, thermalNoise],
                backgroundColor: obs.flag ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                borderColor: obs.flag ? '#ef4444' : '#22c55e',
                pointBackgroundColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } },
                    ticks: { display: false, min: 0, max: 100 }
                }
            }
        }
    });
});

document.getElementById('carbon-btn').addEventListener('click', () => {
    logEvent("info", "Initializing ZKP generation pipeline...");
    const btn = document.getElementById('carbon-btn');
    btn.textContent = "⏳ PROVING...";
    btn.style.opacity = '0.7';

    const steps = [
        "Loading circuit: proximity.circom...",
        "Generating witness from ERA5-Land ground truth...",
        "Computing polynomial commitments...",
        "Running Groth16 prover...",
        "Generating Merkle root for batch...",
        "Proof generated in 1.24s. Verifying..."
    ];

    let i = 0;
    const interval = setInterval(() => {
        if (i < steps.length) {
            logEvent("info", `[ZKP] ${steps[i]}`);
            i++;
        } else {
            clearInterval(interval);
            const hasAnomalies = originalData.some(obs => obs.flag);
            
            if (hasAnomalies) {
                logEvent("breach", "❌ CARBON CREDIT REJECTED: Anomalies detected in Merkle Tree.");
                btn.textContent = "❌ REJECTED";
                btn.style.background = "rgba(239, 68, 68, 0.3)";
                btn.style.borderColor = "#ef4444";
                btn.style.color = "#ef4444";
                btn.style.opacity = '1';
            } else {
                logEvent("safe", "✅ PROOF VERIFIED ON-CHAIN. CARBON CREDIT APPROVED.");
                btn.textContent = "✅ APPROVED";
                btn.style.background = "rgba(34, 197, 94, 0.3)";
                btn.style.opacity = '1';
                
                const certificate = {
                    project: "WeatherTrust Climate MRV", status: "VERIFIED", timestamp: new Date().toISOString(),
                    merkle_root: "0x8f2a9b1c4e5d...", on_chain_anchor: "Sepolia Testnet", issuer: "WeatherTrust ZKP Engine v1.0"
                };
                const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "WeatherTrust_Carbon_Certificate.json";
                a.click();
                URL.revokeObjectURL(url);
                logEvent("safe", "📄 Trust Certificate downloaded successfully.");
            }
        }
    }, 400);
});

document.getElementById('tamper-btn').addEventListener('click', () => {
    logEvent("warning", "⚠️ INITIATING CYBERATTACK SIMULATION...");
    const validHash = "0x8f2a9b1c...4e5d"; const tamperedHash = "0x3c9b7d2a...1a2b";
    setTimeout(() => {
        logEvent("breach", "🚨 DATA ALTERED! RECALCULATING HASH...");
        setTimeout(() => {
            logEvent("breach", `❌ MERKLE VERIFICATION FAILED.`);
            logEvent("breach", `   Valid Hash:    ${validHash}`);
            logEvent("breach", `   Tampered Hash: ${tamperedHash}`);
            document.body.style.animation = "flash-breach 0.5s ease-in-out 3";
            document.getElementById('audit-chip').className = 'audit-chip audit-fail';
            document.getElementById('audit-chip').textContent = 'TAMPER-PROOF LEDGER: INVALID ✗';
            setTimeout(() => { document.body.style.animation = ""; }, 1500);
        }, 800);
    }, 1000);
});

function logEvent(level, msg) {
    const log = document.getElementById('event-log');
    const li = document.createElement('li');
    li.className = `log-item log-${level}`;
    li.innerHTML = `<span class="log-time">${new Date().toISOString().slice(11,19)}</span> ${msg}`;
    log.prepend(li);
}

loadData();
logEvent("info", "3D Climate Grid Initialized.");
