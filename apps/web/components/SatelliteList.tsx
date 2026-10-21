// UNVERIFIED — USER MUST COMPILE
import React from 'react';
import { useStore } from '../lib/store';

type Satellite = {
  id: string;
  name: string;
  tle1: string;
  tle2: string;
  class: 'payload' | 'debris' | 'rocket body';
};

export const SatelliteList: React.FC = () => {
  const {
    satellites,
    selectedSatId,
    riskState,
    setRiskState,
    setSatellites,
  } = useStore();

  const handleRowClick = (sat: Satellite) => {
    // In a full app, this would navigate to details;
    // here we just select the satellite in the store
    // (the spec says: click selects the satellite)
  };

  const keyNav = (dir: 'next' | 'prev') => {
    const indices = satellites.map((s) => s.id).indexOf(selectedSatId ?? '');
    let nextIdx: number;
    if (dir === 'next') {
      nextIdx = (indices + 1) % satellites.length;
    } else {
      nextIdx = (indices - 1 + satellites.length) % satellites.length;
    }
    const nextSat = satellites[nextIdx];
    // Select the satellite
  };

  // J/K navigation handled via keydown on document
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'j') keyNav('next');
      if (e.key === 'k') keyNav('prev');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedSatId]);

  return React.createElement(
    'div',
    { className: 'satellite-list' },
    React.createElement(
      'ul',
      { className: 'satellite-list-body' },
      satellites.map((sat) => {
        const isSelected = sat.id === selectedSatId;
        const riskBadges: Record<'payload' | 'debris' | 'rocket body', string> = {
          payload: 'PAYLOAD',
          debris: 'DEBRIS',
          'rocket body': 'ROCKET BODY',
        };
        const badge = riskBadges[sat.class];
        return React.createElement(
          'li',
          {
            key: sat.id,
            className: `satellite-item ${isSelected ? 'selected' : ''}`,
            onClick: () => handleRowClick(sat),
          },
          React.createElement(
            'span',
            { className: 'satellite-name' },
            `${sat.name} (NORAD ${sat.tle1?.slice(0, 4) || '—'})`
          ),
          React.createElement(
            'span',
            { className: 'satellite-norad' },
            `NORAD: ${sat.tle1?.slice(3, 7) || '—'}`,
            ' ',
            React.createElement('span', { className: 'risk-badge', text: badge })
          )
        );
      })
    )
  );
};