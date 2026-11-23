import * as THREE from "three";
import type { LabMaterialLibrary } from "./materials";
import {
  calculateDoubleSlitMetrics,
  calculateGalvanicMetrics,
  calculateHaberMetrics,
  calculateNeuronMetrics,
  calculatePcrMetrics,
  calculatePhotoelectricMetrics,
  PHOTO_METAL_WORK_FUNCTION_EV,
  wavelengthToHex,
} from "./quests";
import type { LabExperimentState, StationId } from "./types";

const BENCH_SURFACE_Y = 0.86;

export interface ComplexStationsController {
  update: (
    state: LabExperimentState,
    delta: number,
    elapsed: number,
  ) => {
    neuronPeakRecordedMv: number | null;
    pcrPhaseChanged: { cycleCount: number; phaseIndex: 0 | 1 | 2 } | null;
  };
  dispose: () => void;
}

export function buildComplexStations(
  benchGroups: Record<StationId, THREE.Group>,
  materials: LabMaterialLibrary,
  vesselGlassMat: THREE.Material,
  maxAnisotropy: number,
): ComplexStationsController {
  const disposables: { dispose: () => void }[] = [];

  // =========================================================================
  // STATION 09: YOUNG'S DOUBLE-SLIT QUANTUM INTERFERENCE (PHYSICS)
  // =========================================================================
  const dsRoot = new THREE.Group();
  dsRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.doubleslit.add(dsRoot);

  const dsRailGeo = new THREE.BoxGeometry(1.34, 0.036, 0.18);
  const dsLaserBodyGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.22, 16);
  const dsStandGeo = new THREE.BoxGeometry(0.08, 0.14, 0.08);
  const dsBeamGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.42, 10);
  const dsPlateGeo = new THREE.BoxGeometry(0.022, 0.34, 0.26);
  const dsSlitGapGeo = new THREE.BoxGeometry(0.028, 0.15, 0.012);
  const dsScreenFrameGeo = new THREE.BoxGeometry(0.032, 0.4, 0.38);
  const dsScreenFaceGeo = new THREE.PlaneGeometry(0.34, 0.36);
  const dsWaveArcGeo = new THREE.TorusGeometry(0.14, 0.0045, 8, 28, Math.PI * 0.72);

  const dsBeamMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.9,
  });
  const dsWaveMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const dsSlitMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

  // Dynamic Interference Fringe Pattern CanvasTexture
  const dsCanvas = document.createElement("canvas");
  dsCanvas.width = 256;
  dsCanvas.height = 256;
  const dsCtx = dsCanvas.getContext("2d");
  const dsTex = new THREE.CanvasTexture(dsCanvas);
  dsTex.colorSpace = THREE.SRGBColorSpace;
  dsTex.anisotropy = Math.min(8, maxAnisotropy);
  const dsScreenMat = new THREE.MeshStandardMaterial({
    map: dsTex,
    emissiveMap: dsTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    roughness: 0.4,
  });

  disposables.push(
    dsRailGeo,
    dsLaserBodyGeo,
    dsStandGeo,
    dsBeamGeo,
    dsPlateGeo,
    dsSlitGapGeo,
    dsScreenFrameGeo,
    dsScreenFaceGeo,
    dsWaveArcGeo,
    dsBeamMat,
    dsWaveMat,
    dsSlitMat,
    dsTex,
    dsScreenMat,
  );

  const dsRail = new THREE.Mesh(dsRailGeo, materials.darkIron);
  dsRail.position.y = 0.018;
  dsRail.receiveShadow = true;
  dsRoot.add(dsRail);

  const dsLaserStand = new THREE.Mesh(dsStandGeo, materials.platinumMetal);
  dsLaserStand.position.set(-0.54, 0.1, 0);
  const dsLaserBody = new THREE.Mesh(dsLaserBodyGeo, materials.darkIron);
  dsLaserBody.rotation.z = Math.PI / 2;
  dsLaserBody.position.set(-0.52, 0.21, 0);
  dsLaserBody.castShadow = true;
  dsRoot.add(dsLaserStand, dsLaserBody);

  const dsIncidentBeam = new THREE.Mesh(dsBeamGeo, dsBeamMat);
  dsIncidentBeam.rotation.z = Math.PI / 2;
  dsIncidentBeam.position.set(-0.26, 0.21, 0);
  dsRoot.add(dsIncidentBeam);

  const dsPlateGroup = new THREE.Group();
  dsPlateGroup.position.set(-0.08, 0.21, 0);
  const dsPlate = new THREE.Mesh(dsPlateGeo, materials.brassMetal);
  dsPlate.castShadow = true;
  const dsSlitTop = new THREE.Mesh(dsSlitGapGeo, dsSlitMat);
  const dsSlitBot = new THREE.Mesh(dsSlitGapGeo, dsSlitMat);
  dsSlitTop.position.set(0, 0, 0.032);
  dsSlitBot.position.set(0, 0, -0.032);
  dsPlateGroup.add(dsPlate, dsSlitTop, dsSlitBot);
  dsRoot.add(dsPlateGroup);

  // Expanding interference wavefront rings emanating from both slits
  const dsWaveRings: { mesh: THREE.Mesh; slitSign: number; phase: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const slitSign = i % 2 === 0 ? 1 : -1;
    const ring = new THREE.Mesh(dsWaveArcGeo, dsWaveMat);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = -Math.PI * 0.36;
    ring.position.set(-0.07, 0.21, slitSign * 0.032);
    dsRoot.add(ring);
    dsWaveRings.push({ mesh: ring, slitSign, phase: (i / 10) });
  }

  const dsScreenGroup = new THREE.Group();
  dsScreenGroup.position.set(0.52, 0.23, 0);
  const dsScreenFrame = new THREE.Mesh(dsScreenFrameGeo, materials.darkIron);
  dsScreenFrame.castShadow = true;
  const dsScreenFace = new THREE.Mesh(dsScreenFaceGeo, dsScreenMat);
  dsScreenFace.position.set(-0.017, 0, 0);
  dsScreenFace.rotation.y = -Math.PI / 2;
  dsScreenGroup.add(dsScreenFrame, dsScreenFace);
  dsRoot.add(dsScreenGroup);

  let lastDsSignature = "";
  const redrawDoubleSlitScreen = (
    laserOn: boolean,
    wavelengthNm: number,
    slitSepMm: number,
    screenDistM: number,
  ) => {
    const sig = `${laserOn}:${wavelengthNm}:${slitSepMm.toFixed(2)}:${screenDistM.toFixed(2)}`;
    if (sig === lastDsSignature || !dsCtx) return;
    lastDsSignature = sig;

    dsCtx.fillStyle = "#111318";
    dsCtx.fillRect(0, 0, 256, 256);

    if (laserOn) {
      const hex = wavelengthToHex(wavelengthNm);
      const r = (hex >> 16) & 255;
      const g = (hex >> 8) & 255;
      const b = hex & 255;
      const metrics = calculateDoubleSlitMetrics(wavelengthNm, slitSepMm, screenDistM);
      const betaPx = Math.max(7, Math.min(48, metrics.fringeWidthMm * 18));

      for (let x = 0; x < 256; x++) {
        const dx = x - 128;
        const inter = Math.cos((Math.PI * dx) / betaPx);
        const envArg = (dx / (betaPx * 4.4)) * Math.PI;
        const env = Math.abs(envArg) < 0.001 ? 1 : Math.sin(envArg) / envArg;
        const intensity = Math.max(0, inter * inter * env * env);
        if (intensity > 0.015) {
          dsCtx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, intensity * 1.05).toFixed(3)})`;
          dsCtx.fillRect(x, 24, 1, 168);
        }
      }

      // Live Intensity Graph along bottom of screen
      dsCtx.strokeStyle = `rgb(${r},${g},${b})`;
      dsCtx.lineWidth = 2;
      dsCtx.beginPath();
      for (let x = 0; x < 256; x += 2) {
        const dx = x - 128;
        const inter = Math.cos((Math.PI * dx) / betaPx);
        const envArg = (dx / (betaPx * 4.4)) * Math.PI;
        const env = Math.abs(envArg) < 0.001 ? 1 : Math.sin(envArg) / envArg;
        const intensity = Math.max(0, inter * inter * env * env);
        const py = 242 - intensity * 42;
        if (x === 0) dsCtx.moveTo(x, py);
        else dsCtx.lineTo(x, py);
      }
      dsCtx.stroke();

      dsCtx.fillStyle = "#E5E7EB";
      dsCtx.font = "600 13px monospace";
      dsCtx.fillText(`β = ${metrics.fringeWidthMm.toFixed(2)} mm`, 10, 18);
    } else {
      dsCtx.fillStyle = "#6B7280";
      dsCtx.font = "600 14px sans-serif";
      dsCtx.textAlign = "center";
      dsCtx.fillText("LASER OFF", 128, 128);
      dsCtx.textAlign = "left";
    }
    dsTex.needsUpdate = true;
  };

  // =========================================================================
  // STATION 10: PHOTOELECTRIC EFFECT VACUUM PHOTOTUBE (PHYSICS)
  // =========================================================================
  const peRoot = new THREE.Group();
  peRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.photoelectric.add(peRoot);

  const peBaseGeo = new THREE.BoxGeometry(1.22, 0.05, 0.56);
  const peTubeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.62, 24);
  const peCapGeo = new THREE.CylinderGeometry(0.158, 0.158, 0.04, 24);
  const peCathodeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.2, 16, 1, true, -0.7, 1.4);
  const peAnodeGeo = new THREE.TorusGeometry(0.065, 0.01, 10, 22);
  const peLampGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.14, 16);
  const pePhotonGeo = new THREE.SphereGeometry(0.015, 10, 10);
  const peElectronGeo = new THREE.SphereGeometry(0.013, 10, 10);
  const peMeterGeo = new THREE.BoxGeometry(0.24, 0.2, 0.14);
  const peNeedleGeo = new THREE.BoxGeometry(0.008, 0.085, 0.008);

  const peCathodeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.22,
    metalness: 0.88,
    side: THREE.DoubleSide,
  });
  const pePhotonMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
  const peElectronMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const peLampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x8b5cf6,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const peNeedleMat = new THREE.MeshBasicMaterial({ color: 0xd9483b });

  disposables.push(
    peBaseGeo,
    peTubeGeo,
    peCapGeo,
    peCathodeGeo,
    peAnodeGeo,
    peLampGeo,
    pePhotonGeo,
    peElectronGeo,
    peMeterGeo,
    peNeedleGeo,
    peCathodeMat,
    pePhotonMat,
    peElectronMat,
    peLampGlowMat,
    peNeedleMat,
  );

  const peBase = new THREE.Mesh(peBaseGeo, materials.darkIron);
  peBase.position.y = 0.025;
  peBase.receiveShadow = true;
  peRoot.add(peBase);

  // Evacuated Quartz Phototube
  const peTube = new THREE.Mesh(peTubeGeo, vesselGlassMat);
  peTube.rotation.z = Math.PI / 2;
  peTube.position.set(-0.1, 0.26, 0);
  peTube.renderOrder = 3;
  const peLeftCap = new THREE.Mesh(peCapGeo, materials.platinumMetal);
  peLeftCap.rotation.z = Math.PI / 2;
  peLeftCap.position.set(-0.41, 0.26, 0);
  const peRightCap = new THREE.Mesh(peCapGeo, materials.platinumMetal);
  peRightCap.rotation.z = Math.PI / 2;
  peRightCap.position.set(0.21, 0.26, 0);
  peRoot.add(peTube, peLeftCap, peRightCap);

  const peCathode = new THREE.Mesh(peCathodeGeo, peCathodeMat);
  peCathode.position.set(-0.32, 0.26, 0);
  peCathode.rotation.y = Math.PI / 2;
  const peAnode = new THREE.Mesh(peAnodeGeo, materials.copperWire);
  peAnode.position.set(0.11, 0.26, 0);
  peAnode.rotation.y = Math.PI / 2;
  peRoot.add(peCathode, peAnode);

  // Overhead UV / Visible Photon Emitter Lamp
  const peLamp = new THREE.Mesh(peLampGeo, materials.darkIron);
  peLamp.position.set(-0.18, 0.54, 0);
  peLamp.rotation.z = -0.35;
  const peLampLens = new THREE.Mesh(pePhotonGeo, peLampGlowMat);
  peLampLens.scale.set(2.4, 1.0, 2.4);
  peLampLens.position.set(-0.21, 0.47, 0);
  peRoot.add(peLamp, peLampLens);

  // Incoming photons
  const pePhotons: { mesh: THREE.Mesh; offset: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(pePhotonGeo, pePhotonMat);
    peRoot.add(p);
    pePhotons.push({ mesh: p, offset: i / 8 });
  }

  // Ejected photoelectrons
  const peElectrons: { mesh: THREE.Mesh; phase: number; laneY: number; laneZ: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const e = new THREE.Mesh(peElectronGeo, peElectronMat);
    peRoot.add(e);
    peElectrons.push({
      mesh: e,
      phase: i / 14,
      laneY: ((i % 3) - 1) * 0.042,
      laneZ: (Math.sin(i * 1.9) * 0.045),
    });
  }

  // Microammeter Box + Deflecting Needle
  const peMeter = new THREE.Mesh(peMeterGeo, materials.warmIvoryTrim);
  peMeter.position.set(0.45, 0.16, 0);
  peMeter.castShadow = true;
  const peNeedlePivot = new THREE.Group();
  peNeedlePivot.position.set(0.45, 0.12, 0.076);
  const peNeedle = new THREE.Mesh(peNeedleGeo, peNeedleMat);
  peNeedle.position.y = 0.04;
  peNeedlePivot.add(peNeedle);
  peRoot.add(peMeter, peNeedlePivot);

  // =========================================================================
  // STATION 16: HABER–BOSCH AMMONIA CATALYTIC REACTOR (CHEMISTRY)
  // =========================================================================
  const haberRoot = new THREE.Group();
  haberRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.haber.add(haberRoot);

  const haberBaseGeo = new THREE.BoxGeometry(1.16, 0.05, 0.62);
  const haberTankGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.56, 24);
  const haberDomeGeo = new THREE.SphereGeometry(0.22, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const haberCoilGeo = new THREE.TorusGeometry(0.238, 0.012, 10, 32);
  const haberTrayGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.022, 20);
  const haberMolGeo = new THREE.SphereGeometry(0.019, 10, 10);
  const haberGaugeGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 20);
  const haberNeedleGeo = new THREE.BoxGeometry(0.008, 0.055, 0.008);
  const haberCondenserGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.34, 18);
  const haberNh3PoolGeo = new THREE.CylinderGeometry(0.074, 0.074, 0.24, 16);

  const haberHeaterMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xea580c,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.7,
  });
  const haberCatalystMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    emissive: 0x92400e,
    emissiveIntensity: 0.2,
    roughness: 0.65,
    metalness: 0.8,
  });
  const n2Mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 });
  const h2Mat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const nh3Mat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.5,
    roughness: 0.25,
  });
  const liquidNh3Mat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.75,
    roughness: 0.15,
  });

  disposables.push(
    haberBaseGeo,
    haberTankGeo,
    haberDomeGeo,
    haberCoilGeo,
    haberTrayGeo,
    haberMolGeo,
    haberGaugeGeo,
    haberNeedleGeo,
    haberCondenserGeo,
    haberNh3PoolGeo,
    haberHeaterMat,
    haberCatalystMat,
    n2Mat,
    h2Mat,
    nh3Mat,
    liquidNh3Mat,
  );

  const haberBase = new THREE.Mesh(haberBaseGeo, materials.darkIron);
  haberBase.position.y = 0.025;
  haberBase.receiveShadow = true;
  haberRoot.add(haberBase);

  const haberVessel = new THREE.Mesh(haberTankGeo, vesselGlassMat);
  haberVessel.position.set(-0.14, 0.34, 0);
  haberVessel.renderOrder = 3;
  const haberCapTop = new THREE.Mesh(haberDomeGeo, materials.platinumMetal);
  haberCapTop.position.set(-0.14, 0.62, 0);
  haberCapTop.castShadow = true;
  haberRoot.add(haberVessel, haberCapTop);

  // 4 glowing heater rings around reactor
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(haberCoilGeo, haberHeaterMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.14, 0.16 + i * 0.12, 0);
    haberRoot.add(ring);
  }

  // Toggleable 3-tier Iron Catalyst Beds
  const catalystGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const tray = new THREE.Mesh(haberTrayGeo, haberCatalystMat);
    tray.position.set(-0.14, 0.2 + i * 0.14, 0);
    catalystGroup.add(tray);
  }
  haberRoot.add(catalystGroup);

  // 24 swirling gas molecules inside reactor
  const haberMolecules: {
    mesh: THREE.Mesh;
    radius: number;
    angle: number;
    yBase: number;
    speed: number;
  }[] = [];
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(haberMolGeo, i % 3 === 0 ? n2Mat : h2Mat);
    haberRoot.add(m);
    haberMolecules.push({
      mesh: m,
      radius: 0.05 + (i % 5) * 0.028,
      angle: (i / 24) * Math.PI * 2,
      yBase: 0.14 + (i / 24) * 0.42,
      speed: 1.4 + (i % 4) * 0.45,
    });
  }

  // Pressure Gauge
  const haberGauge = new THREE.Mesh(haberGaugeGeo, materials.warmIvoryTrim);
  haberGauge.rotation.x = Math.PI / 2;
  haberGauge.position.set(-0.44, 0.44, 0.08);
  const haberNeedlePivot = new THREE.Group();
  haberNeedlePivot.position.set(-0.44, 0.44, 0.1);
  const haberNeedle = new THREE.Mesh(haberNeedleGeo, peNeedleMat);
  haberNeedle.position.y = 0.022;
  haberNeedlePivot.add(haberNeedle);
  haberRoot.add(haberGauge, haberNeedlePivot);

  // Condenser Vessel collecting Liquid NH3
  const haberCondenser = new THREE.Mesh(haberCondenserGeo, vesselGlassMat);
  haberCondenser.position.set(0.34, 0.23, 0);
  haberCondenser.renderOrder = 3;
  const haberLiquidNh3 = new THREE.Mesh(haberNh3PoolGeo, liquidNh3Mat);
  haberLiquidNh3.position.set(0.34, 0.12, 0);
  haberRoot.add(haberCondenser, haberLiquidNh3);

  // =========================================================================
  // STATION 17: DANIELL GALVANIC CELL & NERNST EQUATION (CHEMISTRY)
  // =========================================================================
  const galvRoot = new THREE.Group();
  galvRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.galvanic.add(galvRoot);

  const galvBaseGeo = new THREE.BoxGeometry(1.24, 0.045, 0.58);
  const galvBeakerGeo = new THREE.CylinderGeometry(0.16, 0.15, 0.3, 22, 1, true);
  const galvSolGeo = new THREE.CylinderGeometry(0.146, 0.14, 0.21, 20);
  const galvElectrodeGeo = new THREE.BoxGeometry(0.036, 0.28, 0.09);
  const saltBridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 0.16, 0),
    new THREE.Vector3(-0.28, 0.42, 0),
    new THREE.Vector3(0, 0.48, 0),
    new THREE.Vector3(0.28, 0.42, 0),
    new THREE.Vector3(0.3, 0.16, 0),
  ]);
  const saltBridgeGeo = new THREE.TubeGeometry(saltBridgeCurve, 32, 0.026, 12, false);
  const wireCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 0.34, 0),
    new THREE.Vector3(-0.42, 0.58, 0),
    new THREE.Vector3(0, 0.62, 0),
    new THREE.Vector3(0.42, 0.58, 0),
    new THREE.Vector3(0.42, 0.34, 0),
  ]);
  const wireGeo = new THREE.TubeGeometry(wireCurve, 32, 0.008, 8, false);
  const galvBeadGeo = new THREE.SphereGeometry(0.013, 10, 10);

  const znSolMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.42,
    roughness: 0.15,
  });
  const cuSolMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.62,
    roughness: 0.15,
  });
  const znPlateMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.32,
    metalness: 0.85,
  });
  const saltGelMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.65,
    roughness: 0.2,
  });
  const galvElectronMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.9,
  });
  const galvIonMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x9333ea,
    emissiveIntensity: 0.65,
  });

  disposables.push(
    galvBaseGeo,
    galvBeakerGeo,
    galvSolGeo,
    galvElectrodeGeo,
    saltBridgeGeo,
    wireGeo,
    galvBeadGeo,
    znSolMat,
    cuSolMat,
    znPlateMat,
    saltGelMat,
    galvElectronMat,
    galvIonMat,
  );

  const galvBase = new THREE.Mesh(galvBaseGeo, materials.walnutBench);
  galvBase.position.y = 0.022;
  galvRoot.add(galvBase);

  const znBeaker = new THREE.Mesh(galvBeakerGeo, vesselGlassMat);
  znBeaker.position.set(-0.36, 0.2, 0);
  znBeaker.renderOrder = 3;
  const znSol = new THREE.Mesh(galvSolGeo, znSolMat);
  znSol.position.set(-0.36, 0.155, 0);
  const znPlate = new THREE.Mesh(galvElectrodeGeo, znPlateMat);
  znPlate.position.set(-0.42, 0.22, 0);
  znPlate.castShadow = true;

  const cuBeaker = new THREE.Mesh(galvBeakerGeo, vesselGlassMat);
  cuBeaker.position.set(0.36, 0.2, 0);
  cuBeaker.renderOrder = 3;
  const cuSol = new THREE.Mesh(galvSolGeo, cuSolMat);
  cuSol.position.set(0.36, 0.155, 0);
  const cuPlate = new THREE.Mesh(galvElectrodeGeo, materials.copperWire);
  cuPlate.position.set(0.42, 0.22, 0);
  cuPlate.castShadow = true;

  galvRoot.add(znBeaker, znSol, znPlate, cuBeaker, cuSol, cuPlate);

  // Removable KCl Salt Bridge Group
  const saltBridgeGroup = new THREE.Group();
  const saltBridgeMesh = new THREE.Mesh(saltBridgeGeo, saltGelMat);
  saltBridgeGroup.add(saltBridgeMesh);
  const saltIons: { mesh: THREE.Mesh; offset: number; dir: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const ion = new THREE.Mesh(galvBeadGeo, galvIonMat);
    saltBridgeGroup.add(ion);
    saltIons.push({ mesh: ion, offset: i / 8, dir: i % 2 === 0 ? 1 : -1 });
  }
  galvRoot.add(saltBridgeGroup);

  // Overhead wire + flowing electrons + central Voltmeter
  const galvWire = new THREE.Mesh(wireGeo, materials.copperWire);
  galvRoot.add(galvWire);
  const galvElectrons: { mesh: THREE.Mesh; offset: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const el = new THREE.Mesh(galvBeadGeo, galvElectronMat);
    galvRoot.add(el);
    galvElectrons.push({ mesh: el, offset: i / 10 });
  }

  const galvMeter = new THREE.Mesh(peMeterGeo, materials.warmIvoryTrim);
  galvMeter.position.set(0, 0.62, 0);
  const galvNeedlePivot = new THREE.Group();
  galvNeedlePivot.position.set(0, 0.58, 0.076);
  const galvNeedle = new THREE.Mesh(peNeedleGeo, peNeedleMat);
  galvNeedle.position.y = 0.04;
  galvNeedlePivot.add(galvNeedle);
  galvRoot.add(galvMeter, galvNeedlePivot);

  // =========================================================================
  // STATION 23: ACTION POTENTIAL & SYNAPTIC NEUROTRANSMISSION (BIOLOGY)
  // =========================================================================
  const neuronRoot = new THREE.Group();
  neuronRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.neuron.add(neuronRoot);

  const neuroBaseGeo = new THREE.BoxGeometry(1.36, 0.04, 0.56);
  const axonGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.88, 20);
  const myelinGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.14, 18);
  const channelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.055, 10);
  const pulseRingGeo = new THREE.TorusGeometry(0.095, 0.016, 10, 24);
  const terminalGeo = new THREE.SphereGeometry(0.11, 20, 16);
  const dendriteGeo = new THREE.CylinderGeometry(0.11, 0.065, 0.14, 18);
  const vesicleGeo = new THREE.SphereGeometry(0.013, 8, 8);
  const scopeBoxGeo = new THREE.BoxGeometry(0.36, 0.24, 0.06);
  const scopeFaceGeo = new THREE.PlaneGeometry(0.32, 0.2);

  const axonMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.6,
    roughness: 0.25,
  });
  const myelinMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    roughness: 0.42,
    metalness: 0.04,
  });
  const naChannelMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.3,
  });
  const kChannelMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
  });
  const spikeRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
  });
  const vesicleMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.65,
  });

  const scopeCanvas = document.createElement("canvas");
  scopeCanvas.width = 256;
  scopeCanvas.height = 160;
  const scopeCtx = scopeCanvas.getContext("2d");
  const scopeTex = new THREE.CanvasTexture(scopeCanvas);
  scopeTex.colorSpace = THREE.SRGBColorSpace;
  const scopeMat = new THREE.MeshStandardMaterial({
    map: scopeTex,
    emissiveMap: scopeTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
  });

  disposables.push(
    neuroBaseGeo,
    axonGeo,
    myelinGeo,
    channelGeo,
    pulseRingGeo,
    terminalGeo,
    dendriteGeo,
    vesicleGeo,
    scopeBoxGeo,
    scopeFaceGeo,
    axonMat,
    myelinMat,
    naChannelMat,
    kChannelMat,
    spikeRingMat,
    vesicleMat,
    scopeTex,
    scopeMat,
  );

  const neuroBase = new THREE.Mesh(neuroBaseGeo, materials.darkIron);
  neuroBase.position.y = 0.02;
  neuronRoot.add(neuroBase);

  const axonMesh = new THREE.Mesh(axonGeo, axonMat);
  axonMesh.rotation.z = Math.PI / 2;
  axonMesh.position.set(-0.14, 0.25, 0);
  neuronRoot.add(axonMesh);

  // 4 toggleable Myelin Sheaths separated by Nodes of Ranvier
  const myelinMeshes: THREE.Mesh[] = [];
  [-0.46, -0.25, -0.04, 0.17].forEach((mx) => {
    const m = new THREE.Mesh(myelinGeo, myelinMat);
    m.rotation.z = Math.PI / 2;
    m.position.set(mx, 0.25, 0);
    m.castShadow = true;
    neuronRoot.add(m);
    myelinMeshes.push(m);
  });

  // Voltage-gated Na+ and K+ channels at Nodes of Ranvier
  const ionChannels: { mesh: THREE.Mesh; x: number; isNa: boolean }[] = [];
  [-0.355, -0.145, 0.065].forEach((nx) => {
    const na = new THREE.Mesh(channelGeo, naChannelMat);
    na.position.set(nx, 0.315, 0.02);
    const k = new THREE.Mesh(channelGeo, kChannelMat);
    k.position.set(nx, 0.185, -0.02);
    neuronRoot.add(na, k);
    ionChannels.push({ mesh: na, x: nx, isNa: true }, { mesh: k, x: nx, isNa: false });
  });

  // Traveling Action Potential Ring
  const spikeRing = new THREE.Mesh(pulseRingGeo, spikeRingMat);
  spikeRing.rotation.y = Math.PI / 2;
  spikeRing.position.set(-0.55, 0.25, 0);
  spikeRing.visible = false;
  neuronRoot.add(spikeRing);

  // Presynaptic Bulb + Synaptic Cleft + Postsynaptic Dendrite
  const preBulb = new THREE.Mesh(terminalGeo, axonMat);
  preBulb.position.set(0.34, 0.25, 0);
  preBulb.scale.set(1.1, 0.9, 0.9);
  const postDendrite = new THREE.Mesh(dendriteGeo, materials.lavenderAccent);
  postDendrite.rotation.z = Math.PI / 2;
  postDendrite.position.set(0.56, 0.25, 0);
  neuronRoot.add(preBulb, postDendrite);

  const vesicles: { mesh: THREE.Mesh; offsetY: number; offsetZ: number; delay: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const v = new THREE.Mesh(vesicleGeo, vesicleMat);
    v.visible = false;
    neuronRoot.add(v);
    vesicles.push({
      mesh: v,
      offsetY: Math.sin(i * 2.3) * 0.055,
      offsetZ: Math.cos(i * 1.7) * 0.055,
      delay: (i % 4) * 0.05,
    });
  }

  // Oscilloscope Display mounted at back of bench
  const scopeBox = new THREE.Mesh(scopeBoxGeo, materials.darkIron);
  scopeBox.position.set(-0.1, 0.56, -0.18);
  const scopeFace = new THREE.Mesh(scopeFaceGeo, scopeMat);
  scopeFace.position.set(-0.1, 0.56, -0.148);
  neuronRoot.add(scopeBox, scopeFace);

  let lastNeuronPulse = 0;
  let neuronAnimProgress = -1;
  let neuronAnimFires = false;
  let neuronAnimPeakMv = -60;
  let neuronRecordedForPulse = false;

  const drawOscilloscope = (progress: number, fires: boolean, peakMv: number) => {
    if (!scopeCtx) return;
    scopeCtx.fillStyle = "#0B1220";
    scopeCtx.fillRect(0, 0, 256, 160);

    // Threshold line (-55 mV)
    scopeCtx.strokeStyle = "rgba(251, 191, 36, 0.45)";
    scopeCtx.setLineDash([4, 4]);
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, 112);
    scopeCtx.lineTo(256, 112);
    scopeCtx.stroke();
    scopeCtx.setLineDash([]);

    // Waveform
    scopeCtx.strokeStyle = fires ? "#38BDF8" : "#94A3B8";
    scopeCtx.lineWidth = 2.5;
    scopeCtx.beginPath();
    const maxDrawX = progress < 0 ? 256 : Math.min(256, Math.round(progress * 256));
    for (let x = 0; x <= maxDrawX; x += 2) {
      const t = x / 256;
      let mv = -70;
      if (t > 0.16 && t < 0.72) {
        if (fires) {
          if (t < 0.3) {
            const u = (t - 0.16) / 0.14;
            mv = -70 + (peakMv + 70) * Math.pow(u, 1.8);
          } else if (t < 0.48) {
            const u = (t - 0.3) / 0.18;
            mv = peakMv - (peakMv + 85) * u;
          } else {
            const u = (t - 0.48) / 0.24;
            mv = -85 + 15 * u;
          }
        } else {
          const bump = Math.sin(((t - 0.16) / 0.56) * Math.PI);
          mv = -70 + Math.max(0, peakMv + 70) * bump;
        }
      }
      // Map -90..+50 mV to y=148..22
      const py = 148 - ((mv + 90) / 140) * 126;
      if (x === 0) scopeCtx.moveTo(x, py);
      else scopeCtx.lineTo(x, py);
    }
    scopeCtx.stroke();

    scopeCtx.fillStyle = "#E2E8F0";
    scopeCtx.font = "600 12px monospace";
    scopeCtx.fillText(
      fires ? `PEAK: +${peakMv.toFixed(0)} mV (SPIKE)` : `SUB-THRESHOLD: ${peakMv.toFixed(0)} mV`,
      8,
      16,
    );
    scopeTex.needsUpdate = true;
  };
  drawOscilloscope(-1, false, -62);

  // =========================================================================
  // STATION 24: PCR THERMAL CYCLER & UV AGAROSE GEL (BIOLOGY)
  // =========================================================================
  const pcrRoot = new THREE.Group();
  pcrRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.pcr.add(pcrRoot);

  const pcrBodyGeo = new THREE.BoxGeometry(0.54, 0.2, 0.44);
  const pcrWellBlockGeo = new THREE.BoxGeometry(0.36, 0.04, 0.28);
  const pcrRingGeo = new THREE.TorusGeometry(0.17, 0.014, 10, 32);
  const pcrTubeGeo = new THREE.CylinderGeometry(0.02, 0.012, 0.08, 12);
  const pcrStrandGeo = new THREE.BoxGeometry(0.56, 0.016, 0.016);
  const pcrPrimerGeo = new THREE.BoxGeometry(0.12, 0.024, 0.024);
  const pcrTaqGeo = new THREE.SphereGeometry(0.028, 14, 14);
  const gelTrayGeo = new THREE.BoxGeometry(0.38, 0.06, 0.34);
  const gelSlabGeo = new THREE.BoxGeometry(0.32, 0.032, 0.28);
  const gelBandGeo = new THREE.BoxGeometry(0.09, 0.012, 0.022);

  const pcrTempRingMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.85,
  });
  const templateStrandMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.35,
  });
  const daughterStrandMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.45,
  });
  const primerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
  });
  const taqMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x9333ea,
    emissiveIntensity: 0.75,
  });
  const gelSlabMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    transparent: true,
    opacity: 0.88,
    roughness: 0.2,
  });
  const gelBandMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.1,
  });
  const ladderBandMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.4,
  });

  disposables.push(
    pcrBodyGeo,
    pcrWellBlockGeo,
    pcrRingGeo,
    pcrTubeGeo,
    pcrStrandGeo,
    pcrPrimerGeo,
    pcrTaqGeo,
    gelTrayGeo,
    gelSlabGeo,
    gelBandGeo,
    pcrTempRingMat,
    templateStrandMat,
    daughterStrandMat,
    primerMat,
    taqMat,
    gelSlabMat,
    gelBandMat,
    ladderBandMat,
  );

  // Thermal Cycler Hardware (Left side of bench)
  const pcrBody = new THREE.Mesh(pcrBodyGeo, materials.warmIvoryTrim);
  pcrBody.position.set(-0.28, 0.1, 0);
  pcrBody.castShadow = true;
  const pcrBlock = new THREE.Mesh(pcrWellBlockGeo, materials.platinumMetal);
  pcrBlock.position.set(-0.28, 0.22, 0);
  const pcrTempRing = new THREE.Mesh(pcrRingGeo, pcrTempRingMat);
  pcrTempRing.rotation.x = Math.PI / 2;
  pcrTempRing.position.set(-0.28, 0.245, 0);
  pcrRoot.add(pcrBody, pcrBlock, pcrTempRing);

  // 6 Microcentrifuge PCR tubes inside block
  for (let i = 0; i < 6; i++) {
    const tube = new THREE.Mesh(pcrTubeGeo, vesselGlassMat);
    tube.position.set(-0.38 + (i % 3) * 0.1, 0.27, i < 3 ? -0.05 : 0.05);
    pcrRoot.add(tube);
  }

  // Hovering 3D DNA Amplification Stage above Thermal Cycler
  const pcrDnaStage = new THREE.Group();
  pcrDnaStage.position.set(-0.28, 0.5, 0);
  const topStrand = new THREE.Mesh(pcrStrandGeo, templateStrandMat);
  const botStrand = new THREE.Mesh(pcrStrandGeo, templateStrandMat);
  const primerTop = new THREE.Mesh(pcrPrimerGeo, primerMat);
  const primerBot = new THREE.Mesh(pcrPrimerGeo, primerMat);
  const daughterTop = new THREE.Mesh(pcrStrandGeo, daughterStrandMat);
  const daughterBot = new THREE.Mesh(pcrStrandGeo, daughterStrandMat);
  const taqTop = new THREE.Mesh(pcrTaqGeo, taqMat);
  const taqBot = new THREE.Mesh(pcrTaqGeo, taqMat);
  pcrDnaStage.add(
    topStrand,
    botStrand,
    primerTop,
    primerBot,
    daughterTop,
    daughterBot,
    taqTop,
    taqBot,
  );
  pcrRoot.add(pcrDnaStage);

  // Mini UV Agarose Gel Electrophoresis Box (Right side of bench)
  const gelTray = new THREE.Mesh(gelTrayGeo, materials.darkIron);
  gelTray.position.set(0.36, 0.03, 0);
  const gelSlab = new THREE.Mesh(gelSlabGeo, gelSlabMat);
  gelSlab.position.set(0.36, 0.075, 0);
  pcrRoot.add(gelTray, gelSlab);

  // DNA Ladder reference bands (left lane)
  [-0.08, -0.02, 0.04, 0.09].forEach((lz) => {
    const lb = new THREE.Mesh(gelBandGeo, ladderBandMat);
    lb.position.set(0.28, 0.094, lz);
    pcrRoot.add(lb);
  });
  // Amplified Target DNA band (right lane — glows brighter every cycle!)
  const targetGelBand = new THREE.Mesh(gelBandGeo, gelBandMat);
  targetGelBand.position.set(0.43, 0.094, 0.01);
  pcrRoot.add(targetGelBand);

  let pcrPhaseClock = 0;

  return {
    update: (state, delta, elapsed) => {
      let neuronPeakRecordedMv: number | null = null;
      let pcrPhaseChanged: { cycleCount: number; phaseIndex: 0 | 1 | 2 } | null = null;

      // ---------------------------------------------------------------------
      // 1. YOUNG'S DOUBLE-SLIT INTERFERENCE
      // ---------------------------------------------------------------------
      const ds = state.doubleslit;
      const dsColorHex = wavelengthToHex(ds.wavelengthNm);
      dsBeamMat.color.setHex(dsColorHex);
      dsWaveMat.color.setHex(dsColorHex);
      dsSlitMat.color.setHex(dsColorHex);

      dsIncidentBeam.visible = ds.laserOn;
      const slitHalfZ = 0.018 + (ds.slitSeparationMm - 0.2) * 0.06;
      dsSlitTop.position.z = slitHalfZ;
      dsSlitBot.position.z = -slitHalfZ;
      const screenX = 0.22 + ((ds.screenDistanceM - 0.8) / 1.2) * 0.4;
      dsScreenGroup.position.x = screenX;

      dsWaveRings.forEach((ring) => {
        ring.mesh.visible = ds.laserOn;
        if (!ds.laserOn) return;
        const p = (ring.phase + elapsed * 0.72) % 1;
        const span = Math.max(0.25, screenX + 0.06);
        const radiusScale = 0.15 + p * (span / 0.15);
        ring.mesh.scale.set(radiusScale, radiusScale, 1);
        ring.mesh.position.set(-0.07, 0.21, ring.slitSign * slitHalfZ);
      });

      redrawDoubleSlitScreen(
        ds.laserOn,
        ds.wavelengthNm,
        ds.slitSeparationMm,
        ds.screenDistanceM,
      );

      // ---------------------------------------------------------------------
      // 2. PHOTOELECTRIC EFFECT PHOTOTUBE
      // ---------------------------------------------------------------------
      const pe = state.photoelectric;
      const peMetrics = calculatePhotoelectricMetrics(
        pe.metal,
        pe.wavelengthNm,
        pe.intensityPct,
        pe.collectorVoltageV,
      );
      const peHex = wavelengthToHex(pe.wavelengthNm);
      peCathodeMat.color.setHex(PHOTO_METAL_WORK_FUNCTION_EV[pe.metal].colorHex);
      pePhotonMat.color.setHex(peHex);
      peLampGlowMat.color.setHex(peHex);
      peLampGlowMat.emissive.setHex(peHex);
      peLampGlowMat.emissiveIntensity = 0.3 + (pe.intensityPct / 100) * 0.9;

      const activePhotons = Math.max(2, Math.round((pe.intensityPct / 100) * pePhotons.length));
      pePhotons.forEach((p, idx) => {
        p.mesh.visible = idx < activePhotons;
        if (!p.mesh.visible) return;
        const prog = (p.offset + elapsed * 1.4) % 1;
        p.mesh.position.set(
          THREE.MathUtils.lerp(-0.21, -0.32, prog),
          THREE.MathUtils.lerp(0.46, 0.26, prog),
          Math.sin(idx * 1.3) * 0.03,
        );
      });

      const activeElectrons = peMetrics.emitting
        ? Math.max(3, Math.round((pe.intensityPct / 100) * peElectrons.length))
        : 0;
      peElectrons.forEach((e, idx) => {
        if (idx >= activeElectrons) {
          e.mesh.visible = false;
          return;
        }
        e.mesh.visible = true;
        const speed = 0.7 + peMetrics.kMaxEv * 0.45;
        const prog = (e.phase + elapsed * speed) % 1;

        if (peMetrics.photocurrentUa > 0) {
          // Electrons reach the collector anode!
          e.mesh.position.set(
            THREE.MathUtils.lerp(-0.31, 0.11, prog),
            0.26 + e.laneY * (1 - prog * 0.4),
            e.laneZ,
          );
        } else {
          // Retarding potential >= Stopping Potential V0: electrons turn around mid-tube!
          const maxReach = Math.max(
            0.08,
            Math.min(0.36, 0.36 * (peMetrics.stoppingPotentialV / Math.max(0.2, -pe.collectorVoltageV))),
          );
          const turn = Math.sin(prog * Math.PI);
          e.mesh.position.set(-0.31 + maxReach * turn, 0.26 + e.laneY, e.laneZ);
        }
      });

      const needleAngle = 0.72 - Math.min(1, peMetrics.photocurrentUa / 48) * 1.44;
      peNeedlePivot.rotation.z = THREE.MathUtils.damp(
        peNeedlePivot.rotation.z,
        needleAngle,
        9,
        delta,
      );

      // ---------------------------------------------------------------------
      // 3. HABER–BOSCH AMMONIA REACTOR
      // ---------------------------------------------------------------------
      const h = state.haber;
      const hMetrics = calculateHaberMetrics(h.pressureAtm, h.temperatureC, h.catalystOn);
      const heatNorm = (h.temperatureC - 300) / 350;
      haberHeaterMat.emissiveIntensity = 0.15 + heatNorm * 1.2;
      catalystGroup.visible = h.catalystOn;
      haberCatalystMat.emissiveIntensity = h.catalystOn ? 0.15 + heatNorm * 0.45 : 0;

      const nh3Count = Math.round((hMetrics.yieldPct / 100) * haberMolecules.length);
      const speedMult = 0.4 + (hMetrics.ratePct / 100) * 2.2;
      haberMolecules.forEach((m, idx) => {
        m.mesh.material = idx < nh3Count ? nh3Mat : idx % 3 === 0 ? n2Mat : h2Mat;
        const ang = m.angle + elapsed * m.speed * speedMult;
        const r = m.radius * (1.15 - (h.pressureAtm / 300) * 0.32);
        m.mesh.position.set(
          -0.14 + Math.cos(ang) * r,
          m.yBase + Math.sin(elapsed * 2.5 * speedMult + idx) * 0.035,
          Math.sin(ang) * r,
        );
      });

      const pressureAngle = 0.9 - ((h.pressureAtm - 50) / 250) * 1.8;
      haberNeedlePivot.rotation.z = THREE.MathUtils.damp(
        haberNeedlePivot.rotation.z,
        pressureAngle,
        8,
        delta,
      );
      const poolScaleY = Math.max(0.12, hMetrics.yieldPct / 82);
      haberLiquidNh3.scale.y = THREE.MathUtils.damp(haberLiquidNh3.scale.y, poolScaleY, 6, delta);
      haberLiquidNh3.position.y = 0.06 + haberLiquidNh3.scale.y * 0.12;

      // ---------------------------------------------------------------------
      // 4. DANIELL GALVANIC CELL & NERNST EQUATION
      // ---------------------------------------------------------------------
      const g = state.galvanic;
      const gMetrics = calculateGalvanicMetrics(
        g.saltBridgeInserted,
        g.cuConcM,
        g.znConcM,
        g.tempK,
      );
      cuSolMat.opacity = 0.22 + Math.min(1, g.cuConcM / 2.0) * 0.65;
      znSolMat.opacity = 0.2 + Math.min(1, g.znConcM / 2.0) * 0.35;

      const targetBridgeY = g.saltBridgeInserted ? 0 : 0.24;
      saltBridgeGroup.position.y = THREE.MathUtils.damp(
        saltBridgeGroup.position.y,
        targetBridgeY,
        8,
        delta,
      );

      const flowSpeed = g.saltBridgeInserted ? 0.35 + gMetrics.emfV * 0.55 : 0;
      galvElectrons.forEach((el) => {
        el.mesh.visible = g.saltBridgeInserted && gMetrics.emfV > 0.05;
        if (!el.mesh.visible) return;
        const u = (el.offset + elapsed * flowSpeed) % 1;
        wireCurve.getPointAt(u, el.mesh.position);
      });
      saltIons.forEach((ion) => {
        ion.mesh.visible = g.saltBridgeInserted && gMetrics.emfV > 0.05;
        if (!ion.mesh.visible) return;
        const raw = (ion.offset + elapsed * flowSpeed * 0.45 * ion.dir) % 1;
        const u = raw < 0 ? raw + 1 : raw;
        saltBridgeCurve.getPointAt(u, ion.mesh.position);
      });

      const emfAngle = 0.85 - Math.min(1.4, gMetrics.emfV) * 1.25;
      galvNeedlePivot.rotation.z = THREE.MathUtils.damp(
        galvNeedlePivot.rotation.z,
        emfAngle,
        8,
        delta,
      );

      // ---------------------------------------------------------------------
      // 5. ACTION POTENTIAL & SYNAPTIC NEUROTRANSMISSION
      // ---------------------------------------------------------------------
      const nr = state.neuron;
      const nrMetrics = calculateNeuronMetrics(nr.stimulusUa, nr.myelinated, nr.sodiumMm);
      myelinMeshes.forEach((m) => {
        m.visible = nr.myelinated;
      });

      if (nr.firePulse !== lastNeuronPulse) {
        lastNeuronPulse = nr.firePulse;
        neuronAnimProgress = 0;
        neuronAnimFires = nrMetrics.fires;
        neuronAnimPeakMv = nrMetrics.peakMv;
        neuronRecordedForPulse = false;
      }

      if (neuronAnimProgress >= 0) {
        const travelSpeed = nr.myelinated ? 0.95 : 0.38;
        neuronAnimProgress += delta * travelSpeed;
        drawOscilloscope(neuronAnimProgress, neuronAnimFires, neuronAnimPeakMv);

        if (neuronAnimFires && neuronAnimProgress <= 0.72) {
          const frac = neuronAnimProgress / 0.72;
          const xPos = THREE.MathUtils.lerp(-0.56, 0.32, frac);
          spikeRing.visible = true;
          spikeRing.position.set(xPos, 0.25, 0);
          const pulseScale = 1 + Math.sin(elapsed * 24) * 0.14;
          spikeRing.scale.set(pulseScale, pulseScale, 1);

          // Flare ion channels as depolarization passes each Node of Ranvier!
          ionChannels.forEach((ch) => {
            const d = Math.abs(ch.x - xPos);
            const open = d < 0.1 ? 1.55 : 1.0;
            ch.mesh.scale.set(open, 1, open);
          });
        } else {
          spikeRing.visible = false;
          ionChannels.forEach((ch) => ch.mesh.scale.set(1, 1, 1));
        }

        // Synaptic vesicle exocytosis burst across cleft!
        if (neuronAnimFires && neuronAnimProgress > 0.65 && neuronAnimProgress < 1.25) {
          const burst = (neuronAnimProgress - 0.65) / 0.6;
          vesicles.forEach((v) => {
            const p = Math.max(0, Math.min(1, (burst - v.delay) * 1.4));
            v.mesh.visible = p > 0 && p < 1;
            v.mesh.position.set(
              THREE.MathUtils.lerp(0.41, 0.51, p),
              0.25 + v.offsetY,
              v.offsetZ,
            );
          });
          if (!neuronRecordedForPulse) {
            neuronRecordedForPulse = true;
            neuronPeakRecordedMv = neuronAnimPeakMv;
          }
        } else {
          vesicles.forEach((v) => {
            v.mesh.visible = false;
          });
        }

        if (neuronAnimProgress >= 1.35) {
          neuronAnimProgress = -1;
          if (!neuronRecordedForPulse) {
            neuronRecordedForPulse = true;
            neuronPeakRecordedMv = neuronAnimPeakMv;
          }
        }
      }

      // ---------------------------------------------------------------------
      // 6. PCR THERMAL CYCLER & DNA AMPLIFICATION
      // ---------------------------------------------------------------------
      const pcr = state.pcr;
      const pcrMetrics = calculatePcrMetrics(
        pcr.annealingTempC,
        pcr.cycleCount,
        pcr.taqActive,
      );

      if (pcr.running && pcr.cycleCount < 30) {
        pcrPhaseClock += delta;
        if (pcrPhaseClock >= 1.45) {
          pcrPhaseClock = 0;
          const nextPhase = ((pcr.phaseIndex + 1) % 3) as 0 | 1 | 2;
          const nextCycle = nextPhase === 0 ? Math.min(30, pcr.cycleCount + 1) : pcr.cycleCount;
          pcrPhaseChanged = { cycleCount: nextCycle, phaseIndex: nextPhase };
        }
      }

      const ringColor =
        pcr.phaseIndex === 0 ? 0xef4444 : pcr.phaseIndex === 1 ? 0x06b6d4 : 0x10b981;
      pcrTempRingMat.color.setHex(ringColor);
      pcrTempRingMat.emissive.setHex(ringColor);
      pcrTempRingMat.emissiveIntensity = pcr.running
        ? 0.65 + Math.sin(elapsed * 5) * 0.25
        : 0.35;

      // Animate 3D DNA Unzipping (Phase 0), Primer Binding (Phase 1), Taq Extension (Phase 2)
      const sepTarget = pcr.phaseIndex === 0 ? 0.085 : 0.095;
      topStrand.position.y = THREE.MathUtils.damp(topStrand.position.y, sepTarget, 8, delta);
      botStrand.position.y = THREE.MathUtils.damp(botStrand.position.y, -sepTarget, 8, delta);

      const primersBound = pcr.phaseIndex >= 1 && pcrMetrics.specificityPct >= 40;
      primerTop.visible = primersBound;
      primerBot.visible = primersBound;
      primerTop.position.set(-0.2, sepTarget - 0.025, 0);
      primerBot.position.set(0.2, -sepTarget + 0.025, 0);

      const extending = pcr.phaseIndex === 2 && pcr.taqActive && pcrMetrics.specificityPct >= 40;
      const extProgress = extending ? Math.min(1, pcrPhaseClock / 1.3) : 0;
      daughterTop.visible = extending;
      daughterBot.visible = extending;
      taqTop.visible = extending;
      taqBot.visible = extending;
      if (extending) {
        const s = Math.max(0.05, extProgress);
        daughterTop.scale.set(s, 1, 1);
        daughterTop.position.set(-0.28 + s * 0.28, sepTarget - 0.028, 0);
        daughterBot.scale.set(s, 1, 1);
        daughterBot.position.set(0.28 - s * 0.28, -sepTarget + 0.028, 0);
        taqTop.position.set(-0.26 + extProgress * 0.52, sepTarget - 0.028, 0.02);
        taqBot.position.set(0.26 - extProgress * 0.52, -sepTarget + 0.028, 0.02);
      }

      // UV Gel Target Band Glow Intensity scales with log2(DNA copies)
      gelBandMat.emissiveIntensity = 0.08 + pcrMetrics.gelIntensity * 1.4;
      targetGelBand.scale.y = 0.7 + pcrMetrics.gelIntensity * 0.9;

      return { neuronPeakRecordedMv, pcrPhaseChanged };
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
