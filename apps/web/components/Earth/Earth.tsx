import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../lib/store';

// ─── Hardcoded carbon plume regions (real cities, real annual MtCO2) ───
const PLUME_REGIONS: Array<{ name: string; lat: number; lon: number; mt: number }> = [
  { name: 'Rotterdam', lat: 51.92, lon: 4.48, mt: 30 },
  { name: 'Houston', lat: 29.76, lon: -95.36, mt: 25 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47, mt: 40 },
  { name: 'Jebel Ali', lat: 25.01, lon: 55.06, mt: 20 },
  { name: 'Yokohama', lat: 35.44, lon: 139.64, mt: 22 },
  { name: 'Antwerp', lat: 51.22, lon: 4.40, mt: 18 },
  { name: 'Singapore', lat: 1.35, lon: 103.82, mt: 28 },
  { name: 'Busan', lat: 35.18, lon: 129.08, mt: 15 },
  { name: 'Hamburg', lat: 53.55, lon: 9.99, mt: 12 },
  { name: 'Los Angeles', lat: 34.05, lon: -118.24, mt: 20 },
];

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Earth sphere ───
const EarthSphere: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#0a1a2e"
        emissive="#0d2438"
        emissiveIntensity={0.6}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
};

// ─── Atmosphere rim (slightly larger transparent sphere, additive) ───
const Atmosphere: React.FC = () => (
  <mesh scale={1.02}>
    <sphereGeometry args={[1, 64, 64]} />
    <meshBasicMaterial
      color="#06b6d4"
      transparent
      opacity={0.08}
      side={THREE.BackSide}
      blending={THREE.AdditiveBlending}
    />
  </mesh>
);

// ─── Satellites as instanced points ───
const Satellites: React.FC<{ positions: Float32Array }> = ({ positions }) => {
  const ref = useRef<THREE.Points>(null);
  const count = positions.length / 3;

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  if (count === 0) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#06b6d4"
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  );
};

// ─── Debris (500 dim red points) ───
const Debris: React.FC = () => {
  const positions = useMemo(() => {
    const arr = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const r = 1.05 + Math.random() * 0.15;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      arr[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi);
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ef4444"
        size={0.015}
        sizeAttenuation
        transparent
        opacity={0.5}
      />
    </points>
  );
};

// ─── Carbon plumes — points rising from surface ───
const CarbonPlumes: React.FC = () => {
  const positions = useMemo(() => {
    const totalPoints = PLUME_REGIONS.length * 30;
    const arr = new Float32Array(totalPoints * 3);
    let idx = 0;
    for (const region of PLUME_REGIONS) {
      const base = latLonToVec3(region.lat, region.lon, 1.0);
      const height = Math.min(region.mt / 40, 1) * 0.35;
      for (let p = 0; p < 30; p++) {
        const t = p / 29;
        const jitter = 0.02;
        arr[idx++] = base.x * (1 + t * height) + (Math.random() - 0.5) * jitter;
        arr[idx++] = base.y * (1 + t * height) + (Math.random() - 0.5) * jitter;
        arr[idx++] = base.z * (1 + t * height) + (Math.random() - 0.5) * jitter;
      }
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#f59e0b"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// ─── Scene root ───
const Scene: React.FC = () => {
  const satellites = useStore((s) => s.satellites);

  // Convert satellite TLEs to positions along the equator for now.
  // Real SGP4 positions come from the worker — this is a visual placeholder.
  const satPositions = useMemo(() => {
    const n = satellites.length || 12;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const r = 1.15;
      arr[i * 3 + 0] = Math.cos(angle) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    return arr;
  }, [satellites.length]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#06b6d4" />
      <EarthSphere />
      <Atmosphere />
      <Satellites positions={satPositions} />
      <Debris />
      <CarbonPlumes />
      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={12}
        autoRotate={false}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
};

// ─── Public component ───
export const Earth: React.FC = () => {
  return (
    <div className="earth-container">
      <Canvas
        camera={{ position: [8, 4, 8] as [number, number, number], fov: 45 }}
        style={{ background: '#0a0e1a' }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
