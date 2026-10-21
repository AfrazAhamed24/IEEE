// UNVERIFIED — USER MUST COMPILE
import React from 'react';
import { useStore } from '../lib/store';

type Speed = '1x' | '8x' | '60x';

interface ScrubberProps {
  onSpeedChange: (speed: Speed) => void;
}

export const Scrubber: React.FC<ScrubberProps> = ({ onSpeedChange }) => {
  const { t, riskState, selectedSatId, selectedConjId } = useStore();
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<Speed>('1x');
  const [value, setValue] = React.useState(0); // ms offset from TCA, -30min to +30min

  const MIN_MS = 30 * 60 * 1000;
  const MAX_MS = 30 * 60 * 1000;

  // Speed multipliers
  const speedMultipliers: Record<Speed, number> = {
    '1x': 1,
    '8x': 8,
    '60x': 60,
  };

  // Handle speed change
  React.useEffect(() => {
    if (!playing) return;
    const multiplier = speedMultipliers[speed];
    setInterval(() => {
      if (!playing) return;
      setValue((v) => {
        const newV = v + multiplier;
        return Math.max(MIN_MS * -1, Math.min(MAX_MS, newV));
      });
    }, 1000 / 60); // 60fps game loop
    return () => setPlaying(false);
  }, [speed, playing]);

  const handlePlayPause = () => {
    setPlaying((p) => {
      const next = !p;
      if (next) {
        // Start the game loop
        const multiplier = speedMultipliers[speed];
        const id = setInterval(() => {
          setValue((v) => {
            const newV = v + multiplier;
            return Math.max(MIN_MS * -1, Math.min(MAX_MS, newV));
          });
        }, 1000 / 60);
        return next;
      }
      return next;
    });
  };

  const handleStepBack = () => {
    setValue((v) => Math.max(MIN_MS * -1, v - 60_000));
  };

  const handleStepForward = () => {
    setValue((v) => Math.min(MAX_MS, v + 60_000));
  };

  const handleJumpToTCA = () => {
    setValue(0);
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clickedMs = parseFloat(e.target.value);
    setValue(clickedMs);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = e.target.value as Speed;
    setSpeed(newSpeed);
    onSpeedChange(newSpeed);
  };

  return React.createElement(
    'div',
    { className: 'scrubber' },
    React.createElement(
      'button',
      {
        className: 'scrubber-btn',
        onClick: handlePlayPause,
        disabled: playing,
      },
      playing ? '⏸ Pause' : '▶ Play'
    ),
    React.createElement(
      'button',
      {
        className: 'scrubber-btn',
        onClick: handleStepBack,
        title: 'Step back 1 min',
      },
      '◀'
    ),
    React.createElement(
      'button',
      {
        className: 'scrubber-btn',
        onClick: handleStepForward,
        title: 'Step forward 1 min',
      },
      '▶'
    ),
    React.createElement('input', {
      type: 'range',
      min: MIN_MS * -1,
      max: MAX_MS,
      value: value,
      onChange: handleRangeChange,
      className: 'scrubber-range',
    }),
    React.createElement(
      'select',
      { className: 'scrubber-speed', onChange: handleSpeedChange },
      React.createElement('option', { value: '1x' }, '1x'),
      React.createElement('option', { value: '8x' }, '8x'),
      React.createElement('option', { value: '60x' }, '60x')
    )
  );
};