import React from 'react';
import { useStore } from '../lib/store';

type RiskState = 'safe' | 'warning' | 'breach';

const RISK_LABEL: Record<RiskState, string> = {
  safe: 'SAFE',
  warning: 'WARNING',
  breach: 'BREACH',
};

export const Header: React.FC = () => {
  const { riskState } = useStore();
  const [now, setNow] = React.useState<Date>(new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const canGenerate = riskState === 'breach';

  const handleGenerateProof = () => {
    // Real ZKP generation in the browser is not yet wired.
    // When it is, this calls snarkjs.groth16.fullProve with the witness
    // from the currently selected conjunction, then submits to the
    // ClimateSentinel contract via chain.ts.
    console.warn(
      'Generate Proof: snarkjs proof generation not yet wired. ' +
        'See circuits/proximity.circom and keys/proximity_final.zkey.'
    );
  };

  return (
    <header className="header">
      <div className="header-grid">
        <h1 className="wordmark">ORBITAL CLIMATE SENTINEL</h1>

        <div className="utc-clock">
          {now.toLocaleTimeString('en-US', {
            hour12: false,
            timeZone: 'UTC',
          })}{' '}
          UTC
        </div>

        <div className="header-right">
          <span className="risk-dot" />
          <span className="risk-text">{RISK_LABEL[riskState]}</span>
          <button
            type="button"
            onClick={handleGenerateProof}
            disabled={!canGenerate}
            className="header-button"
          >
            Generate Proof
          </button>
        </div>
      </div>
    </header>
  );
};
