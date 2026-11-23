import * as THREE from "three";
import { buildClass10Stations } from "./class10Stations";
import type { LabMaterialLibrary } from "./materials";
import { getComplementaryBase } from "./quests";
import { createScaleDialTexture } from "./textures";
import type { DnaBase, LabExperimentState, StationId } from "./types";

export interface StationsController {
  update: (
    state: LabExperimentState,
    delta: number,
    elapsed: number,
    activeStation: StationId,
  ) => {
    oscillationCompleted: boolean;
    electrolysisH2Delta: number;
    projectileLandedRange: number | null;
    displacementProgressDelta: number;
    reflexCompletedMs: number | null;
  };
  dispose: () => void;
}

const BENCH_SURFACE_Y = 0.86;

function createAmmeterDialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = "#2F4368";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 240);

    ctx.beginPath();
    ctx.arc(128, 178, 92, Math.PI * 1.15, Math.PI * 1.85);
    ctx.strokeStyle = "#5C5149";
    ctx.lineWidth = 4;
    ctx.stroke();

    for (let i = 0; i <= 6; i++) {
      const ang = Math.PI * (1.15 + (i / 6) * 0.7);
      const x1 = 128 + Math.cos(ang) * 82;
      const y1 = 178 + Math.sin(ang) * 82;
      const x2 = 128 + Math.cos(ang) * 96;
      const y2 = 178 + Math.sin(ang) * 96;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#231B16";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = "#231B16";
    ctx.font = "700 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AMMETER (A)", 128, 52);
    ctx.font = "600 18px monospace";
    ctx.fillText("0   2   4   6", 128, 114);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPressureDialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = "#6F4E37";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(128, 148, 84, Math.PI * 1.15, Math.PI * 1.85);
    ctx.strokeStyle = "#42335C";
    ctx.lineWidth = 5;
    ctx.stroke();

    for (let i = 0; i <= 8; i++) {
      const ang = Math.PI * (1.15 + (i / 8) * 0.7);
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(ang) * 74, 148 + Math.sin(ang) * 74);
      ctx.lineTo(128 + Math.cos(ang) * 88, 148 + Math.sin(ang) * 88);
      ctx.strokeStyle = "#231B16";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = "#231B16";
    ctx.font = "700 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("kPa GAUGE", 128, 56);
    ctx.font = "600 16px monospace";
    ctx.fillText("80   220   400", 128, 108);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSpectrumBandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, "rgba(217, 72, 59, 0.95)");
    grad.addColorStop(0.2, "rgba(242, 140, 40, 0.95)");
    grad.addColorStop(0.4, "rgba(244, 208, 63, 0.95)");
    grad.addColorStop(0.6, "rgba(46, 160, 67, 0.95)");
    grad.addColorStop(0.8, "rgba(41, 128, 185, 0.95)");
    grad.addColorStop(1.0, "rgba(108, 74, 182, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const DNA_BASE_COLORS: Record<DnaBase, number> = {
  A: 0x6f4e37,
  T: 0x6c4ab6,
  C: 0x2d6a4f,
  G: 0xe6a119,
};

export function buildExperimentStations(
  benchGroups: Record<StationId, THREE.Group>,
  materials: LabMaterialLibrary,
): StationsController {
  const disposables: { dispose: () => void }[] = [];

  const vesselGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f0fb,
    roughness: 0.08,
    metalness: 0.0,
    transparent: true,
    opacity: 0.34,
    clearcoat: 1.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(vesselGlassMat);

  const class10Controller = buildClass10Stations(
    benchGroups,
    materials,
    vesselGlassMat,
  );

  // =========================================================================
  // STATION 01: SIMPLE PENDULUM & PHOTOGATE RIG (PHYSICS)
  // =========================================================================
  const pendulumRoot = new THREE.Group();
  pendulumRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.pendulum.add(pendulumRoot);

  const pBaseGeo = new THREE.BoxGeometry(0.62, 0.04, 0.4);
  const pPostGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.94, 16);
  const pRulerGeo = new THREE.BoxGeometry(0.028, 0.82, 0.008);
  const pArmGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.36, 14);
  const pClampGeo = new THREE.BoxGeometry(0.068, 0.064, 0.068);
  const pKnobGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12);
  const pArcGeo = new THREE.TorusGeometry(0.18, 0.009, 10, 32, Math.PI);
  const pGateGeo = new THREE.BoxGeometry(0.22, 0.055, 0.09);
  const pGateLedGeo = new THREE.SphereGeometry(0.014, 10, 10);
  const pStopwatchGeo = new THREE.BoxGeometry(0.14, 0.06, 0.1);
  const pStringGeo = new THREE.CylinderGeometry(0.004, 0.004, 1, 8);
  const pBobGeo = new THREE.SphereGeometry(0.058, 24, 24);
  const pBobCollarGeo = new THREE.CylinderGeometry(0.014, 0.02, 0.024, 12);
  const pGateLedMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    emissive: 0x34d399,
    emissiveIntensity: 0.2,
  });
  const pStopwatchTex = createScaleDialTexture("PHOTOGATE", "T = 2π√(L/g)", 2);
  const pStopwatchMat = new THREE.MeshStandardMaterial({
    map: pStopwatchTex,
    roughness: 0.4,
  });
  disposables.push(
    pBaseGeo,
    pPostGeo,
    pRulerGeo,
    pArmGeo,
    pClampGeo,
    pKnobGeo,
    pArcGeo,
    pGateGeo,
    pGateLedGeo,
    pStopwatchGeo,
    pStringGeo,
    pBobGeo,
    pBobCollarGeo,
    pGateLedMat,
    pStopwatchTex,
    pStopwatchMat,
  );

  const pBase = new THREE.Mesh(pBaseGeo, materials.darkIron);
  pBase.position.set(0, 0.02, -0.06);
  pBase.castShadow = true;
  pendulumRoot.add(pBase);

  const pPost = new THREE.Mesh(pPostGeo, materials.platinumMetal);
  pPost.position.set(-0.22, 0.49, -0.14);
  pPost.castShadow = true;
  pendulumRoot.add(pPost);

  const pRuler = new THREE.Mesh(pRulerGeo, materials.warmIvoryTrim);
  pRuler.position.set(-0.19, 0.47, -0.12);
  pendulumRoot.add(pRuler);

  const pArm = new THREE.Mesh(pArmGeo, materials.brassMetal);
  pArm.rotation.z = Math.PI / 2;
  pArm.position.set(-0.04, 0.93, -0.14);
  pArm.castShadow = true;
  pendulumRoot.add(pArm);

  const pClamp = new THREE.Mesh(pClampGeo, materials.darkIron);
  pClamp.position.set(-0.22, 0.93, -0.14);
  pendulumRoot.add(pClamp);

  const pThumbscrew = new THREE.Mesh(pKnobGeo, materials.brassMetal);
  pThumbscrew.rotation.z = Math.PI / 2;
  pThumbscrew.position.set(-0.26, 0.93, -0.14);
  pendulumRoot.add(pThumbscrew);

  const pPhotogate = new THREE.Mesh(pGateGeo, materials.lavenderAccent);
  pPhotogate.position.set(0.12, 0.068, -0.02);
  pendulumRoot.add(pPhotogate);

  const pGateLed = new THREE.Mesh(pGateLedGeo, pGateLedMat);
  pGateLed.position.set(0.12, 0.1, 0.025);
  pendulumRoot.add(pGateLed);

  const pTimerBox = new THREE.Mesh(pStopwatchGeo, materials.darkIron);
  pTimerBox.position.set(-0.2, 0.07, 0.06);
  pendulumRoot.add(pTimerBox);

  const pTimerFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.048),
    pStopwatchMat,
  );
  disposables.push(pTimerFace.geometry);
  pTimerFace.position.set(-0.2, 0.072, 0.112);
  pendulumRoot.add(pTimerFace);

  const pendulumPivot = new THREE.Group();
  pendulumPivot.position.set(0.12, 0.92, -0.02);
  pendulumRoot.add(pendulumPivot);

  const pArc = new THREE.Mesh(pArcGeo, materials.brassMetal);
  pArc.rotation.z = Math.PI;
  pendulumPivot.add(pArc);

  const pString = new THREE.Mesh(pStringGeo, materials.platinumMetal);
  pendulumPivot.add(pString);

  const pBob = new THREE.Mesh(pBobGeo, materials.brassMetal);
  pBob.castShadow = true;
  pendulumPivot.add(pBob);

  const pBobCollar = new THREE.Mesh(pBobCollarGeo, materials.darkIron);
  pBob.add(pBobCollar);
  pBobCollar.position.y = 0.062;

  // =========================================================================
  // STATION 02: RAY OPTICS & 5-BAND PRISM DISPERSION BENCH (PHYSICS)
  // =========================================================================
  const opticsRoot = new THREE.Group();
  opticsRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.optics.add(opticsRoot);

  const railGeo = new THREE.BoxGeometry(1.38, 0.04, 0.16);
  const emitterHousingGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.25, 20);
  const finGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.012, 20);
  const emitterStandGeo = new THREE.CylinderGeometry(0.02, 0.026, 0.18, 12);
  const apertureMat = new THREE.MeshStandardMaterial({
    color: 0xfff2cc,
    emissive: 0xffd275,
    emissiveIntensity: 1.6,
  });
  const apertureGeo = new THREE.CircleGeometry(0.026, 16);
  const turntableGeo = new THREE.CylinderGeometry(0.16, 0.17, 0.04, 28);
  const dialRingGeo = new THREE.TorusGeometry(0.155, 0.008, 8, 32);
  const prismGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.21, 3);
  const screenGeo = new THREE.BoxGeometry(0.032, 0.44, 0.78);
  const beamGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 8);
  const spectrumSpotGeo = new THREE.PlaneGeometry(0.09, 0.28);
  const spectrumTex = createSpectrumBandTexture();

  const incidentBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfff0be,
    transparent: true,
    opacity: 0.95,
  });
  const rayRedMat = new THREE.MeshBasicMaterial({ color: 0xd9483b });
  const rayOrangeMat = new THREE.MeshBasicMaterial({ color: 0xf28c28 });
  const rayGreenMat = new THREE.MeshBasicMaterial({ color: 0x2ea043 });
  const rayBlueMat = new THREE.MeshBasicMaterial({ color: 0x2980b9 });
  const rayVioletMat = new THREE.MeshBasicMaterial({ color: 0x6c4ab6 });
  const spectrumSpotMat = new THREE.MeshBasicMaterial({
    map: spectrumTex,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  disposables.push(
    railGeo,
    emitterHousingGeo,
    finGeo,
    emitterStandGeo,
    apertureMat,
    apertureGeo,
    turntableGeo,
    dialRingGeo,
    prismGeo,
    screenGeo,
    beamGeo,
    spectrumSpotGeo,
    spectrumTex,
    incidentBeamMat,
    rayRedMat,
    rayOrangeMat,
    rayGreenMat,
    rayBlueMat,
    rayVioletMat,
    spectrumSpotMat,
  );

  const rail = new THREE.Mesh(railGeo, materials.platinumMetal);
  rail.position.set(0, 0.02, 0);
  rail.castShadow = true;
  opticsRoot.add(rail);

  const emitterStand = new THREE.Mesh(emitterStandGeo, materials.darkIron);
  emitterStand.position.set(-0.5, 0.13, 0);
  opticsRoot.add(emitterStand);

  const emitterHousing = new THREE.Mesh(emitterHousingGeo, materials.brassMetal);
  emitterHousing.rotation.z = Math.PI / 2;
  emitterHousing.position.set(-0.48, 0.23, 0);
  emitterHousing.castShadow = true;
  opticsRoot.add(emitterHousing);

  // Cooling fins on collimator
  [-0.56, -0.52, -0.48].forEach((fx) => {
    const fin = new THREE.Mesh(finGeo, materials.darkIron);
    fin.rotation.z = Math.PI / 2;
    fin.position.set(fx, 0.23, 0);
    opticsRoot.add(fin);
  });

  const emitterAperture = new THREE.Mesh(apertureGeo, apertureMat);
  emitterAperture.rotation.y = Math.PI / 2;
  emitterAperture.position.set(-0.352, 0.23, 0);
  opticsRoot.add(emitterAperture);

  const turntable = new THREE.Mesh(turntableGeo, materials.darkIron);
  turntable.position.set(0, 0.06, 0);
  opticsRoot.add(turntable);

  const dialRing = new THREE.Mesh(dialRingGeo, materials.brassMetal);
  dialRing.rotation.x = Math.PI / 2;
  dialRing.position.set(0, 0.082, 0);
  opticsRoot.add(dialRing);

  const prismMesh = new THREE.Mesh(prismGeo, materials.opticalGlass);
  prismMesh.position.set(0, 0.185, 0);
  prismMesh.castShadow = true;
  opticsRoot.add(prismMesh);

  const screenStand = new THREE.Mesh(screenGeo, materials.warmIvoryTrim);
  screenStand.position.set(0.56, 0.23, 0.14);
  screenStand.castShadow = true;
  opticsRoot.add(screenStand);

  const spectrumSpot = new THREE.Mesh(spectrumSpotGeo, spectrumSpotMat);
  spectrumSpot.rotation.y = -Math.PI / 2;
  spectrumSpot.position.set(0.54, 0.21, 0.14);
  opticsRoot.add(spectrumSpot);

  const incidentBeam = new THREE.Mesh(beamGeo, incidentBeamMat);
  incidentBeam.rotation.z = Math.PI / 2;
  incidentBeam.scale.set(1, 0.36, 1);
  incidentBeam.position.set(-0.18, 0.23, 0);
  opticsRoot.add(incidentBeam);

  const rayRed = new THREE.Mesh(beamGeo, rayRedMat);
  const rayOrange = new THREE.Mesh(beamGeo, rayOrangeMat);
  const rayGreen = new THREE.Mesh(beamGeo, rayGreenMat);
  const rayBlue = new THREE.Mesh(beamGeo, rayBlueMat);
  const rayViolet = new THREE.Mesh(beamGeo, rayVioletMat);
  opticsRoot.add(rayRed, rayOrange, rayGreen, rayBlue, rayViolet);

  // =========================================================================
  // STATION 09: ACID-BASE TITRATION BENCH (CHEMISTRY)
  // =========================================================================
  const titrationRoot = new THREE.Group();
  titrationRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.titration.add(titrationRoot);

  const tStirPlateGeo = new THREE.BoxGeometry(0.46, 0.065, 0.4);
  const tStirBarGeo = new THREE.CapsuleGeometry(0.008, 0.036, 6, 10);
  const tRodGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.9, 12);
  const tClampArmGeo = new THREE.BoxGeometry(0.24, 0.03, 0.04);
  const tBuretteGeo = new THREE.CylinderGeometry(
    0.024,
    0.024,
    0.48,
    18,
    1,
    true,
  );
  const tTickRingGeo = new THREE.TorusGeometry(0.025, 0.0022, 6, 16);
  const tBuretteLiquidGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.44, 14);
  const tBuretteLiquidMat = new THREE.MeshStandardMaterial({
    color: 0xd0c4e8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const tStopcockGeo = new THREE.BoxGeometry(0.08, 0.022, 0.024);
  const tStopcockMat = new THREE.MeshStandardMaterial({
    color: 0xc0392b,
    roughness: 0.35,
  });
  const tFlaskBodyGeo = new THREE.ConeGeometry(0.14, 0.22, 24, 1, true);
  const tFlaskNeckGeo = new THREE.CylinderGeometry(
    0.036,
    0.048,
    0.085,
    18,
    1,
    true,
  );
  const tLiquidGeo = new THREE.ConeGeometry(0.122, 0.145, 24);
  tLiquidGeo.translate(0, 0.0725, 0);
  const tLiquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xd94f4f,
    roughness: 0.18,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
  });
  const tDropGeo = new THREE.SphereGeometry(0.018, 12, 12);
  const tDropMat = new THREE.MeshStandardMaterial({
    color: 0x6c4ab6,
    emissive: 0x6c4ab6,
    emissiveIntensity: 0.5,
  });
  const tReagentGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.16, 16);
  const tPhMeterGeo = new THREE.BoxGeometry(0.16, 0.1, 0.12);
  const tPhMeterTex = createScaleDialTexture("pH METER", "0.0 – 14.0", 2);
  const tPhMeterMat = new THREE.MeshStandardMaterial({
    map: tPhMeterTex,
    roughness: 0.4,
  });
  disposables.push(
    tStirPlateGeo,
    tStirBarGeo,
    tRodGeo,
    tClampArmGeo,
    tBuretteGeo,
    tTickRingGeo,
    tBuretteLiquidGeo,
    tBuretteLiquidMat,
    tStopcockGeo,
    tStopcockMat,
    tFlaskBodyGeo,
    tFlaskNeckGeo,
    tLiquidGeo,
    tLiquidMat,
    tDropGeo,
    tDropMat,
    tReagentGeo,
    tPhMeterGeo,
    tPhMeterTex,
    tPhMeterMat,
  );

  const tStirPlate = new THREE.Mesh(tStirPlateGeo, materials.platinumMetal);
  tStirPlate.position.set(0.04, 0.032, 0);
  tStirPlate.castShadow = true;
  titrationRoot.add(tStirPlate);

  const tStirBar = new THREE.Mesh(tStirBarGeo, materials.warmIvoryTrim);
  tStirBar.rotation.z = Math.PI / 2;
  tStirBar.position.set(0.04, 0.078, 0);
  titrationRoot.add(tStirBar);

  const tRod = new THREE.Mesh(tRodGeo, materials.darkIron);
  tRod.position.set(-0.18, 0.46, -0.1);
  titrationRoot.add(tRod);

  const tClampArm = new THREE.Mesh(tClampArmGeo, materials.brassMetal);
  tClampArm.position.set(-0.07, 0.66, -0.05);
  titrationRoot.add(tClampArm);

  const tBuretteLiquid = new THREE.Mesh(tBuretteLiquidGeo, tBuretteLiquidMat);
  tBuretteLiquid.position.set(0.04, 0.66, 0);
  titrationRoot.add(tBuretteLiquid);

  const tBurette = new THREE.Mesh(tBuretteGeo, vesselGlassMat);
  tBurette.position.set(0.04, 0.66, 0);
  tBurette.renderOrder = 3;
  titrationRoot.add(tBurette);

  // Graduated burette scale rings (10, 20, 30, 40, 50 mL)
  for (let i = 0; i < 6; i++) {
    const tick = new THREE.Mesh(tTickRingGeo, materials.darkIron);
    tick.rotation.x = Math.PI / 2;
    tick.position.set(0.04, 0.48 + i * 0.072, 0);
    titrationRoot.add(tick);
  }

  const tStopcock = new THREE.Mesh(tStopcockGeo, tStopcockMat);
  tStopcock.position.set(0.04, 0.43, 0);
  titrationRoot.add(tStopcock);

  const tLiquid = new THREE.Mesh(tLiquidGeo, tLiquidMat);
  tLiquid.position.set(0.04, 0.066, 0);
  tLiquid.renderOrder = 1;
  titrationRoot.add(tLiquid);

  const tFlaskBody = new THREE.Mesh(tFlaskBodyGeo, vesselGlassMat);
  tFlaskBody.position.set(0.04, 0.175, 0);
  tFlaskBody.renderOrder = 3;
  titrationRoot.add(tFlaskBody);

  const tFlaskNeck = new THREE.Mesh(tFlaskNeckGeo, vesselGlassMat);
  tFlaskNeck.position.set(0.04, 0.305, 0);
  tFlaskNeck.renderOrder = 3;
  titrationRoot.add(tFlaskNeck);

  const tDrop = new THREE.Mesh(tDropGeo, tDropMat);
  tDrop.position.set(0.04, 0.4, 0);
  tDrop.visible = false;
  titrationRoot.add(tDrop);

  // Digital pH Meter beside stirrer
  const tPhMeter = new THREE.Mesh(tPhMeterGeo, materials.darkIron);
  tPhMeter.position.set(0.42, 0.05, 0.08);
  titrationRoot.add(tPhMeter);

  const tPhFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.08),
    tPhMeterMat,
  );
  disposables.push(tPhFace.geometry);
  tPhFace.position.set(0.42, 0.054, 0.142);
  titrationRoot.add(tPhFace);

  const tReagent = new THREE.Mesh(tReagentGeo, materials.lavenderAccent);
  tReagent.position.set(0.44, 0.08, -0.14);
  tReagent.castShadow = true;
  titrationRoot.add(tReagent);

  // =========================================================================
  // STATION 03: OHM'S LAW CIRCUIT WORKBENCH (PHYSICS)
  // =========================================================================
  const circuitRoot = new THREE.Group();
  circuitRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.circuit.add(circuitRoot);

  const cDeckGeo = new THREE.BoxGeometry(1.26, 0.04, 0.74);
  const cBatteryGeo = new THREE.BoxGeometry(0.24, 0.18, 0.22);
  const cBatteryFaceTex = createScaleDialTexture("DC SOURCE", "2 V – 12 V", 2);
  const cBatteryFaceMat = new THREE.MeshStandardMaterial({
    map: cBatteryFaceTex,
    roughness: 0.45,
  });
  const cBatteryFaceGeo = new THREE.PlaneGeometry(0.2, 0.14);
  const cMeterGeo = new THREE.BoxGeometry(0.24, 0.2, 0.14);
  const cMeterDialTex = createAmmeterDialTexture();
  const cMeterDialMat = new THREE.MeshStandardMaterial({
    map: cMeterDialTex,
    roughness: 0.4,
  });
  const cMeterDialGeo = new THREE.PlaneGeometry(0.21, 0.17);
  const cNeedleGeo = new THREE.BoxGeometry(0.01, 0.095, 0.01);
  const cResistorGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.28, 18);
  const cBandGeo = new THREE.CylinderGeometry(0.0445, 0.0445, 0.022, 18);
  const cSwitchBaseGeo = new THREE.BoxGeometry(0.22, 0.03, 0.12);
  const cSwitchBladeGeo = new THREE.BoxGeometry(0.16, 0.018, 0.025);
  const cTerminalGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12);
  const cLampGeo = new THREE.SphereGeometry(0.026, 16, 16);
  const cLampMat = new THREE.MeshStandardMaterial({
    color: 0x5c5149,
    emissive: 0xffb703,
    emissiveIntensity: 0,
  });
  const cWireCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.38, 0.06, 0.14),
    new THREE.Vector3(-0.38, 0.06, -0.18),
    new THREE.Vector3(0.0, 0.06, -0.2),
    new THREE.Vector3(0.38, 0.06, -0.18),
    new THREE.Vector3(0.38, 0.06, 0.14),
    new THREE.Vector3(-0.38, 0.06, 0.14),
  ]);
  const cWireGeo = new THREE.TubeGeometry(cWireCurve, 48, 0.013, 8, false);
  const cElectronGeo = new THREE.SphereGeometry(0.022, 12, 12);
  const cElectronMat = new THREE.MeshStandardMaterial({
    color: 0xffe08a,
    emissive: 0xffb703,
    emissiveIntensity: 1.5,
  });
  const cResistorMat = new THREE.MeshStandardMaterial({
    color: 0xd9c2a3,
    emissive: 0xd9483b,
    emissiveIntensity: 0,
    roughness: 0.4,
  });
  const cBandRed = new THREE.MeshStandardMaterial({ color: 0xc0392b });
  const cBandBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb });
  const cBandGold = new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    metalness: 0.8,
  });
  disposables.push(
    cDeckGeo,
    cBatteryGeo,
    cBatteryFaceTex,
    cBatteryFaceMat,
    cBatteryFaceGeo,
    cMeterGeo,
    cMeterDialTex,
    cMeterDialMat,
    cMeterDialGeo,
    cNeedleGeo,
    cResistorGeo,
    cBandGeo,
    cSwitchBaseGeo,
    cSwitchBladeGeo,
    cTerminalGeo,
    cLampGeo,
    cLampMat,
    cWireGeo,
    cElectronGeo,
    cElectronMat,
    cResistorMat,
    cBandRed,
    cBandBlue,
    cBandGold,
  );

  const cDeck = new THREE.Mesh(cDeckGeo, materials.warmIvoryTrim);
  cDeck.position.set(0, 0.02, 0);
  cDeck.receiveShadow = true;
  circuitRoot.add(cDeck);

  const cPowerUnit = new THREE.Mesh(cBatteryGeo, materials.darkIron);
  cPowerUnit.position.set(-0.38, 0.13, 0.14);
  cPowerUnit.castShadow = true;
  circuitRoot.add(cPowerUnit);

  const cBatteryFace = new THREE.Mesh(cBatteryFaceGeo, cBatteryFaceMat);
  cBatteryFace.position.set(-0.38, 0.13, 0.252);
  circuitRoot.add(cBatteryFace);

  const cPowerLamp = new THREE.Mesh(cLampGeo, cLampMat);
  cPowerLamp.position.set(-0.38, 0.23, 0.14);
  circuitRoot.add(cPowerLamp);

  // Red (+) & Black (-) binding posts on DC power source
  const posTerm = new THREE.Mesh(cTerminalGeo, cBandRed);
  posTerm.position.set(-0.44, 0.235, 0.08);
  const negTerm = new THREE.Mesh(cTerminalGeo, materials.darkIron);
  negTerm.position.set(-0.32, 0.235, 0.08);
  circuitRoot.add(posTerm, negTerm);

  const cAmmeter = new THREE.Mesh(cMeterGeo, materials.platinumMetal);
  cAmmeter.position.set(0.38, 0.14, -0.16);
  cAmmeter.castShadow = true;
  circuitRoot.add(cAmmeter);

  const cMeterDial = new THREE.Mesh(cMeterDialGeo, cMeterDialMat);
  cMeterDial.position.set(0.38, 0.14, -0.088);
  circuitRoot.add(cMeterDial);

  const cNeedlePivot = new THREE.Group();
  cNeedlePivot.position.set(0.38, 0.11, -0.082);
  circuitRoot.add(cNeedlePivot);
  const cNeedle = new THREE.Mesh(cNeedleGeo, cBandRed);
  cNeedle.position.y = 0.042;
  cNeedlePivot.add(cNeedle);

  const cResistor = new THREE.Mesh(cResistorGeo, cResistorMat);
  cResistor.rotation.z = Math.PI / 2;
  cResistor.position.set(0, 0.082, -0.2);
  cResistor.castShadow = true;
  circuitRoot.add(cResistor);

  // 4 Color bands on carbon resistor
  [
    { x: -0.075, mat: cBandRed },
    { x: -0.025, mat: cBandBlue },
    { x: 0.025, mat: cBandRed },
    { x: 0.08, mat: cBandGold },
  ].forEach(({ x, mat }) => {
    const band = new THREE.Mesh(cBandGeo, mat);
    band.rotation.z = Math.PI / 2;
    band.position.set(x, 0.082, -0.2);
    circuitRoot.add(band);
  });

  const cSwitchBase = new THREE.Mesh(cSwitchBaseGeo, materials.lavenderAccent);
  cSwitchBase.position.set(0.04, 0.055, 0.14);
  circuitRoot.add(cSwitchBase);

  const cSwitchPivot = new THREE.Group();
  cSwitchPivot.position.set(-0.03, 0.075, 0.14);
  circuitRoot.add(cSwitchPivot);
  const cSwitchBlade = new THREE.Mesh(cSwitchBladeGeo, materials.brassMetal);
  cSwitchBlade.position.x = 0.075;
  cSwitchPivot.add(cSwitchBlade);
  const cSwitchHandle = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 12, 12),
    cBandRed,
  );
  disposables.push(cSwitchHandle.geometry);
  cSwitchHandle.position.set(0.16, 0.008, 0);
  cSwitchPivot.add(cSwitchHandle);

  const cWire = new THREE.Mesh(cWireGeo, materials.copperWire);
  circuitRoot.add(cWire);

  const electrons: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const bead = new THREE.Mesh(cElectronGeo, cElectronMat);
    circuitRoot.add(bead);
    electrons.push(bead);
  }

  // =========================================================================
  // STATION 10: ELECTROLYSIS OF WATER CELL (CHEMISTRY)
  // =========================================================================
  const electroRoot = new THREE.Group();
  electroRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.electrolysis.add(electroRoot);

  const eBaseGeo = new THREE.BoxGeometry(0.88, 0.05, 0.5);
  const eTankGeo = new THREE.BoxGeometry(0.46, 0.24, 0.28);
  const eWaterGeo = new THREE.BoxGeometry(0.43, 0.18, 0.25);
  const eWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfe2f3,
    roughness: 0.12,
    transparent: true,
    opacity: 0.65,
  });
  const eRodGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.24, 12);
  const eTubeGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.36, 18, 1, true);
  const eTubeTickGeo = new THREE.TorusGeometry(0.045, 0.0025, 6, 18);
  const eGasGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.32, 14);
  eGasGeo.translate(0, -0.16, 0);
  const eH2Mat = new THREE.MeshStandardMaterial({
    color: 0xe6e0f0,
    transparent: true,
    opacity: 0.85,
  });
  const eO2Mat = new THREE.MeshStandardMaterial({
    color: 0xfbeaea,
    transparent: true,
    opacity: 0.85,
  });
  const eBubbleGeo = new THREE.SphereGeometry(0.011, 8, 8);
  const eBubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eLeadGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.42, 8);
  disposables.push(
    eBaseGeo,
    eTankGeo,
    eWaterGeo,
    eWaterMat,
    eRodGeo,
    eTubeGeo,
    eTubeTickGeo,
    eGasGeo,
    eH2Mat,
    eO2Mat,
    eBubbleGeo,
    eBubbleMat,
    eLeadGeo,
  );

  const eBase = new THREE.Mesh(eBaseGeo, materials.platinumMetal);
  eBase.position.set(0, 0.025, 0);
  electroRoot.add(eBase);

  const eWater = new THREE.Mesh(eWaterGeo, eWaterMat);
  eWater.position.set(-0.09, 0.14, 0);
  electroRoot.add(eWater);

  const eTank = new THREE.Mesh(eTankGeo, vesselGlassMat);
  eTank.position.set(-0.09, 0.17, 0);
  eTank.renderOrder = 3;
  electroRoot.add(eTank);

  const eCathode = new THREE.Mesh(eRodGeo, materials.darkIron);
  eCathode.position.set(-0.19, 0.18, 0);
  electroRoot.add(eCathode);

  const eAnode = new THREE.Mesh(eRodGeo, materials.brassMetal);
  eAnode.position.set(0.01, 0.18, 0);
  electroRoot.add(eAnode);

  const eTubeH2 = new THREE.Mesh(eTubeGeo, vesselGlassMat);
  eTubeH2.position.set(-0.19, 0.35, 0);
  eTubeH2.renderOrder = 3;
  electroRoot.add(eTubeH2);

  const eTubeO2 = new THREE.Mesh(eTubeGeo, vesselGlassMat);
  eTubeO2.position.set(0.01, 0.35, 0);
  eTubeO2.renderOrder = 3;
  electroRoot.add(eTubeO2);

  // Graduated mL rings on both collection tubes
  for (let i = 0; i < 4; i++) {
    const ty = 0.24 + i * 0.075;
    const tH = new THREE.Mesh(eTubeTickGeo, materials.darkIron);
    tH.rotation.x = Math.PI / 2;
    tH.position.set(-0.19, ty, 0);
    const tO = new THREE.Mesh(eTubeTickGeo, materials.darkIron);
    tO.rotation.x = Math.PI / 2;
    tO.position.set(0.01, ty, 0);
    electroRoot.add(tH, tO);
  }

  const eGasH2 = new THREE.Mesh(eGasGeo, eH2Mat);
  eGasH2.position.set(-0.19, 0.52, 0);
  electroRoot.add(eGasH2);

  const eGasO2 = new THREE.Mesh(eGasGeo, eO2Mat);
  eGasO2.position.set(0.01, 0.52, 0);
  electroRoot.add(eGasO2);

  const ePowerBox = new THREE.Mesh(cBatteryGeo, materials.darkIron);
  ePowerBox.position.set(0.28, 0.14, 0);
  electroRoot.add(ePowerBox);

  const ePowerFace = new THREE.Mesh(cBatteryFaceGeo, cBatteryFaceMat);
  ePowerFace.position.set(0.28, 0.14, 0.112);
  electroRoot.add(ePowerFace);

  const ePowerLed = new THREE.Mesh(cLampGeo, cLampMat);
  ePowerLed.position.set(0.28, 0.24, 0);
  electroRoot.add(ePowerLed);

  // Connecting copper leads from power box to electrodes
  const leadNeg = new THREE.Mesh(eLeadGeo, materials.darkIron);
  leadNeg.rotation.z = Math.PI / 2;
  leadNeg.position.set(0.04, 0.06, -0.14);
  const leadPos = new THREE.Mesh(eLeadGeo, cBandRed);
  leadPos.rotation.z = Math.PI / 2;
  leadPos.scale.set(1, 0.65, 1);
  leadPos.position.set(0.14, 0.06, 0.14);
  electroRoot.add(leadNeg, leadPos);

  const eBubblesH2: THREE.Mesh[] = [];
  const eBubblesO2: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const bh = new THREE.Mesh(eBubbleGeo, eBubbleMat);
    bh.position.set(-0.19, 0.12, 0);
    electroRoot.add(bh);
    eBubblesH2.push(bh);

    if (i < 5) {
      const bo = new THREE.Mesh(eBubbleGeo, eBubbleMat);
      bo.position.set(0.01, 0.12, 0);
      electroRoot.add(bo);
      eBubblesO2.push(bo);
    }
  }

  // =========================================================================
  // STATION 14: PHOTOSYNTHESIS LIGHT & O2 BUBBLES (BIOLOGY)
  // =========================================================================
  const photoRoot = new THREE.Group();
  photoRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.photosynthesis.add(photoRoot);

  const phBeakerGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.35, 24, 1, true);
  const phWaterGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.29, 22);
  const phWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4ece4,
    roughness: 0.12,
    transparent: true,
    opacity: 0.55,
  });
  const phStemGeo = new THREE.CylinderGeometry(0.009, 0.013, 0.19, 8);
  const phLeafGeo = new THREE.SphereGeometry(0.026, 10, 8);
  const phLeafMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.6,
  });
  const phFunnelGeo = new THREE.ConeGeometry(0.115, 0.14, 20, 1, true);
  const phTubeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 14, 1, true);
  const phO2Geo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 12);
  phO2Geo.translate(0, -0.075, 0);
  const phO2Mat = new THREE.MeshStandardMaterial({
    color: 0xeaf6f0,
    transparent: true,
    opacity: 0.88,
  });
  const phLampBaseGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.035, 20);
  const phLampStandGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.44, 12);
  const phLampHeadGeo = new THREE.ConeGeometry(0.082, 0.12, 18);
  const phBulbGeo = new THREE.SphereGeometry(0.038, 16, 16);
  const phBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff2cc,
    emissive: 0xffd166,
    emissiveIntensity: 1.5,
  });
  const phLightConeGeo = new THREE.ConeGeometry(0.17, 0.38, 18, 1, true);
  const phLightConeMat = new THREE.MeshBasicMaterial({
    color: 0xffe49e,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const phThermoGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.36, 10);
  disposables.push(
    phBeakerGeo,
    phWaterGeo,
    phWaterMat,
    phStemGeo,
    phLeafGeo,
    phLeafMat,
    phFunnelGeo,
    phTubeGeo,
    phO2Geo,
    phO2Mat,
    phLampBaseGeo,
    phLampStandGeo,
    phLampHeadGeo,
    phBulbGeo,
    phBulbMat,
    phLightConeGeo,
    phLightConeMat,
    phThermoGeo,
  );

  const phWater = new THREE.Mesh(phWaterGeo, phWaterMat);
  phWater.position.set(0.12, 0.155, 0);
  photoRoot.add(phWater);

  const phBeaker = new THREE.Mesh(phBeakerGeo, vesselGlassMat);
  phBeaker.position.set(0.12, 0.175, 0);
  phBeaker.renderOrder = 3;
  photoRoot.add(phBeaker);

  // Thermometer probe dipped in water bath
  const phThermo = new THREE.Mesh(phThermoGeo, materials.platinumMetal);
  phThermo.position.set(0.24, 0.24, 0.04);
  phThermo.rotation.z = -0.18;
  photoRoot.add(phThermo);

  const phPlantGroup = new THREE.Group();
  phPlantGroup.position.set(0.12, 0.04, 0);
  photoRoot.add(phPlantGroup);

  // Multi-stem lush Elodea aquatic sprig
  [
    { x: 0, z: 0, tilt: 0 },
    { x: -0.025, z: 0.02, tilt: 0.14 },
    { x: 0.024, z: -0.018, tilt: -0.14 },
  ].forEach(({ x, z, tilt }) => {
    const stem = new THREE.Mesh(phStemGeo, phLeafMat);
    stem.position.set(x, 0.095, z);
    stem.rotation.z = tilt;
    phPlantGroup.add(stem);
  });

  for (let i = 0; i < 12; i++) {
    const leaf = new THREE.Mesh(phLeafGeo, phLeafMat);
    const angle = i * 1.05;
    const rad = 0.025 + (i % 3) * 0.012;
    leaf.scale.set(1.7, 0.42, 0.68);
    leaf.position.set(
      Math.cos(angle) * rad,
      0.035 + i * 0.014,
      Math.sin(angle) * rad,
    );
    leaf.rotation.y = angle;
    phPlantGroup.add(leaf);
  }

  const phFunnel = new THREE.Mesh(phFunnelGeo, vesselGlassMat);
  phFunnel.position.set(0.12, 0.17, 0);
  phFunnel.renderOrder = 3;
  photoRoot.add(phFunnel);

  const phTube = new THREE.Mesh(phTubeGeo, vesselGlassMat);
  phTube.position.set(0.12, 0.35, 0);
  phTube.renderOrder = 3;
  photoRoot.add(phTube);

  const phO2Pocket = new THREE.Mesh(phO2Geo, phO2Mat);
  phO2Pocket.position.set(0.12, 0.47, 0);
  photoRoot.add(phO2Pocket);

  const phLampBase = new THREE.Mesh(phLampBaseGeo, materials.darkIron);
  phLampBase.position.set(-0.34, 0.018, 0);
  photoRoot.add(phLampBase);

  const phLampStand = new THREE.Mesh(phLampStandGeo, materials.darkIron);
  phLampStand.position.set(-0.34, 0.22, 0);
  photoRoot.add(phLampStand);

  const phLampHead = new THREE.Mesh(phLampHeadGeo, materials.brassMetal);
  phLampHead.rotation.z = -Math.PI / 2.6;
  phLampHead.position.set(-0.25, 0.37, 0);
  photoRoot.add(phLampHead);

  const phBulb = new THREE.Mesh(phBulbGeo, phBulbMat);
  phBulb.position.set(-0.195, 0.335, 0);
  photoRoot.add(phBulb);

  const phLightCone = new THREE.Mesh(phLightConeGeo, phLightConeMat);
  phLightCone.rotation.z = Math.PI / 2.3;
  phLightCone.position.set(-0.04, 0.26, 0);
  photoRoot.add(phLightCone);

  const phBubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(eBubbleGeo, eBubbleMat);
    b.position.set(0.12, 0.2, 0);
    photoRoot.add(b);
    phBubbles.push(b);
  }

  // =========================================================================
  // STATION 15: OPTICAL COMPOUND MICROSCOPE (BIOLOGY)
  // =========================================================================
  const microRoot = new THREE.Group();
  microRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.microscope.add(microRoot);

  const mBaseGeo = new THREE.BoxGeometry(0.34, 0.045, 0.44);
  const mArmGeo = new THREE.BoxGeometry(0.064, 0.4, 0.085);
  const mKnobBigGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.022, 18);
  const mKnobSmallGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.032, 16);
  const mStageGeo = new THREE.BoxGeometry(0.26, 0.025, 0.26);
  const mClipGeo = new THREE.BoxGeometry(0.016, 0.008, 0.08);
  const mSlideGeo = new THREE.BoxGeometry(0.15, 0.008, 0.055);
  const mSpecimenGeo = new THREE.CircleGeometry(0.02, 16);
  const mSpecimenMat = new THREE.MeshStandardMaterial({
    color: 0x6c4ab6,
    emissive: 0xe6e0f0,
    emissiveIntensity: 0.4,
  });
  const mTubeGeo = new THREE.CylinderGeometry(0.034, 0.038, 0.25, 18);
  const mEyepieceGeo = new THREE.CylinderGeometry(0.027, 0.029, 0.085, 16);
  const mTurretGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.024, 20);
  const mBandGeo = new THREE.CylinderGeometry(0.0135, 0.0135, 0.012, 12);
  const mLampGeo = new THREE.CylinderGeometry(0.048, 0.054, 0.035, 18);
  const mLampMat = new THREE.MeshStandardMaterial({
    color: 0xfff4d2,
    emissive: 0xffd166,
    emissiveIntensity: 1.4,
  });
  const mRedRingMat = new THREE.MeshStandardMaterial({ color: 0xd9483b });
  const mYellowRingMat = new THREE.MeshStandardMaterial({ color: 0xe6a119 });
  const mBlueRingMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
  disposables.push(
    mBaseGeo,
    mArmGeo,
    mKnobBigGeo,
    mKnobSmallGeo,
    mStageGeo,
    mClipGeo,
    mSlideGeo,
    mSpecimenGeo,
    mSpecimenMat,
    mTubeGeo,
    mEyepieceGeo,
    mTurretGeo,
    mBandGeo,
    mLampGeo,
    mLampMat,
    mRedRingMat,
    mYellowRingMat,
    mBlueRingMat,
  );

  const mBase = new THREE.Mesh(mBaseGeo, materials.darkIron);
  mBase.position.set(0, 0.022, 0);
  mBase.castShadow = true;
  microRoot.add(mBase);

  const mLamp = new THREE.Mesh(mLampGeo, mLampMat);
  mLamp.position.set(0, 0.06, 0.06);
  microRoot.add(mLamp);

  const mArm = new THREE.Mesh(mArmGeo, materials.platinumMetal);
  mArm.position.set(0, 0.23, -0.14);
  mArm.castShadow = true;
  microRoot.add(mArm);

  // Dual rotating brass coarse + fine focus knobs
  const mFocusKnobs = new THREE.Group();
  mFocusKnobs.position.set(0, 0.16, -0.14);
  microRoot.add(mFocusKnobs);
  [-0.048, 0.048].forEach((kx) => {
    const big = new THREE.Mesh(mKnobBigGeo, materials.darkIron);
    big.rotation.z = Math.PI / 2;
    big.position.x = kx;
    const fine = new THREE.Mesh(mKnobSmallGeo, materials.brassMetal);
    fine.rotation.z = Math.PI / 2;
    fine.position.x = kx * 1.25;
    mFocusKnobs.add(big, fine);
  });

  const mStage = new THREE.Mesh(mStageGeo, materials.darkIron);
  mStage.position.set(0, 0.2, 0.02);
  microRoot.add(mStage);

  [-0.065, 0.065].forEach((cx) => {
    const clip = new THREE.Mesh(mClipGeo, materials.platinumMetal);
    clip.position.set(cx, 0.218, 0.04);
    microRoot.add(clip);
  });

  const mSlide = new THREE.Mesh(mSlideGeo, vesselGlassMat);
  mSlide.position.set(0, 0.218, 0.05);
  microRoot.add(mSlide);

  const mSpecimen = new THREE.Mesh(mSpecimenGeo, mSpecimenMat);
  mSpecimen.rotation.x = -Math.PI / 2;
  mSpecimen.position.set(0, 0.223, 0.05);
  microRoot.add(mSpecimen);

  const mHeadGroup = new THREE.Group();
  mHeadGroup.position.set(0, 0.36, 0.04);
  microRoot.add(mHeadGroup);

  const mTube = new THREE.Mesh(mTubeGeo, materials.brassMetal);
  mTube.position.set(0, 0.14, 0);
  mTube.rotation.x = 0.2;
  mHeadGroup.add(mTube);

  const mEyepiece = new THREE.Mesh(mEyepieceGeo, materials.darkIron);
  mEyepiece.position.set(0, 0.285, -0.028);
  mEyepiece.rotation.x = 0.2;
  mHeadGroup.add(mEyepiece);

  const mTurret = new THREE.Group();
  mTurret.position.set(0, 0.02, 0.01);
  mHeadGroup.add(mTurret);
  const turretDisk = new THREE.Mesh(mTurretGeo, materials.platinumMetal);
  mTurret.add(turretDisk);

  // Distinct physical lengths for 4x, 10x, and 40x objective barrels
  const lensRingMats = [mRedRingMat, mYellowRingMat, mBlueRingMat];
  const lensLengths = [0.045, 0.062, 0.082];
  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((ang, idx) => {
    const lx = Math.sin(ang) * 0.032;
    const lz = Math.cos(ang) * 0.032;
    const len = lensLengths[idx];
    const objGeo = new THREE.CylinderGeometry(0.012, 0.0095, len, 12);
    disposables.push(objGeo);
    const lens = new THREE.Mesh(
      objGeo,
      idx === 2 ? materials.brassMetal : materials.platinumMetal,
    );
    lens.position.set(lx, -len / 2 - 0.008, lz);
    mTurret.add(lens);

    const band = new THREE.Mesh(mBandGeo, lensRingMats[idx]);
    band.position.set(lx, -len + 0.004, lz);
    mTurret.add(band);
  });

  // =========================================================================
  // STATION 04: PROJECTILE KINEMATICS LAUNCHER (PHYSICS)
  // =========================================================================
  const projRoot = new THREE.Group();
  projRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.projectile.add(projRoot);

  const prRailGeo = new THREE.BoxGeometry(1.44, 0.038, 0.38);
  const prMountGeo = new THREE.BoxGeometry(0.15, 0.14, 0.15);
  const prQuadArcGeo = new THREE.TorusGeometry(0.12, 0.007, 8, 20, Math.PI / 2);
  const prBarrelGeo = new THREE.CylinderGeometry(0.032, 0.038, 0.3, 16);
  const prSpringRingGeo = new THREE.TorusGeometry(0.04, 0.005, 8, 16);
  const prTargetOuterGeo = new THREE.RingGeometry(0.07, 0.105, 28);
  const prTargetInnerGeo = new THREE.CircleGeometry(0.036, 20);
  const prTargetMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    emissive: 0x2d6a4f,
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const prBullseyeMat = new THREE.MeshStandardMaterial({
    color: 0xd9483b,
    emissive: 0xd9483b,
    emissiveIntensity: 0.25,
    side: THREE.DoubleSide,
  });
  const prMarkerTickGeo = new THREE.BoxGeometry(0.008, 0.006, 0.22);
  const prBallGeo = new THREE.SphereGeometry(0.034, 18, 18);
  const prBallMat = new THREE.MeshStandardMaterial({
    color: 0xc59b57,
    roughness: 0.22,
    metalness: 0.85,
  });
  const prDotGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const prDotMat = new THREE.MeshBasicMaterial({ color: 0x3b5998 });
  disposables.push(
    prRailGeo,
    prMountGeo,
    prQuadArcGeo,
    prBarrelGeo,
    prSpringRingGeo,
    prTargetOuterGeo,
    prTargetInnerGeo,
    prTargetMat,
    prBullseyeMat,
    prMarkerTickGeo,
    prBallGeo,
    prBallMat,
    prDotGeo,
    prDotMat,
  );

  const prRail = new THREE.Mesh(prRailGeo, materials.platinumMetal);
  prRail.position.set(0, 0.019, 0);
  prRail.receiveShadow = true;
  projRoot.add(prRail);

  // Distance scale ticks at 0.5m, 1.0m, 1.5m, 2.0m, 2.5m
  [0.5, 1.0, 1.5, 2.0, 2.5].forEach((m) => {
    const tick = new THREE.Mesh(prMarkerTickGeo, materials.darkIron);
    tick.position.set(-0.56 + m * 0.4, 0.04, 0);
    projRoot.add(tick);
  });

  const prMount = new THREE.Mesh(prMountGeo, materials.darkIron);
  prMount.position.set(-0.56, 0.09, 0);
  projRoot.add(prMount);

  const prQuadArc = new THREE.Mesh(prQuadArcGeo, materials.brassMetal);
  prQuadArc.position.set(-0.56, 0.14, 0.08);
  projRoot.add(prQuadArc);

  const prBarrelPivot = new THREE.Group();
  prBarrelPivot.position.set(-0.56, 0.14, 0);
  projRoot.add(prBarrelPivot);

  const prBarrel = new THREE.Mesh(prBarrelGeo, materials.brassMetal);
  prBarrel.rotation.z = -Math.PI / 2;
  prBarrel.position.x = 0.11;
  prBarrelPivot.add(prBarrel);

  [0.04, 0.08, 0.12].forEach((sx) => {
    const ring = new THREE.Mesh(prSpringRingGeo, materials.darkIron);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = sx;
    prBarrelPivot.add(ring);
  });

  // Concentric Bull's-Eye Target at 2.00 m
  const prTargetOuter = new THREE.Mesh(prTargetOuterGeo, prTargetMat);
  prTargetOuter.rotation.x = -Math.PI / 2;
  prTargetOuter.position.set(0.24, 0.042, 0);
  const prTargetInner = new THREE.Mesh(prTargetInnerGeo, prBullseyeMat);
  prTargetInner.rotation.x = -Math.PI / 2;
  prTargetInner.position.set(0.24, 0.043, 0);
  projRoot.add(prTargetOuter, prTargetInner);

  const prBall = new THREE.Mesh(prBallGeo, prBallMat);
  prBall.position.set(-0.42, 0.16, 0);
  projRoot.add(prBall);

  const prArcDots: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const dot = new THREE.Mesh(prDotGeo, prDotMat);
    projRoot.add(dot);
    prArcDots.push(dot);
  }

  // =========================================================================
  // STATION 11: BOYLE'S LAW GAS PISTON (CHEMISTRY)
  // =========================================================================
  const boylesRoot = new THREE.Group();
  boylesRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.boyles.add(boylesRoot);

  const bBaseGeo = new THREE.BoxGeometry(0.72, 0.05, 0.44);
  const bCylGeo = new THREE.CylinderGeometry(0.128, 0.128, 0.56, 24, 1, true);
  const bScaleRingGeo = new THREE.TorusGeometry(0.13, 0.0028, 6, 24);
  const bChamberGeo = new THREE.CylinderGeometry(0.118, 0.118, 0.54, 20);
  bChamberGeo.translate(0, 0.27, 0);
  const bChamberMat = new THREE.MeshStandardMaterial({
    color: 0xe6e0f0,
    transparent: true,
    opacity: 0.42,
  });
  const bPistonHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.044, 22);
  const bORingGeo = new THREE.TorusGeometry(0.121, 0.006, 8, 24);
  const bPistonRodGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.34, 12);
  const bHandleGeo = new THREE.BoxGeometry(0.2, 0.03, 0.055);
  const bPipeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.28, 12);
  const bGaugeBodyGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.044, 24);
  const bGaugeBezelGeo = new THREE.TorusGeometry(0.105, 0.009, 8, 24);
  const bGaugeFaceGeo = new THREE.CircleGeometry(0.098, 24);
  const bGaugeTex = createPressureDialTexture();
  const bGaugeMat = new THREE.MeshStandardMaterial({
    map: bGaugeTex,
    roughness: 0.35,
  });
  const bGaugeNeedleGeo = new THREE.BoxGeometry(0.008, 0.072, 0.008);
  const bParticleGeo = new THREE.SphereGeometry(0.013, 10, 10);
  const bParticleMat = new THREE.MeshStandardMaterial({
    color: 0x6c4ab6,
    emissive: 0x42335c,
    emissiveIntensity: 0.45,
  });
  disposables.push(
    bBaseGeo,
    bCylGeo,
    bScaleRingGeo,
    bChamberGeo,
    bChamberMat,
    bPistonHeadGeo,
    bORingGeo,
    bPistonRodGeo,
    bHandleGeo,
    bPipeGeo,
    bGaugeBodyGeo,
    bGaugeBezelGeo,
    bGaugeFaceGeo,
    bGaugeTex,
    bGaugeMat,
    bGaugeNeedleGeo,
    bParticleGeo,
    bParticleMat,
  );

  const bBase = new THREE.Mesh(bBaseGeo, materials.darkIron);
  bBase.position.set(0, 0.025, 0);
  bBase.castShadow = true;
  boylesRoot.add(bBase);

  const bChamber = new THREE.Mesh(bChamberGeo, bChamberMat);
  bChamber.position.set(-0.1, 0.05, 0);
  boylesRoot.add(bChamber);

  const bCyl = new THREE.Mesh(bCylGeo, vesselGlassMat);
  bCyl.position.set(-0.1, 0.33, 0);
  bCyl.renderOrder = 3;
  boylesRoot.add(bCyl);

  // Graduated mL cylinder rings (10, 20, 30, 40, 50 mL)
  for (let i = 1; i <= 5; i++) {
    const r = new THREE.Mesh(bScaleRingGeo, materials.darkIron);
    r.rotation.x = Math.PI / 2;
    r.position.set(-0.1, 0.05 + (i / 5) * 0.54, 0);
    boylesRoot.add(r);
  }

  const bPistonGroup = new THREE.Group();
  bPistonGroup.position.set(-0.1, 0.45, 0);
  boylesRoot.add(bPistonGroup);

  const bPistonHead = new THREE.Mesh(bPistonHeadGeo, materials.brassMetal);
  bPistonGroup.add(bPistonHead);
  [-0.012, 0.012].forEach((oy) => {
    const oRing = new THREE.Mesh(bORingGeo, materials.darkIron);
    oRing.rotation.x = Math.PI / 2;
    oRing.position.y = oy;
    bPistonGroup.add(oRing);
  });
  const bPistonRod = new THREE.Mesh(bPistonRodGeo, materials.platinumMetal);
  bPistonRod.position.y = 0.18;
  bPistonGroup.add(bPistonRod);
  const bHandle = new THREE.Mesh(bHandleGeo, materials.walnutBench);
  bHandle.position.y = 0.36;
  bPistonGroup.add(bHandle);

  // Brass manifold tube connecting chamber to Bourdon pressure gauge
  const bPipe = new THREE.Mesh(bPipeGeo, materials.brassMetal);
  bPipe.rotation.z = Math.PI / 2;
  bPipe.position.set(0.05, 0.11, 0);
  boylesRoot.add(bPipe);

  const bGaugeBody = new THREE.Mesh(bGaugeBodyGeo, materials.platinumMetal);
  bGaugeBody.rotation.x = Math.PI / 2;
  bGaugeBody.position.set(0.2, 0.24, 0);
  boylesRoot.add(bGaugeBody);

  const bGaugeBezel = new THREE.Mesh(bGaugeBezelGeo, materials.brassMetal);
  bGaugeBezel.position.set(0.2, 0.24, 0.02);
  boylesRoot.add(bGaugeBezel);

  const bGaugeFace = new THREE.Mesh(bGaugeFaceGeo, bGaugeMat);
  bGaugeFace.position.set(0.2, 0.24, 0.023);
  boylesRoot.add(bGaugeFace);

  const bGaugePivot = new THREE.Group();
  bGaugePivot.position.set(0.2, 0.22, 0.027);
  boylesRoot.add(bGaugePivot);
  const bGaugeNeedle = new THREE.Mesh(bGaugeNeedleGeo, cBandRed);
  bGaugeNeedle.position.y = 0.034;
  bGaugePivot.add(bGaugeNeedle);

  const bParticles: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const p = new THREE.Mesh(bParticleGeo, bParticleMat);
    boylesRoot.add(p);
    bParticles.push(p);
  }

  // =========================================================================
  // STATION 05: STANDING WAVE & RESONANCE BENCH (PHYSICS)
  // =========================================================================
  const waveRoot = new THREE.Group();
  waveRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.wave.add(waveRoot);

  const wBaseGeo = new THREE.BoxGeometry(1.36, 0.04, 0.38);
  const wGenGeo = new THREE.BoxGeometry(0.22, 0.25, 0.24);
  const wDriverGeo = new THREE.ConeGeometry(0.055, 0.05, 18);
  const wPostGeo = new THREE.CylinderGeometry(0.016, 0.02, 0.25, 12);
  const wBridgeGeo = new THREE.BoxGeometry(0.03, 0.08, 0.14);
  const wPulleyGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.022, 18);
  const wWeightDiskGeo = new THREE.CylinderGeometry(0.046, 0.048, 0.024, 16);
  const wBeadGeo = new THREE.SphereGeometry(0.014, 10, 10);
  const wBeadMat = new THREE.MeshStandardMaterial({
    color: 0x3b5998,
    emissive: 0x2563eb,
    emissiveIntensity: 0.45,
  });
  const wNodeMat = new THREE.MeshStandardMaterial({
    color: 0xe6a119,
    emissive: 0xffb703,
    emissiveIntensity: 0.9,
  });
  disposables.push(
    wBaseGeo,
    wGenGeo,
    wDriverGeo,
    wPostGeo,
    wBridgeGeo,
    wPulleyGeo,
    wWeightDiskGeo,
    wBeadGeo,
    wBeadMat,
    wNodeMat,
  );

  const wBase = new THREE.Mesh(wBaseGeo, materials.platinumMetal);
  wBase.position.set(0, 0.02, 0);
  wBase.receiveShadow = true;
  waveRoot.add(wBase);

  const wGen = new THREE.Mesh(wGenGeo, materials.darkIron);
  wGen.position.set(-0.52, 0.145, 0);
  wGen.castShadow = true;
  waveRoot.add(wGen);

  const wDriver = new THREE.Mesh(wDriverGeo, materials.brassMetal);
  wDriver.rotation.z = -Math.PI / 2;
  wDriver.position.set(-0.39, 0.24, 0);
  waveRoot.add(wDriver);

  const wBridge = new THREE.Mesh(wBridgeGeo, materials.walnutBench);
  wBridge.position.set(0.46, 0.2, 0);
  waveRoot.add(wBridge);

  const wPost = new THREE.Mesh(wPostGeo, materials.brassMetal);
  wPost.position.set(0.52, 0.145, 0);
  waveRoot.add(wPost);

  const wPulley = new THREE.Mesh(wPulleyGeo, materials.platinumMetal);
  wPulley.rotation.x = Math.PI / 2;
  wPulley.position.set(0.54, 0.25, 0);
  waveRoot.add(wPulley);

  // Stacked slotted mass hanger (1 to 4 visible brass disks matching tension)
  const wWeightGroup = new THREE.Group();
  wWeightGroup.position.set(0.58, 0.12, 0);
  waveRoot.add(wWeightGroup);
  const wWeightDisks: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const disk = new THREE.Mesh(wWeightDiskGeo, materials.brassMetal);
    disk.position.y = i * 0.027;
    wWeightGroup.add(disk);
    wWeightDisks.push(disk);
  }

  const wStringBeads: THREE.Mesh[] = [];
  for (let i = 0; i < 31; i++) {
    const bead = new THREE.Mesh(wBeadGeo, wBeadMat);
    waveRoot.add(bead);
    wStringBeads.push(bead);
  }

  // =========================================================================
  // STATION 16: DNA DOUBLE HELIX MODEL WITH HELICAL RIBBONS & H-BONDS (BIOLOGY)
  // =========================================================================
  const dnaRoot = new THREE.Group();
  dnaRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.dna.add(dnaRoot);

  const dBaseGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.05, 28);
  const dRodGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.76, 10);
  const dBackboneGeo = new THREE.SphereGeometry(0.023, 12, 12);
  const dHalfRungGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.115, 10);
  dHalfRungGeo.rotateZ(Math.PI / 2);
  const dHBondGeo = new THREE.SphereGeometry(0.008, 8, 8);

  // Smooth helical backbone ribbon curves
  const strand1Pts: THREE.Vector3[] = [];
  const strand2Pts: THREE.Vector3[] = [];
  for (let s = 0; s <= 36; s++) {
    const frac = s / 36;
    const y = 0.08 + frac * 0.56;
    const twist = frac * 5 * 0.65;
    const r = 0.15;
    strand1Pts.push(new THREE.Vector3(Math.cos(twist) * r, y, Math.sin(twist) * r));
    strand2Pts.push(new THREE.Vector3(-Math.cos(twist) * r, y, -Math.sin(twist) * r));
  }
  const dRibbon1Geo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(strand1Pts),
    42,
    0.011,
    8,
    false,
  );
  const dRibbon2Geo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(strand2Pts),
    42,
    0.011,
    8,
    false,
  );

  const dBaseMats: Record<DnaBase, THREE.MeshStandardMaterial> = {
    A: new THREE.MeshStandardMaterial({ color: DNA_BASE_COLORS.A, roughness: 0.35 }),
    T: new THREE.MeshStandardMaterial({ color: DNA_BASE_COLORS.T, roughness: 0.35 }),
    C: new THREE.MeshStandardMaterial({ color: DNA_BASE_COLORS.C, roughness: 0.35 }),
    G: new THREE.MeshStandardMaterial({ color: DNA_BASE_COLORS.G, roughness: 0.35 }),
  };
  const dUnpairedMat = new THREE.MeshStandardMaterial({
    color: 0xcfcac4,
    transparent: true,
    opacity: 0.35,
  });
  const dHBondMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x34d399,
    emissiveIntensity: 0.9,
  });
  disposables.push(
    dBaseGeo,
    dRodGeo,
    dBackboneGeo,
    dHalfRungGeo,
    dHBondGeo,
    dRibbon1Geo,
    dRibbon2Geo,
    dBaseMats.A,
    dBaseMats.T,
    dBaseMats.C,
    dBaseMats.G,
    dUnpairedMat,
    dHBondMat,
  );

  const dBase = new THREE.Mesh(dBaseGeo, materials.darkIron);
  dBase.position.set(0, 0.025, 0);
  dnaRoot.add(dBase);

  const dHelixGroup = new THREE.Group();
  dHelixGroup.position.set(0, 0.05, 0);
  dnaRoot.add(dHelixGroup);

  const dSpine = new THREE.Mesh(dRodGeo, materials.platinumMetal);
  dSpine.position.y = 0.38;
  dHelixGroup.add(dSpine);

  const dRibbon1 = new THREE.Mesh(dRibbon1Geo, materials.brassMetal);
  const dRibbon2 = new THREE.Mesh(dRibbon2Geo, materials.copperWire);
  dHelixGroup.add(dRibbon1, dRibbon2);

  const dnaPairMeshes: THREE.Mesh[] = [];
  const dnaHBondGroups: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const y = 0.1 + i * 0.1;
    const twist = i * 0.65;
    const r = 0.15;
    const cos = Math.cos(twist);
    const sin = Math.sin(twist);

    const b1 = new THREE.Mesh(dBackboneGeo, materials.brassMetal);
    b1.position.set(cos * r, y, sin * r);
    dHelixGroup.add(b1);

    const b2 = new THREE.Mesh(dBackboneGeo, materials.copperWire);
    b2.position.set(-cos * r, y, -sin * r);
    dHelixGroup.add(b2);

    const rungGroup = new THREE.Group();
    rungGroup.position.set(0, y, 0);
    rungGroup.rotation.y = -twist;
    dHelixGroup.add(rungGroup);

    const leftHalf = new THREE.Mesh(dHalfRungGeo, dBaseMats.A);
    leftHalf.position.x = 0.078;
    rungGroup.add(leftHalf);

    const rightHalf = new THREE.Mesh(dHalfRungGeo, dUnpairedMat);
    rightHalf.position.x = -0.078;
    rungGroup.add(rightHalf);

    // Hydrogen-bond bridge beads (shown when pair is valid!)
    const hGroup = new THREE.Group();
    [-0.012, 0, 0.012].forEach((hz) => {
      const dot = new THREE.Mesh(dHBondGeo, dHBondMat);
      dot.position.set(0, 0, hz);
      hGroup.add(dot);
    });
    hGroup.visible = false;
    rungGroup.add(hGroup);

    dnaPairMeshes.push(leftHalf, rightHalf);
    dnaHBondGroups.push(hGroup);
  }

  // =========================================================================
  // RUNTIME STATE TRACKING (ZERO PER-FRAME ALLOCATIONS)
  // =========================================================================
  let pendulumPhaseRad = 0;
  let prevSign = 1;
  let electronProgress = 0;
  let dropAnim = 0;
  let lastDropPulse = 0;
  let lastLaunchPulse = 0;
  let lastProjAngle = -1;
  let lastProjSpeed = -1;
  let projFlightT = -1;
  let projFlightTotalT = 1;
  let wavePhaseRad = 0;
  const _tempPos = new THREE.Vector3();

  const acidColor = new THREE.Color(0xd94f4f);
  const neutralColor = new THREE.Color(0xe6e0f0);
  const basicColor = new THREE.Color(0x6c4ab6);
  const currentLiquidColor = new THREE.Color();

  const UP_AXIS = new THREE.Vector3(0, 1, 0);
  const _rayDir = new THREE.Vector3();

  function positionRaySegment(
    mesh: THREE.Mesh,
    start: THREE.Vector3,
    end: THREE.Vector3,
  ) {
    _rayDir.subVectors(end, start);
    const length = _rayDir.length();
    mesh.position.copy(start).addScaledVector(_rayDir, 0.5);
    mesh.scale.set(1, length, 1);
    mesh.quaternion.setFromUnitVectors(UP_AXIS, _rayDir.normalize());
  }

  const rayOrigin = new THREE.Vector3(0, 0.23, 0);
  const rayEndRed = new THREE.Vector3();
  const rayEndOrange = new THREE.Vector3();
  const rayEndGreen = new THREE.Vector3();
  const rayEndBlue = new THREE.Vector3();
  const rayEndViolet = new THREE.Vector3();

  return {
    update: (
      state: LabExperimentState,
      delta: number,
      elapsed: number,
      activeStation: StationId,
    ) => {
      let oscillationCompleted = false;
      let electrolysisH2Delta = 0;
      let projectileLandedRange: number | null = null;

      // 1. Pendulum
      const visualLen = THREE.MathUtils.mapLinear(
        state.pendulum.lengthM,
        0.4,
        1.6,
        0.42,
        0.78,
      );
      pString.scale.set(1, visualLen, 1);
      pString.position.set(0, -visualLen / 2, 0);
      pBob.position.set(0, -visualLen, 0);

      if (state.pendulum.running) {
        const g = Math.max(0.5, state.pendulum.gravityMs2 || 9.81);
        const omega = Math.sqrt(g / state.pendulum.lengthM);
        pendulumPhaseRad += omega * delta;
        const ampRad = THREE.MathUtils.degToRad(state.pendulum.amplitudeDeg);
        const angle = ampRad * Math.cos(pendulumPhaseRad);
        pendulumPivot.rotation.z = angle;

        // Flash photogate LED when bob passes through bottom nadir
        pGateLedMat.emissiveIntensity = Math.abs(angle) < 0.05 ? 2.2 : 0.15;

        const sign = angle >= 0 ? 1 : -1;
        if (prevSign < 0 && sign > 0) {
          oscillationCompleted = true;
        }
        prevSign = sign;
      } else {
        pGateLedMat.emissiveIntensity = 0.08;
      }

      // 2. Ray Optics Prism (5-band spectrum)
      prismMesh.rotation.y = THREE.MathUtils.degToRad(
        state.optics.prismAngleDeg,
      );
      const beamVisible = state.optics.beamOn;
      incidentBeam.visible = beamVisible;
      rayRed.visible = beamVisible;
      rayOrange.visible = beamVisible;
      rayGreen.visible = beamVisible;
      rayBlue.visible = beamVisible;
      rayViolet.visible = beamVisible;
      spectrumSpot.visible = beamVisible;
      apertureMat.emissiveIntensity = beamVisible ? 1.8 : 0.08;

      if (beamVisible) {
        const angleOffset = (state.optics.prismAngleDeg - 48) * 0.008;
        const zCenter = THREE.MathUtils.clamp(
          0.14 + angleOffset * 0.9,
          -0.14,
          0.42,
        );
        const spread = 0.06 + (state.optics.refractiveIndex - 1.45) * 0.3;
        const baseY = 0.21 - angleOffset * 0.25;
        rayEndRed.set(0.535, baseY + 0.07, zCenter - spread);
        rayEndOrange.set(0.535, baseY + 0.035, zCenter - spread * 0.5);
        rayEndGreen.set(0.535, baseY, zCenter);
        rayEndBlue.set(0.535, baseY - 0.035, zCenter + spread * 0.5);
        rayEndViolet.set(0.535, baseY - 0.07, zCenter + spread);
        positionRaySegment(rayRed, rayOrigin, rayEndRed);
        positionRaySegment(rayOrange, rayOrigin, rayEndOrange);
        positionRaySegment(rayGreen, rayOrigin, rayEndGreen);
        positionRaySegment(rayBlue, rayOrigin, rayEndBlue);
        positionRaySegment(rayViolet, rayOrigin, rayEndViolet);
        spectrumSpot.position.set(0.54, baseY, zCenter);
      }

      // 3. Titration + Spinning Magnetic Stir Bar
      tStirBar.rotation.y += delta * 9.5;
      const ph = state.titration.currentPh;
      if (ph < 6.8) {
        const t = THREE.MathUtils.clamp((ph - 1.2) / 5.6, 0, 1);
        currentLiquidColor.copy(acidColor).lerp(neutralColor, t);
      } else {
        const t = THREE.MathUtils.clamp((ph - 6.8) / 5.5, 0, 1);
        currentLiquidColor.copy(neutralColor).lerp(basicColor, t);
      }
      tLiquidMat.color.copy(currentLiquidColor);

      const flaskFillScale = THREE.MathUtils.clamp(
        0.55 + (state.titration.baseAddedMl / 50) * 0.65,
        0.55,
        1.2,
      );
      tLiquid.scale.set(1, flaskFillScale, 1);
      const liquidSurfaceY = 0.066 + 0.145 * flaskFillScale;

      const buretteFill = THREE.MathUtils.clamp(
        1 - state.titration.baseAddedMl / 50,
        0.06,
        1,
      );
      tBuretteLiquid.scale.set(1, buretteFill, 1);
      tBuretteLiquid.position.y = 0.44 + buretteFill * 0.22;

      if (state.titration.dropPulse !== lastDropPulse) {
        lastDropPulse = state.titration.dropPulse;
        if (state.titration.dropPulse > 0) {
          dropAnim = 1.0;
        }
      }
      if (dropAnim > 0) {
        tDrop.visible = true;
        tDrop.position.y = THREE.MathUtils.lerp(liquidSurfaceY, 0.41, dropAnim);
        tStopcock.rotation.y = Math.PI / 2;
        dropAnim = Math.max(0, dropAnim - delta * 2.8);
      } else {
        tDrop.visible = false;
        tStopcock.rotation.y = 0;
      }

      // 4. Ohm's Law Circuit
      const targetBladeAngle = state.circuit.switchClosed ? 0 : 0.72;
      cSwitchPivot.rotation.z = THREE.MathUtils.damp(
        cSwitchPivot.rotation.z,
        targetBladeAngle,
        12,
        delta,
      );
      const currentNorm = THREE.MathUtils.clamp(
        state.circuit.currentA / 6.0,
        0,
        1,
      );
      const targetNeedleAngle = THREE.MathUtils.lerp(0.62, -0.62, currentNorm);
      cNeedlePivot.rotation.z = THREE.MathUtils.damp(
        cNeedlePivot.rotation.z,
        targetNeedleAngle,
        8,
        delta,
      );
      cResistorMat.emissiveIntensity = state.circuit.switchClosed
        ? 0.2 + currentNorm * 1.4
        : 0;
      cLampMat.emissiveIntensity = state.circuit.switchClosed ? 1.8 : 0;

      if (state.circuit.switchClosed && state.circuit.currentA > 0) {
        electronProgress =
          (electronProgress + delta * (0.16 + currentNorm * 0.52)) % 1;
        electrons.forEach((bead, idx) => {
          bead.visible = true;
          const u = (electronProgress + idx / electrons.length) % 1;
          cWireCurve.getPointAt(u, _tempPos);
          bead.position.copy(_tempPos);
        });
      } else {
        electrons.forEach((bead) => {
          bead.visible = false;
        });
      }

      // 5. Electrolysis
      const h2Frac = THREE.MathUtils.clamp(
        state.electrolysis.h2VolumeMl / 30,
        0.04,
        0.95,
      );
      const o2Frac = THREE.MathUtils.clamp(
        state.electrolysis.o2VolumeMl / 30,
        0.02,
        0.95,
      );
      eGasH2.scale.set(1, h2Frac, 1);
      eGasO2.scale.set(1, o2Frac, 1);
      ePowerLed.visible = state.electrolysis.powerOn;

      if (state.electrolysis.powerOn && state.electrolysis.h2VolumeMl < 30) {
        const rate = (state.electrolysis.voltageV / 12) * 1.8;
        if (activeStation === "electrolysis") {
          electrolysisH2Delta = rate * delta;
        }
        eBubblesH2.forEach((b, idx) => {
          b.visible = true;
          const yProg = (elapsed * (0.9 + rate * 0.4) + idx * 0.1) % 1;
          b.position.set(
            -0.19 + Math.sin(elapsed * 4 + idx) * 0.012,
            0.1 + yProg * 0.36,
            Math.cos(elapsed * 3 + idx) * 0.012,
          );
        });
        eBubblesO2.forEach((b, idx) => {
          b.visible = true;
          const yProg = (elapsed * (0.65 + rate * 0.3) + idx * 0.2) % 1;
          b.position.set(
            0.01 + Math.sin(elapsed * 3.5 + idx) * 0.01,
            0.1 + yProg * 0.36,
            Math.cos(elapsed * 2.5 + idx) * 0.01,
          );
        });
      } else {
        eBubblesH2.forEach((b) => (b.visible = false));
        eBubblesO2.forEach((b) => (b.visible = false));
      }

      // 6. Photosynthesis
      phBulbMat.emissiveIntensity = state.photosynthesis.lampOn
        ? 0.4 + (state.photosynthesis.lightIntensityPct / 100) * 2.0
        : 0.05;
      phLightCone.visible = state.photosynthesis.lampOn;
      phLightConeMat.opacity =
        0.08 + (state.photosynthesis.lightIntensityPct / 100) * 0.25;
      const o2PocketScale = state.photosynthesis.lampOn
        ? THREE.MathUtils.clamp(
            0.15 + state.photosynthesis.bubblesPerMin / 50,
            0.15,
            0.95,
          )
        : 0.12;
      phO2Pocket.scale.set(1, o2PocketScale, 1);

      if (state.photosynthesis.lampOn && state.photosynthesis.bubblesPerMin > 0) {
        const speed = 0.25 + (state.photosynthesis.bubblesPerMin / 50) * 1.1;
        phBubbles.forEach((b, idx) => {
          b.visible = true;
          const prog = (elapsed * speed + idx / phBubbles.length) % 1;
          b.position.set(
            0.12 + Math.sin(elapsed * 3 + idx) * 0.008,
            0.14 + prog * 0.26,
            Math.cos(elapsed * 2 + idx) * 0.006,
          );
        });
      } else {
        phBubbles.forEach((b) => (b.visible = false));
      }

      // 7. Microscope (revolving turret + spinning focus knobs)
      mLampMat.emissiveIntensity = state.microscope.illuminatorOn ? 1.8 : 0.05;
      mSpecimenMat.emissiveIntensity = state.microscope.illuminatorOn
        ? 0.85
        : 0.05;
      const targetTurretY =
        state.microscope.magnification === 4
          ? 0
          : state.microscope.magnification === 10
            ? (Math.PI * 2) / 3
            : (Math.PI * 4) / 3;
      mTurret.rotation.y = THREE.MathUtils.damp(
        mTurret.rotation.y,
        targetTurretY,
        10,
        delta,
      );
      const targetHeadY =
        0.34 + ((state.microscope.focusValue - 50) / 50) * 0.06;
      mHeadGroup.position.y = THREE.MathUtils.damp(
        mHeadGroup.position.y,
        targetHeadY,
        12,
        delta,
      );
      mFocusKnobs.rotation.x = THREE.MathUtils.damp(
        mFocusKnobs.rotation.x,
        (state.microscope.focusValue / 100) * Math.PI * 4,
        10,
        delta,
      );

      // 8. Projectile Kinematics
      const rad = THREE.MathUtils.degToRad(state.projectile.angleDeg);
      prBarrelPivot.rotation.z = rad;

      const v0 = state.projectile.speedMs;
      const gProj = Math.max(0.5, state.projectile.gravityMs2 || 9.81);
      const vx = v0 * Math.cos(rad);
      const vy = v0 * Math.sin(rad);
      const totalT = (2 * vy) / gProj;
      const benchScale = 0.4;

      if (
        lastProjAngle !== state.projectile.angleDeg ||
        lastProjSpeed !== state.projectile.speedMs
      ) {
        lastProjAngle = state.projectile.angleDeg;
        lastProjSpeed = state.projectile.speedMs;
        if (projFlightT < 0) {
          prBall.position.set(
            -0.56 + Math.cos(rad) * 0.2,
            0.14 + Math.sin(rad) * 0.2,
            0,
          );
        }
      }

      prArcDots.forEach((dot, idx) => {
        const frac = (idx + 1) / (prArcDots.length + 1);
        const t = frac * totalT;
        const x = Math.min(1.18, vx * t * benchScale);
        const yBase = (vy * t - 0.5 * gProj * t * t) * benchScale;
        const yDrop = THREE.MathUtils.lerp(0.14, 0.045, frac * frac);
        dot.position.set(-0.56 + x, Math.max(0.045, yDrop + yBase), 0);
      });

      if (state.projectile.launchPulse !== lastLaunchPulse) {
        lastLaunchPulse = state.projectile.launchPulse;
        if (state.projectile.launchPulse > 0) {
          projFlightT = 0;
          projFlightTotalT = totalT;
        }
      }

      if (projFlightT >= 0) {
        projFlightT += delta * 1.1;
        if (projFlightT >= projFlightTotalT) {
          const finalX = Math.min(1.18, vx * projFlightTotalT * benchScale);
          prBall.position.set(-0.56 + finalX, 0.052, 0);
          projFlightT = -1;
          projectileLandedRange = state.projectile.rangeM;
        } else {
          const frac = projFlightT / projFlightTotalT;
          const x = Math.min(1.18, vx * projFlightT * benchScale);
          const yBase =
            (vy * projFlightT - 0.5 * gProj * projFlightT * projFlightT) *
            benchScale;
          const yDrop = THREE.MathUtils.lerp(0.14, 0.052, frac * frac);
          prBall.position.set(-0.56 + x, Math.max(0.052, yDrop + yBase), 0);
        }
      }

      // 9. Boyle's Law Piston & 14 Gas Molecules
      const volFrac = THREE.MathUtils.clamp(state.boyles.volumeMl / 50, 0.2, 1.0);
      const chamberHeight = volFrac * 0.54;
      bChamber.scale.set(1, volFrac, 1);
      bPistonGroup.position.y = THREE.MathUtils.damp(
        bPistonGroup.position.y,
        0.068 + chamberHeight,
        12,
        delta,
      );
      const pNorm = THREE.MathUtils.clamp(
        (state.boyles.pressureKpa - 80) / 320,
        0,
        1,
      );
      bGaugePivot.rotation.z = THREE.MathUtils.damp(
        bGaugePivot.rotation.z,
        THREE.MathUtils.lerp(0.65, -0.65, pNorm),
        10,
        delta,
      );
      const particleSpeed = 1.8 + pNorm * 4.8;
      bParticles.forEach((p, idx) => {
        const px = -0.1 + Math.sin(elapsed * particleSpeed + idx * 1.37) * 0.078;
        const pz = Math.cos(elapsed * (particleSpeed * 0.85) + idx * 1.91) * 0.078;
        const py =
          0.08 +
          Math.abs(Math.sin(elapsed * (particleSpeed * 1.1) + idx * 0.77)) *
            Math.max(0.05, chamberHeight - 0.06);
        p.position.set(px, py, pz);
      });

      // 10. Standing Wave Oscillator (with slotted tension weight stack & node highlights)
      const harmonic = state.wave.harmonicNumber;
      const tensionOffset = THREE.MathUtils.mapLinear(
        state.wave.tensionN,
        10,
        40,
        0.13,
        0.075,
      );
      wWeightGroup.position.y = tensionOffset;
      const visibleDisks = Math.max(
        1,
        Math.min(4, Math.round((state.wave.tensionN / 40) * 4)),
      );
      wWeightDisks.forEach((d, idx) => {
        d.visible = idx < visibleDisks;
      });
      if (state.wave.running) {
        wavePhaseRad += (state.wave.frequencyHz / 8) * delta * 2.2;
      }
      const waveAmp = state.wave.running
        ? Math.cos(wavePhaseRad) * 0.072
        : 0;
      wDriver.position.x = -0.39 + (state.wave.running ? Math.sin(wavePhaseRad) * 0.008 : 0);
      wStringBeads.forEach((bead, idx) => {
        const u = idx / (wStringBeads.length - 1);
        const x = THREE.MathUtils.lerp(-0.37, 0.46, u);
        const sinVal = Math.sin(harmonic * Math.PI * u);
        const y = 0.245 + waveAmp * sinVal;
        bead.position.set(x, y, 0);
        bead.material = Math.abs(sinVal) < 0.14 ? wNodeMat : wBeadMat;
      });

      // 11. DNA Double Helix + Hydrogen-Bond Bridges
      if (state.dna.rotating) {
        dHelixGroup.rotation.y += delta * 0.65;
      }
      for (let i = 0; i < 6; i++) {
        const tmpl = state.dna.templateStrand[i];
        const paired = state.dna.pairedStrand[i];
        const leftMesh = dnaPairMeshes[i * 2];
        const rightMesh = dnaPairMeshes[i * 2 + 1];
        const hGroup = dnaHBondGroups[i];
        leftMesh.material = dBaseMats[tmpl];
        if (paired) {
          const isValid = paired === getComplementaryBase(tmpl);
          rightMesh.material = isValid ? dBaseMats[paired] : dUnpairedMat;
          hGroup.visible = isValid;
        } else {
          rightMesh.material = dUnpairedMat;
          hGroup.visible = false;
        }
      }

      const class10Result = class10Controller.update(state, delta, elapsed);

      return {
        oscillationCompleted,
        electrolysisH2Delta,
        projectileLandedRange,
        displacementProgressDelta: class10Result.displacementProgressDelta,
        reflexCompletedMs: class10Result.reflexCompletedMs,
      };
    },
    dispose: () => {
      class10Controller.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}
