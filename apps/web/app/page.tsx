import React from 'react';
import { Header } from '../components/Header';
import { SatelliteList } from '../components/SatelliteList';
import { Earth } from '../components/Earth/Earth';
import { Encounter } from '../components/Encounter/Encounter';
import { Ledger } from '../components/Ledger/Ledger';
import { Scrubber } from '../components/Scrubber';
import { useStore } from '../lib/store';

export const Page: React.FC = () => {
  const { selectedConjId } = useStore();

  // sample buffer for the Encounter view — replaced by worker data in full app
  const samples = React.useMemo(
    () => new Float32Array(100 * 10),
    []
  );

  return (
    <div className="page">
      <Header />
      <div className="layout">
        <aside className="layout-sidebar">
          <SatelliteList />
        </aside>
        <main className="layout-main">
          {selectedConjId ? <Encounter samples={samples} /> : <Earth />}
        </main>
        <aside className="layout-inspector">
          <Ledger />
        </aside>
      </div>
      <Scrubber onSpeedChange={() => {}} />
      <div className="state-vignette" aria-hidden="true" />
    </div>
  );
};
