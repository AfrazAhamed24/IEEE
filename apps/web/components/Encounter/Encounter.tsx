// UNVERIFIED — USER MUST COMPILE
import React from 'react';
import * as THREE from 'three';
import { useStore } from '../../lib/store';

type SamplesProp = {
  samples: Float32Array;
};

export const Encounter: React.FC<SamplesProp> = ({ samples }) => {
  const { riskState, selectedSatId } = useStore();

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 100);
  camera.position.set(8, 4, 8);

  // Primary hard body = wireframe sphere at origin, radius 0.1
  const primaryGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const primaryMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  const primary = new THREE.Mesh(primaryGeo, primaryMat);
  primary.name = 'primary';
  scene.add(primary);

  // Secondary trajectory = tube from 100 sampled relative-position points
  // samples: [t0, x, y, z, vx, vy, vz, sigmaR, sigmaT, sigmaN, ...]
  const tubePoints: THREE.Vector3[] = [];
  const numSamples = samples.length / 10;
  for (let i = 0; i < numSamples; i++) {
    const offset = i * 10;
    const x = samples[offset + 1];
    const y = samples[offset + 2];
    const z = samples[offset + 3];
    tubePoints.push(new THREE.Vector3(x, y, z));
  }

  // Build tube with vertex color gradient: blue (T-30m) -> white (TCA) -> red (T+30m)
  const numPoints = tubePoints.length;
  const positions = new Float32Array(numPoints * 3);
  const colors = new Float32Array(numPoints * 3);

  for (let i = 0; i < numPoints; i++) {
    const pos = tubePoints[i];
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    // Gradient: 30m before TCA = blue (0,0,1), TCA = white (1,1,1), 30m after = red (1,0,0)
    const t = i / Math.max(1, numPoints - 1);
    if (t < 0.5) {
      const factor = t * 2;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 1 - factor;
    } else {
      const factor = (t - 0.5) * 2;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1 - factor;
      colors[i * 3 + 2] = 0;
    }
  }

  const tubeGeo = new THREE.BufferGeometry();
  tubeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const tubeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.name = 'secondary-tube';
  scene.add(tube);

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  // Directional light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(200, 200);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Animation
  let angle = 0;
  React.useEffect(() => {
    const tick = () => {
      angle += 0.01;
      tube.rotation.y = angle;
      renderer.render(scene, camera);
    };
    const id = setInterval(tick, 1000 / 60);
    return () => clearInterval(id);
  }, []);

  return React.createElement('div', { className: 'encounter-container' }, 'Encounter Scene');
};