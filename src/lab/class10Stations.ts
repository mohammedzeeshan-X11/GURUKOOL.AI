import * as THREE from "three";
import type { LabMaterialLibrary } from "./materials";
import {
  calculateLensImage,
  calculateMendelOffspring,
  calculateReflexTimeMs,
  calculateResistorsNetwork,
  calculateSolenoidFieldMt,
} from "./quests";
import type { LabExperimentState, StationId } from "./types";

const BENCH_SURFACE_Y = 0.86;
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

function alignCylinderBetween(
  mesh: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radiusScale = 1,
) {
  _dir.subVectors(end, start);
  const len = _dir.length();
  if (len < 0.0005) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  mesh.position.copy(start).addScaledVector(_dir, 0.5);
  mesh.scale.set(radiusScale, len, radiusScale);
  mesh.quaternion.setFromUnitVectors(_up, _dir.normalize());
}

export interface Class10StationsController {
  update: (
    state: LabExperimentState,
    delta: number,
    elapsed: number,
  ) => {
    displacementProgressDelta: number;
    reflexCompletedMs: number | null;
  };
  dispose: () => void;
}

export function buildClass10Stations(
  benchGroups: Record<StationId, THREE.Group>,
  materials: LabMaterialLibrary,
  vesselGlassMat: THREE.Material,
): Class10StationsController {
  const disposables: { dispose: () => void }[] = [];

  // =========================================================================
  // STATION 06: CONVEX LENS & 3-RAY IMAGE FORMATION (PHYSICS)
  // =========================================================================
  const lensRoot = new THREE.Group();
  lensRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.lens.add(lensRoot);

  const railGeo = new THREE.BoxGeometry(1.36, 0.04, 0.15);
  const railTickGeo = new THREE.BoxGeometry(0.006, 0.008, 0.11);
  const carriageGeo = new THREE.BoxGeometry(0.12, 0.075, 0.16);
  const stemGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.2, 12);
  const lensRimGeo = new THREE.TorusGeometry(0.145, 0.013, 12, 32);
  const lensGlassGeo = new THREE.SphereGeometry(0.14, 24, 20);
  lensGlassGeo.scale(0.24, 1, 1);
  const candleBodyGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.14, 14);
  const flameGeo = new THREE.ConeGeometry(0.02, 0.068, 14);
  const screenGeo = new THREE.BoxGeometry(0.026, 0.34, 0.26);
  const rayGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 1, 8);
  const focusPinGeo = new THREE.ConeGeometry(0.014, 0.055, 10);

  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdff3ff,
    roughness: 0.05,
    metalness: 0.0,
    transparent: true,
    opacity: 0.45,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xff9f1c,
    emissiveIntensity: 2.0,
  });
  const imageFlameMat = new THREE.MeshStandardMaterial({
    color: 0xffb703,
    emissive: 0xfb8500,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.9,
  });
  const rayMat1 = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.92,
  });
  const rayMat2 = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.88,
  });
  const rayMat3 = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.85,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0xfbf9f5,
    roughness: 0.8,
  });
  const focusFlagMat = new THREE.MeshStandardMaterial({
    color: 0x3b5998,
    roughness: 0.4,
  });
  const focus2FlagMat = new THREE.MeshStandardMaterial({
    color: 0xd9483b,
    roughness: 0.4,
  });

  disposables.push(
    railGeo,
    railTickGeo,
    carriageGeo,
    stemGeo,
    lensRimGeo,
    lensGlassGeo,
    candleBodyGeo,
    flameGeo,
    screenGeo,
    rayGeo,
    focusPinGeo,
    lensGlassMat,
    flameMat,
    imageFlameMat,
    rayMat1,
    rayMat2,
    rayMat3,
    screenMat,
    focusFlagMat,
    focus2FlagMat,
  );

  const opticalRail = new THREE.Mesh(railGeo, materials.platinumMetal);
  opticalRail.position.set(0, 0.02, 0);
  lensRoot.add(opticalRail);

  for (let i = -6; i <= 6; i++) {
    const tick = new THREE.Mesh(railTickGeo, materials.darkIron);
    tick.position.set(i * 0.1, 0.044, 0);
    lensRoot.add(tick);
  }

  // Dynamic F & 2F rail markers on both sides of the lens
  const fLeftPin = new THREE.Mesh(focusPinGeo, focusFlagMat);
  const fRightPin = new THREE.Mesh(focusPinGeo, focusFlagMat);
  const f2LeftPin = new THREE.Mesh(focusPinGeo, focus2FlagMat);
  const f2RightPin = new THREE.Mesh(focusPinGeo, focus2FlagMat);
  [fLeftPin, fRightPin, f2LeftPin, f2RightPin].forEach((p) => {
    p.position.y = 0.068;
    p.position.z = 0.06;
    lensRoot.add(p);
  });

  // Central Convex Lens Holder
  const lensHolder = new THREE.Group();
  const lensBase = new THREE.Mesh(carriageGeo, materials.darkIron);
  lensBase.position.y = 0.075;
  const lensStem = new THREE.Mesh(stemGeo, materials.brassMetal);
  lensStem.position.y = 0.19;
  const lensRim = new THREE.Mesh(lensRimGeo, materials.brassMetal);
  lensRim.position.y = 0.36;
  lensRim.rotation.y = Math.PI / 2;
  const lensGlass = new THREE.Mesh(lensGlassGeo, lensGlassMat);
  lensGlass.position.y = 0.36;
  lensHolder.add(lensBase, lensStem, lensRim, lensGlass);
  lensRoot.add(lensHolder);

  // Sliding Object Lamp Carriage
  const objectGroup = new THREE.Group();
  const objBase = new THREE.Mesh(carriageGeo, materials.darkIron);
  objBase.position.y = 0.075;
  const objCandle = new THREE.Mesh(candleBodyGeo, materials.warmIvoryTrim);
  objCandle.position.y = 0.24;
  const objFlame = new THREE.Mesh(flameGeo, flameMat);
  objFlame.position.y = 0.35;
  objectGroup.add(objBase, objCandle, objFlame);
  lensRoot.add(objectGroup);

  // Sliding Projection Screen Carriage + Inverted/Erect Projected Image Arrow
  const screenGroup = new THREE.Group();
  const scrBase = new THREE.Mesh(carriageGeo, materials.darkIron);
  scrBase.position.y = 0.075;
  const scrStem = new THREE.Mesh(stemGeo, materials.platinumMetal);
  scrStem.position.y = 0.19;
  const scrPanel = new THREE.Mesh(screenGeo, screenMat);
  scrPanel.position.y = 0.36;
  const imgFlame = new THREE.Mesh(flameGeo, imageFlameMat);
  imgFlame.position.set(-0.018, 0.36, 0);
  screenGroup.add(scrBase, scrStem, scrPanel, imgFlame);
  lensRoot.add(screenGroup);

  // 3 Principal Ray Segments (5 tubes: parallel->lens->img, center->img, F->lens->img)
  const rayParIn = new THREE.Mesh(rayGeo, rayMat1);
  const rayParOut = new THREE.Mesh(rayGeo, rayMat1);
  const rayCenter = new THREE.Mesh(rayGeo, rayMat2);
  const rayFocusIn = new THREE.Mesh(rayGeo, rayMat3);
  const rayFocusOut = new THREE.Mesh(rayGeo, rayMat3);
  lensRoot.add(rayParIn, rayParOut, rayCenter, rayFocusIn, rayFocusOut);

  const pObjTip = new THREE.Vector3();
  const pLensTop = new THREE.Vector3();
  const pLensMid = new THREE.Vector3(0, 0.34, 0);
  const pLensBot = new THREE.Vector3();
  const pImgTip = new THREE.Vector3();

  // =========================================================================
  // STATION 07: SOLENOID ELECTROMAGNET + FIELD LOOPS + PAPERCLIP LIFT (PHYSICS)
  // =========================================================================
  const magRoot = new THREE.Group();
  magRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.electromagnet.add(magRoot);

  const magBaseGeo = new THREE.BoxGeometry(1.16, 0.04, 0.56);
  const bobbinGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.44, 24, 1, true);
  const flangeGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.018, 24);
  const coilRingGeo = new THREE.TorusGeometry(0.092, 0.011, 10, 26);
  const coreGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.52, 20);
  const coreHandleGeo = new THREE.SphereGeometry(0.032, 14, 14);
  const compassBodyGeo = new THREE.CylinderGeometry(0.125, 0.135, 0.042, 26);
  const needleGeo = new THREE.ConeGeometry(0.018, 0.095, 6);
  const terminalGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 12);
  const fieldLoopGeo = new THREE.TorusGeometry(0.24, 0.0045, 8, 36);
  const clipGeo = new THREE.TorusGeometry(0.026, 0.0055, 8, 16);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.34,
    metalness: 0.88,
  });
  const needleRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
  });
  const needleWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.35,
  });
  const fieldLoopMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.25,
  });
  disposables.push(
    magBaseGeo,
    bobbinGeo,
    flangeGeo,
    coilRingGeo,
    coreGeo,
    coreHandleGeo,
    compassBodyGeo,
    needleGeo,
    terminalGeo,
    fieldLoopGeo,
    clipGeo,
    coreMat,
    needleRedMat,
    needleWhiteMat,
    fieldLoopMat,
  );

  const magBase = new THREE.Mesh(magBaseGeo, materials.darkIron);
  magBase.position.y = 0.02;
  magRoot.add(magBase);

  const bobbin = new THREE.Mesh(bobbinGeo, vesselGlassMat);
  bobbin.rotation.z = Math.PI / 2;
  bobbin.position.set(-0.18, 0.23, 0);
  magRoot.add(bobbin);

  [-0.41, 0.05].forEach((fx) => {
    const fl = new THREE.Mesh(flangeGeo, materials.darkIron);
    fl.rotation.z = Math.PI / 2;
    fl.position.set(fx, 0.23, 0);
    magRoot.add(fl);
  });

  // 18 Dense Copper Solenoid Turns
  const coilTurnsMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const turn = new THREE.Mesh(coilRingGeo, materials.copperWire);
    turn.rotation.y = Math.PI / 2;
    turn.position.set(-0.39 + (i / 17) * 0.42, 0.23, 0);
    magRoot.add(turn);
    coilTurnsMeshes.push(turn);
  }

  // Sliding Laminated Soft-Iron Core with Handle
  const ironCoreGroup = new THREE.Group();
  ironCoreGroup.position.set(-0.56, 0.23, 0);
  const ironCoreMesh = new THREE.Mesh(coreGeo, coreMat);
  ironCoreMesh.rotation.z = Math.PI / 2;
  const coreHandle = new THREE.Mesh(coreHandleGeo, materials.walnutBench);
  coreHandle.position.x = -0.28;
  ironCoreGroup.add(ironCoreMesh, coreHandle);
  magRoot.add(ironCoreGroup);

  // 4 Translucent 3D Magnetic Field Lines around Solenoid
  const fieldLoops: THREE.Mesh[] = [];
  [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].forEach((rotX) => {
    const loop = new THREE.Mesh(fieldLoopGeo, fieldLoopMat);
    loop.position.set(-0.18, 0.23, 0);
    loop.scale.set(1.25, 0.72, 1);
    loop.rotation.x = rotX;
    magRoot.add(loop);
    fieldLoops.push(loop);
  });

  // 2 Steel Paperclips lifted when B >= 3.5 mT
  const steelClip1 = new THREE.Mesh(clipGeo, materials.platinumMetal);
  steelClip1.rotation.x = Math.PI / 2;
  steelClip1.position.set(0.11, 0.048, 0.14);
  const steelClip2 = new THREE.Mesh(clipGeo, materials.platinumMetal);
  steelClip2.rotation.x = Math.PI / 2;
  steelClip2.position.set(0.16, 0.048, -0.13);
  magRoot.add(steelClip1, steelClip2);

  // Power Binding Posts
  [-0.45, -0.34].forEach((tx, idx) => {
    const post = new THREE.Mesh(
      terminalGeo,
      idx === 0 ? needleRedMat : materials.brassMetal,
    );
    post.position.set(tx, 0.08, 0.21);
    magRoot.add(post);
  });

  // Pivoted 3D Compass
  const compassGroup = new THREE.Group();
  compassGroup.position.set(0.38, 0.06, 0);
  const compassBody = new THREE.Mesh(compassBodyGeo, materials.brassMetal);
  const compassFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.045, 24),
    screenMat,
  );
  disposables.push(compassFace.geometry);
  compassGroup.add(compassBody, compassFace);

  const needlePivot = new THREE.Group();
  needlePivot.position.y = 0.042;
  const northTip = new THREE.Mesh(needleGeo, needleRedMat);
  northTip.rotation.x = Math.PI / 2;
  northTip.position.z = 0.048;
  const southTip = new THREE.Mesh(needleGeo, needleWhiteMat);
  southTip.rotation.x = -Math.PI / 2;
  southTip.position.z = -0.048;
  needlePivot.add(northTip, southTip);
  compassGroup.add(needlePivot);
  magRoot.add(compassGroup);

  // =========================================================================
  // STATION 08: SERIES & PARALLEL RESISTORS NETWORK (PHYSICS)
  // =========================================================================
  const resRoot = new THREE.Group();
  resRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.resistors.add(resRoot);

  const deckGeo = new THREE.BoxGeometry(1.18, 0.04, 0.62);
  const batteryGeo = new THREE.BoxGeometry(0.18, 0.2, 0.26);
  const resBodyGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.24, 16);
  const resStripeGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.018, 16);
  const bulbDomeGeo = new THREE.SphereGeometry(0.088, 22, 22);
  const filamentGeo = new THREE.TorusGeometry(0.028, 0.006, 8, 16);
  const wireRailGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 1, 8);
  const electronBeadGeo = new THREE.SphereGeometry(0.015, 10, 10);

  const resMat1 = new THREE.MeshStandardMaterial({
    color: 0xd9c2a3,
    roughness: 0.4,
  });
  const resMat2 = new THREE.MeshStandardMaterial({
    color: 0xc9b49a,
    roughness: 0.4,
  });
  const bulbGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffb703,
    emissiveIntensity: 1.2,
  });
  const electronBeadMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
  });
  const stripeBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
  const stripeGreenMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f });
  disposables.push(
    deckGeo,
    batteryGeo,
    resBodyGeo,
    resStripeGeo,
    bulbDomeGeo,
    filamentGeo,
    wireRailGeo,
    electronBeadGeo,
    resMat1,
    resMat2,
    bulbGlowMat,
    electronBeadMat,
    stripeBlueMat,
    stripeGreenMat,
  );

  const resDeck = new THREE.Mesh(deckGeo, materials.darkIron);
  resDeck.position.y = 0.02;
  resRoot.add(resDeck);

  const resBattery = new THREE.Mesh(batteryGeo, materials.walnutBench);
  resBattery.position.set(-0.44, 0.14, 0);
  resRoot.add(resBattery);

  const resBulbDome = new THREE.Mesh(bulbDomeGeo, vesselGlassMat);
  resBulbDome.position.set(0.45, 0.21, 0);
  resBulbDome.renderOrder = 3;
  const resFilament = new THREE.Mesh(filamentGeo, bulbGlowMat);
  resFilament.position.set(0.45, 0.2, 0);
  resRoot.add(resBulbDome, resFilament);

  const resBulbBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.058, 0.11, 16),
    materials.brassMetal,
  );
  disposables.push(resBulbBase.geometry);
  resBulbBase.position.set(0.45, 0.095, 0);
  resRoot.add(resBulbBase);

  const makeResistorAssembly = (mat: THREE.Material, stripeMat: THREE.Material) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(resBodyGeo, mat);
    body.rotation.z = Math.PI / 2;
    g.add(body);
    [-0.06, 0, 0.06].forEach((sx, idx) => {
      const st = new THREE.Mesh(
        resStripeGeo,
        idx === 2 ? materials.brassMetal : stripeMat,
      );
      st.rotation.z = Math.PI / 2;
      st.position.x = sx;
      g.add(st);
    });
    return g;
  };

  const resistor1Group = makeResistorAssembly(resMat1, stripeBlueMat);
  const resistor2Group = makeResistorAssembly(resMat2, stripeGreenMat);
  resRoot.add(resistor1Group, resistor2Group);

  const wireBack = new THREE.Mesh(wireRailGeo, materials.copperWire);
  alignCylinderBetween(
    wireBack,
    new THREE.Vector3(-0.44, 0.1, -0.22),
    new THREE.Vector3(0.45, 0.1, -0.22),
  );
  const wireFront = new THREE.Mesh(wireRailGeo, materials.copperWire);
  alignCylinderBetween(
    wireFront,
    new THREE.Vector3(-0.44, 0.1, 0.22),
    new THREE.Vector3(0.45, 0.1, 0.22),
  );
  const wireLeft = new THREE.Mesh(wireRailGeo, materials.copperWire);
  alignCylinderBetween(
    wireLeft,
    new THREE.Vector3(-0.44, 0.1, -0.22),
    new THREE.Vector3(-0.44, 0.1, 0.22),
  );
  const wireRight = new THREE.Mesh(wireRailGeo, materials.copperWire);
  alignCylinderBetween(
    wireRight,
    new THREE.Vector3(0.45, 0.1, -0.22),
    new THREE.Vector3(0.45, 0.1, 0.22),
  );
  resRoot.add(wireBack, wireFront, wireLeft, wireRight);

  const parallelRailsGroup = new THREE.Group();
  const pRailA = new THREE.Mesh(wireRailGeo, materials.copperWire);
  alignCylinderBetween(
    pRailA,
    new THREE.Vector3(-0.24, 0.12, -0.14),
    new THREE.Vector3(0.24, 0.12, -0.14),
  );
  const pRailB = new THREE.Mesh(wireRailGeo, materials.copperWire);
  alignCylinderBetween(
    pRailB,
    new THREE.Vector3(-0.24, 0.12, 0.14),
    new THREE.Vector3(0.24, 0.12, 0.14),
  );
  parallelRailsGroup.add(pRailA, pRailB);
  resRoot.add(parallelRailsGroup);

  const resBeads: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(electronBeadGeo, electronBeadMat);
    resRoot.add(b);
    resBeads.push(b);
  }
  let resBeadPhase = 0;

  // =========================================================================
  // STATION 12: METAL DISPLACEMENT REACTION + RACK + SEDIMENT (CHEMISTRY)
  // =========================================================================
  const dispRoot = new THREE.Group();
  dispRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.displacement.add(dispRoot);

  const beakerGeo = new THREE.CylinderGeometry(0.18, 0.165, 0.36, 26, 1, true);
  const liquidGeo = new THREE.CylinderGeometry(0.166, 0.155, 0.25, 24);
  const sedimentGeo = new THREE.CylinderGeometry(0.145, 0.15, 0.032, 20);
  const standBaseGeo = new THREE.BoxGeometry(0.44, 0.036, 0.44);
  const standPostGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.64, 12);
  const clampArmGeo = new THREE.BoxGeometry(0.38, 0.026, 0.032);
  const stripGeo = new THREE.BoxGeometry(0.058, 0.25, 0.012);
  const rackGeo = new THREE.BoxGeometry(0.26, 0.04, 0.14);
  const sampleStripGeo = new THREE.BoxGeometry(0.032, 0.14, 0.008);
  const bubbleGeo = new THREE.SphereGeometry(0.0085, 8, 8);

  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d70b8,
    roughness: 0.15,
    transparent: true,
    opacity: 0.78,
  });
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.35,
    metalness: 0.85,
  });
  const sedimentMat = new THREE.MeshStandardMaterial({
    color: 0xb85d3b,
    roughness: 0.75,
    metalness: 0.35,
  });
  const dispBubbleMat = new THREE.MeshBasicMaterial({ color: 0xeaf6ff });
  disposables.push(
    beakerGeo,
    liquidGeo,
    sedimentGeo,
    standBaseGeo,
    standPostGeo,
    clampArmGeo,
    stripGeo,
    rackGeo,
    sampleStripGeo,
    bubbleGeo,
    liquidMat,
    stripMat,
    sedimentMat,
    dispBubbleMat,
  );

  const dispStandBase = new THREE.Mesh(standBaseGeo, materials.darkIron);
  dispStandBase.position.set(-0.08, 0.018, 0);
  const dispStandPost = new THREE.Mesh(standPostGeo, materials.platinumMetal);
  dispStandPost.position.set(-0.24, 0.34, 0);
  dispRoot.add(dispStandBase, dispStandPost);

  const dispBeaker = new THREE.Mesh(beakerGeo, vesselGlassMat);
  dispBeaker.position.set(0.04, 0.21, 0);
  dispBeaker.renderOrder = 3;
  const dispLiquid = new THREE.Mesh(liquidGeo, liquidMat);
  dispLiquid.position.set(0.04, 0.16, 0);
  const dispSediment = new THREE.Mesh(sedimentGeo, sedimentMat);
  dispSediment.position.set(0.04, 0.052, 0);
  dispSediment.scale.set(1, 0.05, 1);
  dispRoot.add(dispLiquid, dispSediment, dispBeaker);

  // Wooden Reagent Strip Rack displaying Fe, Zn, Ag strips
  const stripRack = new THREE.Mesh(rackGeo, materials.walnutBench);
  stripRack.position.set(0.42, 0.02, -0.06);
  dispRoot.add(stripRack);
  [0x6b7280, 0xa8b5c2, 0xe5e7eb].forEach((hex, idx) => {
    const m = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.28,
      metalness: 0.88,
    });
    disposables.push(m);
    const s = new THREE.Mesh(sampleStripGeo, m);
    s.position.set(0.35 + idx * 0.07, 0.1, -0.06);
    dispRoot.add(s);
  });

  const clampGroup = new THREE.Group();
  clampGroup.position.set(0.04, 0.46, 0);
  const clampArm = new THREE.Mesh(clampArmGeo, materials.brassMetal);
  clampArm.position.set(-0.15, 0.1, 0);
  const metalStrip = new THREE.Mesh(stripGeo, stripMat);
  metalStrip.position.set(0, -0.02, 0);
  clampGroup.add(clampArm, metalStrip);
  dispRoot.add(clampGroup);

  const dispBubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(bubbleGeo, dispBubbleMat);
    b.visible = false;
    dispRoot.add(b);
    dispBubbles.push(b);
  }

  const colBlue = new THREE.Color(0x1d70b8);
  const colGreen = new THREE.Color(0x7fb896);
  const colClear = new THREE.Color(0xdbe8f0);
  const colIron = new THREE.Color(0x6b7280);
  const colZinc = new THREE.Color(0x9ca3af);
  const colSilver = new THREE.Color(0xe5e7eb);
  const colCopper = new THREE.Color(0xb85d3b);

  // =========================================================================
  // STATION 13: CARBON ALKANE TETRAHEDRAL BUILDER + 109.5° ARC (CHEMISTRY)
  // =========================================================================
  const carbonRoot = new THREE.Group();
  carbonRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.carbon.add(carbonRoot);

  const molBaseGeo = new THREE.CylinderGeometry(0.24, 0.27, 0.045, 28);
  const molPedestalGeo = new THREE.CylinderGeometry(0.02, 0.028, 0.24, 14);
  const carbonSphereGeo = new THREE.SphereGeometry(0.056, 22, 22);
  const hydrogenSphereGeo = new THREE.SphereGeometry(0.032, 16, 16);
  const bondGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 10);
  const angleArcGeo = new THREE.TorusGeometry(0.095, 0.004, 8, 22, 1.91);

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.26,
    metalness: 0.35,
  });
  const hydrogenMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.1,
  });
  const ccBondMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.35,
    metalness: 0.65,
  });
  const angleArcMat = new THREE.MeshBasicMaterial({
    color: 0xe6a119,
    transparent: true,
    opacity: 0.85,
  });
  disposables.push(
    molBaseGeo,
    molPedestalGeo,
    carbonSphereGeo,
    hydrogenSphereGeo,
    bondGeo,
    angleArcGeo,
    carbonMat,
    hydrogenMat,
    ccBondMat,
    angleArcMat,
  );

  const molBase = new THREE.Mesh(molBaseGeo, materials.darkIron);
  molBase.position.y = 0.022;
  const molPedestal = new THREE.Mesh(molPedestalGeo, materials.brassMetal);
  molPedestal.position.y = 0.14;
  carbonRoot.add(molBase, molPedestal);

  const moleculePivot = new THREE.Group();
  moleculePivot.position.set(0, 0.42, 0);
  carbonRoot.add(moleculePivot);

  const tetArc = new THREE.Mesh(angleArcGeo, angleArcMat);
  tetArc.rotation.z = 0.35;
  moleculePivot.add(tetArc);

  const carbonAtoms: THREE.Mesh[] = [];
  const hydrogenAtoms: THREE.Mesh[] = [];
  const ccBonds: THREE.Mesh[] = [];
  const chBonds: THREE.Mesh[] = [];

  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(carbonSphereGeo, carbonMat);
    moleculePivot.add(c);
    carbonAtoms.push(c);
  }
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(bondGeo, ccBondMat);
    moleculePivot.add(b);
    ccBonds.push(b);
  }
  for (let i = 0; i < 10; i++) {
    const h = new THREE.Mesh(hydrogenSphereGeo, hydrogenMat);
    moleculePivot.add(h);
    hydrogenAtoms.push(h);
    const ch = new THREE.Mesh(bondGeo, materials.platinumMetal);
    moleculePivot.add(ch);
    chBonds.push(ch);
  }

  let builtCarbons = 0;
  const rebuildAlkaneLayout = (n: 1 | 2 | 3 | 4) => {
    builtCarbons = n;
    const stepX = 0.175;
    const zigY = 0.072;
    const xOffset = -((n - 1) * stepX) / 2;

    const cPositions: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const visible = i < n;
      carbonAtoms[i].visible = visible;
      if (visible) {
        const p = new THREE.Vector3(
          xOffset + i * stepX,
          i % 2 === 0 ? -zigY * 0.5 : zigY * 0.5,
          0,
        );
        carbonAtoms[i].position.copy(p);
        cPositions.push(p);
      }
    }
    tetArc.position.copy(cPositions[0]);

    for (let i = 0; i < 3; i++) {
      if (i < n - 1) {
        alignCylinderBetween(ccBonds[i], cPositions[i], cPositions[i + 1]);
      } else {
        ccBonds[i].visible = false;
      }
    }

    const hTargets: { cIdx: number; pos: THREE.Vector3 }[] = [];
    const hLen = 0.135;
    for (let i = 0; i < n; i++) {
      const c = cPositions[i];
      const upSign = i % 2 === 0 ? -1 : 1;
      if (n === 1) {
        [
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0.94, -0.33, 0),
          new THREE.Vector3(-0.47, -0.33, 0.81),
          new THREE.Vector3(-0.47, -0.33, -0.81),
        ].forEach((d) =>
          hTargets.push({
            cIdx: 0,
            pos: c.clone().addScaledVector(d.normalize(), hLen),
          }),
        );
      } else {
        const d1 = new THREE.Vector3(0, upSign * 0.65, 0.76).normalize();
        const d2 = new THREE.Vector3(0, upSign * 0.65, -0.76).normalize();
        hTargets.push({
          cIdx: i,
          pos: c.clone().addScaledVector(d1, hLen),
        });
        hTargets.push({
          cIdx: i,
          pos: c.clone().addScaledVector(d2, hLen),
        });
        if (i === 0) {
          const cap = new THREE.Vector3(-0.92, -upSign * 0.4, 0).normalize();
          hTargets.push({
            cIdx: i,
            pos: c.clone().addScaledVector(cap, hLen),
          });
        }
        if (i === n - 1) {
          const cap = new THREE.Vector3(0.92, -upSign * 0.4, 0).normalize();
          hTargets.push({
            cIdx: i,
            pos: c.clone().addScaledVector(cap, hLen),
          });
        }
      }
    }

    for (let i = 0; i < 10; i++) {
      if (i < hTargets.length) {
        const { cIdx, pos } = hTargets[i];
        hydrogenAtoms[i].visible = true;
        hydrogenAtoms[i].position.copy(pos);
        alignCylinderBetween(chBonds[i], cPositions[cIdx], pos, 0.72);
      } else {
        hydrogenAtoms[i].visible = false;
        chBonds[i].visible = false;
      }
    }
  };
  rebuildAlkaneLayout(1);

  // =========================================================================
  // STATION 17: REFLEX ARC NEURAL PATHWAY + SPINAL BUTTERFLY (BIOLOGY)
  // =========================================================================
  const reflexRoot = new THREE.Group();
  reflexRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.reflex.add(reflexRoot);

  const reflexBoardGeo = new THREE.BoxGeometry(1.24, 0.04, 0.64);
  const heatPadGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.045, 20);
  const spineOuterGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.06, 28);
  const spineGreyBarGeo = new THREE.BoxGeometry(0.12, 0.068, 0.028);
  const spineGreyWingGeo = new THREE.BoxGeometry(0.036, 0.068, 0.11);
  const muscleGeo = new THREE.CapsuleGeometry(0.048, 0.16, 8, 16);
  const impulseGeo = new THREE.SphereGeometry(0.03, 14, 14);
  const synapseGeo = new THREE.SphereGeometry(0.022, 12, 12);

  const heatPadMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xf97316,
    emissiveIntensity: 0.9,
  });
  const spineWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1ece4,
    roughness: 0.45,
  });
  const spineGreyMat = new THREE.MeshStandardMaterial({
    color: 0xa78bfa,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.2,
    roughness: 0.5,
  });
  const sensoryMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.35,
  });
  const motorMat = new THREE.MeshStandardMaterial({
    color: 0xd9483b,
    roughness: 0.35,
  });
  const muscleMat = new THREE.MeshStandardMaterial({
    color: 0xc2415c,
    roughness: 0.55,
  });
  const impulseMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 2.3,
  });

  const sensoryCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.46, 0.11, 0.16),
    new THREE.Vector3(-0.32, 0.25, -0.02),
    new THREE.Vector3(-0.14, 0.34, -0.15),
    new THREE.Vector3(0, 0.35, -0.17),
  ]);
  const motorCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.35, -0.17),
    new THREE.Vector3(0.14, 0.33, -0.14),
    new THREE.Vector3(0.32, 0.22, 0.0),
    new THREE.Vector3(0.44, 0.13, 0.16),
  ]);
  const sensoryTubeGeo = new THREE.TubeGeometry(sensoryCurve, 30, 0.015, 8, false);
  const motorTubeGeo = new THREE.TubeGeometry(motorCurve, 30, 0.015, 8, false);

  disposables.push(
    reflexBoardGeo,
    heatPadGeo,
    spineOuterGeo,
    spineGreyBarGeo,
    spineGreyWingGeo,
    muscleGeo,
    impulseGeo,
    synapseGeo,
    heatPadMat,
    spineWhiteMat,
    spineGreyMat,
    sensoryMat,
    motorMat,
    muscleMat,
    impulseMat,
    sensoryTubeGeo,
    motorTubeGeo,
  );

  const reflexBoard = new THREE.Mesh(reflexBoardGeo, materials.warmIvoryTrim);
  reflexBoard.position.y = 0.02;
  const heatPad = new THREE.Mesh(heatPadGeo, heatPadMat);
  heatPad.position.set(-0.46, 0.062, 0.16);

  // Anatomical Spinal Cord Cross-Section (White Matter + Grey Matter H-Butterfly)
  const spineGroup = new THREE.Group();
  spineGroup.position.set(0, 0.35, -0.17);
  spineGroup.rotation.x = Math.PI / 2;
  const spineOuter = new THREE.Mesh(spineOuterGeo, spineWhiteMat);
  const greyCross = new THREE.Mesh(spineGreyBarGeo, spineGreyMat);
  const greyLeft = new THREE.Mesh(spineGreyWingGeo, spineGreyMat);
  greyLeft.position.x = -0.045;
  const greyRight = new THREE.Mesh(spineGreyWingGeo, spineGreyMat);
  greyRight.position.x = 0.045;
  spineGroup.add(spineOuter, greyCross, greyLeft, greyRight);

  const sensoryTube = new THREE.Mesh(sensoryTubeGeo, sensoryMat);
  const motorTube = new THREE.Mesh(motorTubeGeo, motorMat);
  const synapseDot = new THREE.Mesh(synapseGeo, impulseMat);
  synapseDot.position.set(0, 0.35, -0.13);

  const muscleEffector = new THREE.Mesh(muscleGeo, muscleMat);
  muscleEffector.rotation.z = Math.PI / 2;
  muscleEffector.position.set(0.44, 0.13, 0.16);

  const impulseSphere = new THREE.Mesh(impulseGeo, impulseMat);
  impulseSphere.visible = false;

  reflexRoot.add(
    reflexBoard,
    heatPad,
    spineGroup,
    sensoryTube,
    motorTube,
    synapseDot,
    muscleEffector,
    impulseSphere,
  );

  let lastReflexPulse = 0;
  let reflexProgress = -1;
  let twitchTimer = 0;

  // =========================================================================
  // STATION 18: MENDELIAN MONOHYBRID PEA CROSS + BLOSSOMS & GROW BAR (BIOLOGY)
  // =========================================================================
  const mendelRoot = new THREE.Group();
  mendelRoot.position.set(0, BENCH_SURFACE_Y, 0);
  benchGroups.mendel.add(mendelRoot);

  const trayGeo = new THREE.BoxGeometry(1.16, 0.045, 0.56);
  const potGeo = new THREE.CylinderGeometry(0.088, 0.068, 0.125, 18);
  const soilGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.018, 16);
  const stemPeaGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.1, 10);
  stemPeaGeo.translate(0, 0.05, 0);
  const leafPeaGeo = new THREE.SphereGeometry(0.036, 12, 10);
  leafPeaGeo.scale(1.35, 0.45, 0.82);
  const flowerGeo = new THREE.SphereGeometry(0.022, 10, 10);
  const growPostGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.62, 10);
  const growBarGeo = new THREE.BoxGeometry(1.06, 0.028, 0.055);

  const potMat = new THREE.MeshStandardMaterial({
    color: 0xb45d3c,
    roughness: 0.72,
  });
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x3b2a1e,
    roughness: 0.95,
  });
  const peaGreenMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.52,
  });
  const peaFlowerMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.22,
  });
  const growLightMat = new THREE.MeshStandardMaterial({
    color: 0xfaf5ff,
    emissive: 0xe9d5ff,
    emissiveIntensity: 1.1,
  });

  disposables.push(
    trayGeo,
    potGeo,
    soilGeo,
    stemPeaGeo,
    leafPeaGeo,
    flowerGeo,
    growPostGeo,
    growBarGeo,
    potMat,
    soilMat,
    peaGreenMat,
    peaFlowerMat,
    growLightMat,
  );

  const mendelTray = new THREE.Mesh(trayGeo, materials.walnutBench);
  mendelTray.position.y = 0.022;
  mendelRoot.add(mendelTray);

  // Overhead Greenhouse Grow-Light Frame
  [-0.52, 0.52].forEach((gx) => {
    const post = new THREE.Mesh(growPostGeo, materials.platinumMetal);
    post.position.set(gx, 0.33, -0.2);
    mendelRoot.add(post);
  });
  const growBar = new THREE.Mesh(growBarGeo, growLightMat);
  growBar.position.set(0, 0.63, -0.14);
  mendelRoot.add(growBar);

  const peaPlants: {
    stem: THREE.Mesh;
    crownGroup: THREE.Group;
    midLeaves: THREE.Group;
    currentHeight: number;
  }[] = [];

  for (let i = 0; i < 4; i++) {
    const px = -0.37 + i * 0.245;
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(px, 0.105, 0.02);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.set(px, 0.165, 0.02);
    mendelRoot.add(pot, soil);

    const stem = new THREE.Mesh(stemPeaGeo, peaGreenMat);
    stem.position.set(px, 0.17, 0.02);
    mendelRoot.add(stem);

    const midLeaves = new THREE.Group();
    midLeaves.position.set(px, 0.26, 0.02);
    for (let k = 0; k < 2; k++) {
      const ml = new THREE.Mesh(leafPeaGeo, peaGreenMat);
      ml.position.set(k === 0 ? -0.042 : 0.042, 0, 0.01);
      ml.rotation.z = k === 0 ? 0.35 : -0.35;
      midLeaves.add(ml);
    }
    mendelRoot.add(midLeaves);

    const crownGroup = new THREE.Group();
    crownGroup.position.set(px, 0.24, 0.02);
    for (let l = 0; l < 3; l++) {
      const ang = (l / 3) * Math.PI * 2;
      const leaf = new THREE.Mesh(leafPeaGeo, peaGreenMat);
      leaf.position.set(Math.cos(ang) * 0.048, 0, Math.sin(ang) * 0.048);
      leaf.rotation.y = -ang;
      crownGroup.add(leaf);
    }
    const blossom = new THREE.Mesh(flowerGeo, peaFlowerMat);
    blossom.position.set(0, 0.032, 0);
    crownGroup.add(blossom);
    mendelRoot.add(crownGroup);

    peaPlants.push({ stem, crownGroup, midLeaves, currentHeight: 0.05 });
  }

  return {
    update: (state: LabExperimentState, delta: number, elapsed: number) => {
      let displacementProgressDelta = 0;
      let reflexCompletedMs: number | null = null;

      // 06: Convex Lens (with F/2F moving flags + 3 principal rays)
      const lensRes = calculateLensImage(
        state.lens.objectDistanceCm,
        state.lens.focalLengthCm,
      );
      const scaleCmToM = 0.0115;
      const fWorld = state.lens.focalLengthCm * scaleCmToM;
      const f2World = Math.min(0.62, fWorld * 2);
      fLeftPin.position.x = -fWorld;
      fRightPin.position.x = fWorld;
      f2LeftPin.position.x = -f2World;
      f2RightPin.position.x = f2World;

      const objX = -THREE.MathUtils.clamp(
        state.lens.objectDistanceCm * scaleCmToM,
        0.1,
        0.6,
      );
      objectGroup.position.x = objX;
      flameMat.emissiveIntensity = state.lens.lampOn ? 2.1 : 0.05;

      const imgX =
        lensRes.vCm !== null && lensRes.vCm > 0
          ? THREE.MathUtils.clamp(lensRes.vCm * scaleCmToM, 0.14, 0.6)
          : 0.56;
      screenGroup.position.x = imgX;

      const raysActive = state.lens.lampOn;
      if (raysActive && lensRes.vCm !== null && lensRes.vCm > 0) {
        const mag = THREE.MathUtils.clamp(
          Math.abs(lensRes.magnification ?? 1),
          0.35,
          2.1,
        );
        imgFlame.visible = true;
        imgFlame.rotation.z = Math.PI;
        imgFlame.scale.set(1, mag, 1);
        imgFlame.position.y = 0.34 - 0.04 * mag;

        pObjTip.set(objX, 0.39, 0);
        pLensTop.set(0, 0.39, 0);
        pLensBot.set(0, 0.34 - 0.04 * mag, 0);
        pImgTip.set(imgX - 0.02, 0.34 - 0.055 * mag, 0);

        alignCylinderBetween(rayParIn, pObjTip, pLensTop);
        alignCylinderBetween(rayParOut, pLensTop, pImgTip);
        alignCylinderBetween(rayCenter, pObjTip, pImgTip);
        alignCylinderBetween(rayFocusIn, pObjTip, pLensBot);
        alignCylinderBetween(rayFocusOut, pLensBot, pImgTip);
      } else if (raysActive) {
        imgFlame.visible = false;
        pObjTip.set(objX, 0.39, 0);
        pLensTop.set(0, 0.39, 0);
        pImgTip.set(0.56, 0.44, 0);
        alignCylinderBetween(rayParIn, pObjTip, pLensTop);
        alignCylinderBetween(rayParOut, pLensTop, pImgTip);
        alignCylinderBetween(rayCenter, pObjTip, pLensMid);
        rayFocusIn.visible = false;
        rayFocusOut.visible = false;
      } else {
        imgFlame.visible = false;
        rayParIn.visible = false;
        rayParOut.visible = false;
        rayCenter.visible = false;
        rayFocusIn.visible = false;
        rayFocusOut.visible = false;
      }

      // 07: Solenoid Electromagnet + Field Loops + Paperclip Lift
      const targetCoreX = state.electromagnet.ironCoreInserted ? -0.18 : -0.56;
      ironCoreGroup.position.x = THREE.MathUtils.damp(
        ironCoreGroup.position.x,
        targetCoreX,
        8,
        delta,
      );
      const visibleTurns = Math.max(
        4,
        Math.round((state.electromagnet.coilTurns / 120) * 18),
      );
      coilTurnsMeshes.forEach((m, idx) => {
        m.visible = idx < visibleTurns;
      });
      const fieldMt = calculateSolenoidFieldMt(
        state.electromagnet.powerOn,
        state.electromagnet.currentA,
        state.electromagnet.coilTurns,
        state.electromagnet.ironCoreInserted,
      );
      const targetDeflect = THREE.MathUtils.clamp((fieldMt / 6.0) * 1.38, 0, 1.48);
      needlePivot.rotation.y = THREE.MathUtils.damp(
        needlePivot.rotation.y,
        targetDeflect,
        7,
        delta,
      );
      fieldLoopMat.opacity = state.electromagnet.powerOn
        ? THREE.MathUtils.clamp((fieldMt / 6.0) * 0.65, 0.08, 0.72)
        : 0;
      fieldLoops.forEach((l) => {
        l.visible = state.electromagnet.powerOn && fieldMt > 0.2;
      });

      // Lift steel paperclips up onto solenoid pole when B >= 3.5 mT!
      const liftClips = state.electromagnet.powerOn && fieldMt >= 3.5;
      steelClip1.position.x = THREE.MathUtils.damp(
        steelClip1.position.x,
        liftClips ? 0.075 : 0.11,
        9,
        delta,
      );
      steelClip1.position.y = THREE.MathUtils.damp(
        steelClip1.position.y,
        liftClips ? 0.21 : 0.048,
        9,
        delta,
      );
      steelClip1.position.z = THREE.MathUtils.damp(
        steelClip1.position.z,
        liftClips ? 0.04 : 0.14,
        9,
        delta,
      );
      steelClip2.position.x = THREE.MathUtils.damp(
        steelClip2.position.x,
        liftClips ? 0.078 : 0.16,
        9,
        delta,
      );
      steelClip2.position.y = THREE.MathUtils.damp(
        steelClip2.position.y,
        liftClips ? 0.24 : 0.048,
        9,
        delta,
      );
      steelClip2.position.z = THREE.MathUtils.damp(
        steelClip2.position.z,
        liftClips ? -0.04 : -0.13,
        9,
        delta,
      );

      // 08: Series & Parallel Resistors
      const isParallel = state.resistors.mode === "parallel";
      parallelRailsGroup.visible = isParallel;
      if (isParallel) {
        resistor1Group.position.set(0, 0.125, -0.14);
        resistor2Group.position.set(0, 0.125, 0.14);
      } else {
        resistor1Group.position.set(-0.15, 0.125, -0.22);
        resistor2Group.position.set(0.15, 0.125, -0.22);
      }
      const net = calculateResistorsNetwork(
        state.resistors.mode,
        state.resistors.r1Ohm,
        state.resistors.r2Ohm,
        state.resistors.voltageV,
      );
      bulbGlowMat.emissiveIntensity = THREE.MathUtils.clamp(
        0.3 + net.totalCurrentA * 0.55,
        0.3,
        3.2,
      );
      resBeadPhase = (resBeadPhase + delta * (0.28 + net.totalCurrentA * 0.16)) % 1;
      resBeads.forEach((b, idx) => {
        const u = (resBeadPhase + idx / resBeads.length) % 1;
        if (isParallel && u < 0.5) {
          // Split beads across BOTH parallel branches!
          const branchZ = idx % 2 === 0 ? -0.14 : 0.14;
          b.position.set(THREE.MathUtils.lerp(-0.4, 0.42, u * 2), 0.12, branchZ);
        } else if (u < 0.5) {
          b.position.set(THREE.MathUtils.lerp(-0.4, 0.42, u * 2), 0.11, -0.22);
        } else {
          b.position.set(
            THREE.MathUtils.lerp(0.42, -0.4, (u - 0.5) * 2),
            0.11,
            0.22,
          );
        }
      });

      // 12: Metal Displacement Reaction + Copper Sediment + Bubbles
      const targetClampY = state.displacement.immersed ? 0.25 : 0.47;
      clampGroup.position.y = THREE.MathUtils.damp(
        clampGroup.position.y,
        targetClampY,
        8,
        delta,
      );
      const reactive =
        state.displacement.metal === "Fe" || state.displacement.metal === "Zn";
      const reactingNow =
        state.displacement.immersed &&
        reactive &&
        state.displacement.progressPct < 100;
      if (reactingNow) {
        const tempFactor = 0.6 + ((state.displacement.tempC - 20) / 40) * 1.2;
        const metalBoost = state.displacement.metal === "Zn" ? 1.35 : 1.0;
        displacementProgressDelta = delta * 14 * tempFactor * metalBoost;
      }
      const p = THREE.MathUtils.clamp(state.displacement.progressPct / 100, 0, 1);
      if (state.displacement.metal === "Fe") {
        liquidMat.color.copy(colBlue).lerp(colGreen, p);
        stripMat.color.copy(colIron).lerp(colCopper, p);
      } else if (state.displacement.metal === "Zn") {
        liquidMat.color.copy(colBlue).lerp(colClear, p);
        stripMat.color.copy(colZinc).lerp(colCopper, p);
      } else {
        liquidMat.color.copy(colBlue);
        stripMat.color.copy(colSilver);
      }
      dispSediment.scale.set(1, 0.05 + p * 1.4, 1);
      dispBubbles.forEach((b, idx) => {
        b.visible = reactingNow;
        if (reactingNow) {
          const prog = (elapsed * 0.9 + idx / dispBubbles.length) % 1;
          b.position.set(
            0.04 + Math.sin(elapsed * 4 + idx) * 0.04,
            0.1 + prog * 0.18,
            Math.cos(elapsed * 3.5 + idx) * 0.03,
          );
        }
      });

      // 13: Carbon Alkane Tetrahedral Builder
      if (state.carbon.carbons !== builtCarbons) {
        rebuildAlkaneLayout(state.carbon.carbons);
      }
      if (state.carbon.rotating) {
        moleculePivot.rotation.y += delta * 0.65;
      }

      // 17: Reflex Arc Neural Pathway
      if (state.reflex.triggerPulse !== lastReflexPulse) {
        lastReflexPulse = state.reflex.triggerPulse;
        if (state.reflex.triggerPulse > 0) {
          reflexProgress = 0;
        }
      }
      if (reflexProgress >= 0) {
        const speedNorm = THREE.MathUtils.clamp(
          state.reflex.conductionSpeedMs / 55,
          0.35,
          2.2,
        );
        reflexProgress += delta * 0.95 * speedNorm;
        impulseSphere.visible = true;
        if (reflexProgress <= 0.5) {
          sensoryCurve.getPoint(reflexProgress * 2, impulseSphere.position);
          spineGreyMat.emissiveIntensity = 0.25 + reflexProgress * 1.2;
        } else if (reflexProgress < 1) {
          motorCurve.getPoint((reflexProgress - 0.5) * 2, impulseSphere.position);
          spineGreyMat.emissiveIntensity = 1.4 - reflexProgress;
        } else {
          reflexProgress = -1;
          impulseSphere.visible = false;
          spineGreyMat.emissiveIntensity = 0.2;
          twitchTimer = 0.38;
          reflexCompletedMs = calculateReflexTimeMs(
            state.reflex.conductionSpeedMs,
          );
        }
      }
      if (twitchTimer > 0) {
        twitchTimer = Math.max(0, twitchTimer - delta);
        const s = 1 + Math.sin((twitchTimer / 0.38) * Math.PI) * 0.42;
        muscleEffector.scale.set(s, 1 / Math.sqrt(s), s);
      } else {
        muscleEffector.scale.set(1, 1, 1);
      }

      // 18: Mendelian Monohybrid Pea Cross
      const mendelRes = calculateMendelOffspring(
        state.mendel.parent1,
        state.mendel.parent2,
      );
      peaPlants.forEach((plant, idx) => {
        const genotype = mendelRes.offspring[idx] ?? "Tt";
        const isTall = genotype !== "tt";
        const targetH = state.mendel.grown ? (isTall ? 0.36 : 0.13) : 0.04;
        plant.currentHeight = THREE.MathUtils.damp(
          plant.currentHeight,
          targetH,
          5.5,
          delta,
        );
        plant.stem.scale.y = Math.max(0.3, plant.currentHeight / 0.1);
        plant.crownGroup.position.y = 0.17 + plant.currentHeight;
        plant.midLeaves.visible = state.mendel.grown && isTall && plant.currentHeight > 0.2;
        plant.midLeaves.position.y = 0.17 + plant.currentHeight * 0.55;
        const crownScale = state.mendel.grown ? (isTall ? 1.15 : 0.78) : 0.38;
        plant.crownGroup.scale.setScalar(crownScale);
        plant.crownGroup.rotation.y = Math.sin(elapsed * 1.1 + idx) * 0.12;
      });

      return {
        displacementProgressDelta,
        reflexCompletedMs,
      };
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
