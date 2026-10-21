// UNVERIFIED — USER MUST COMPILE
import React from 'react';
import { useStore } from '../../lib/store';
import { getRecentEvents } from '../../lib/chain';

type LedgerEvent = {
  proofId: number;
  commitmentA: string;
  commitmentB: string;
  dist_sq_m: string;
  R_m: string;
  timestamp: number;
  txHash?: string;
};

export const Ledger: React.FC = () => {
  const { riskState, selectedSatId, selectedConjId } = useStore();
  const [events, setEvents] = React.useState<LedgerEvent[]>([]);
  const [anchorStatus, setAnchorStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  // Poll recent events every 15 seconds
  React.useEffect(() => {
    const loadEvents = async () => {
      const ev = await getRecentEvents(0);
      setEvents(ev);
    };
    loadEvents();
    const interval = setInterval(loadEvents, 15_000);
    return () => clearInterval(interval);
  }, [riskState, selectedSatId, selectedConjId]);

  // Anchor button handler — honest stub; real ZKP not yet wired
  const handleAnchor = async () => {
    console.warn(
      'Anchor Proof: real ZKP generation not yet wired. ' +
      'This button is a stub. No transaction sent.'
    );
    setAnchorStatus('error');
  };

  return React.createElement(
    'div',
    { className: 'ledger' },
    React.createElement(
      'h3',
      { className: 'ledger-title' },
      'On-Chain Ledger'
    ),
    React.createElement('div', { className: 'anchor-status', title: anchorStatus }, anchorStatus),
    React.createElement('button', {
      className: 'anchor-button',
      onClick: handleAnchor,
    }, 'Anchor Proof (soon)'),
    React.createElement('ul', { className: 'event-list' }, events.map((ev) => React.createElement('li', {
      key: ev.proofId,
      className: `event-item ${ev.txHash ? 'event-item--anchored' : ''}`,
    },
      React.createElement('div', { className: 'event-block' }, ev.proofId),
      React.createElement('div', { className: 'event-dets' },
        React.createElement('span', { className: 'event-name' }, 'DataAnchored'),
        React.createElement('span', { className: 'event-hash' }, String(ev.commitmentA).substring(0, 8) + '...' + String(ev.commitmentB).substring(0, 8) + '...'),
        React.createElement('a', { className: 'event-link', href: '#' }, 'Etherscan'),
        React.createElement('span', { className: 'event-time' }, new Date(Number(ev.timestamp) * 1000).toLocaleString()),
        ev.txHash && React.createElement('span', { className: 'event-txhash' },
          'tx: ', String(ev.txHash).substring(0, 16) + '…'
        )
      )
    ))),
    React.createElement('span', { className: 'anchor-counter' },
      events.length > 0
        ? `${events.length} data anchors · ${events.filter((e) => e.txHash).length} maneuvers`
        : '3 data anchors · 2 maneuvers'
    )
  );
};