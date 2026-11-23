import * as THREE from "three";
import type { LabMaterialLibrary } from "./materials";
import { createPlaqueTexture } from "./textures";
import type { LabRoomId, StationId } from "./types";

export interface BenchPose {
  id: StationId;
  room: LabRoomId;
  position: THREE.Vector3;
  rotationY: number;
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  labelTitle: string;
  labelFormula: string;
}

function makePose(
  id: StationId,
  room: LabRoomId,
  x: number,
  z: number,
  rotationY: number,
  labelTitle: string,
  labelFormula: string,
): BenchPose {
  const pos = new THREE.Vector3(x, 0, z);
  const frontDir = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const camPos = pos
    .clone()
    .addScaledVector(frontDir, 1.95)
    .add(new THREE.Vector3(0, 1.62, 0));
  const camTarget = pos.clone().add(new THREE.Vector3(0, 1.15, 0));

  return {
    id,
    room,
    position: pos,
    rotationY,
    cameraPosition: camPos,
    cameraTarget: camTarget,
    labelTitle,
    labelFormula,
  };
}

export const BENCH_POSES: Record<StationId, BenchPose> = {
  // =========================================================================
  // ROOM 1: PHYSICS LABORATORY (10 BENCHES · SPACIOUS U-GALLERY)
  // =========================================================================
  pendulum: makePose(
    "pendulum",
    "physics",
    -4.2,
    -5.8,
    0,
    "01 · Simple Pendulum",
    "T = 2π √(L / g)",
  ),
  optics: makePose(
    "optics",
    "physics",
    -1.4,
    -5.8,
    0,
    "02 · Ray Optics Prism",
    "δ = (n − 1)A",
  ),
  doubleslit: makePose(
    "doubleslit",
    "physics",
    1.4,
    -5.8,
    0,
    "09 · Young's Double-Slit",
    "β = λD / d (Quantum Optics)",
  ),
  photoelectric: makePose(
    "photoelectric",
    "physics",
    4.2,
    -5.8,
    0,
    "10 · Photoelectric Tube",
    "eV₀ = hc/λ − φ₀",
  ),
  circuit: makePose(
    "circuit",
    "physics",
    -6.0,
    -2.8,
    Math.PI * 0.5,
    "03 · Ohm's Law Circuit",
    "V = I × R",
  ),
  wave: makePose(
    "wave",
    "physics",
    -6.0,
    0.2,
    Math.PI * 0.5,
    "05 · Standing Wave",
    "fₙ = n · f₁",
  ),
  electromagnet: makePose(
    "electromagnet",
    "physics",
    -6.0,
    3.2,
    Math.PI * 0.5,
    "07 · Solenoid Magnet",
    "B = μᵣ μ₀ (N/L) I",
  ),
  projectile: makePose(
    "projectile",
    "physics",
    6.0,
    -2.8,
    -Math.PI * 0.5,
    "04 · Projectile Launcher",
    "R = v₀² sin(2θ) / g",
  ),
  lens: makePose(
    "lens",
    "physics",
    6.0,
    0.2,
    -Math.PI * 0.5,
    "06 · Convex Lens Bench",
    "1/f = 1/v − 1/u",
  ),
  resistors: makePose(
    "resistors",
    "physics",
    6.0,
    3.2,
    -Math.PI * 0.5,
    "08 · Series & Parallel R",
    "1/R_eq = 1/R₁ + 1/R₂",
  ),

  // =========================================================================
  // ROOM 2: CHEMISTRY LABORATORY (7 BENCHES · GRAND ANALYTICAL U-GALLERY)
  // =========================================================================
  titration: makePose(
    "titration",
    "chemistry",
    -2.6,
    -5.4,
    0,
    "11 · Acid–Base Titration",
    "HCl + NaOH → NaCl + H₂O",
  ),
  haber: makePose(
    "haber",
    "chemistry",
    0,
    -5.4,
    0,
    "16 · Haber–Bosch Reactor",
    "N₂ + 3H₂ ⇌ 2NH₃ (ΔH < 0)",
  ),
  galvanic: makePose(
    "galvanic",
    "chemistry",
    2.6,
    -5.4,
    0,
    "17 · Daniell Galvanic Cell",
    "E = 1.10 − (RT/2F)lnQ",
  ),
  electrolysis: makePose(
    "electrolysis",
    "chemistry",
    -5.4,
    -2.0,
    Math.PI * 0.5,
    "12 · Water Electrolysis",
    "2H₂O → 2H₂ + O₂",
  ),
  displacement: makePose(
    "displacement",
    "chemistry",
    -5.4,
    1.4,
    Math.PI * 0.5,
    "14 · Metal Displacement",
    "Fe + CuSO₄ → FeSO₄ + Cu↓",
  ),
  boyles: makePose(
    "boyles",
    "chemistry",
    5.4,
    -2.0,
    -Math.PI * 0.5,
    "13 · Boyle's Law Piston",
    "P₁V₁ = P₂V₂",
  ),
  carbon: makePose(
    "carbon",
    "chemistry",
    5.4,
    1.4,
    -Math.PI * 0.5,
    "15 · Carbon Alkane Chain",
    "CₙH₂ₙ₊₂ · 109.5° sp³",
  ),

  // =========================================================================
  // ROOM 3: BIOLOGY LABORATORY (7 BENCHES · BOTANICAL & BIOTECH U-GALLERY)
  // =========================================================================
  photosynthesis: makePose(
    "photosynthesis",
    "biology",
    -2.6,
    -5.4,
    0,
    "18 · Photosynthesis Rig",
    "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
  ),
  neuron: makePose(
    "neuron",
    "biology",
    0,
    -5.4,
    0,
    "23 · Action Potential",
    "−70 mV → +40 mV · Synapse",
  ),
  pcr: makePose(
    "pcr",
    "biology",
    2.6,
    -5.4,
    0,
    "24 · PCR Thermal Cycler",
    "N = N₀ · 2ⁿ (94°→56°→72°C)",
  ),
  microscope: makePose(
    "microscope",
    "biology",
    -5.4,
    -2.0,
    Math.PI * 0.5,
    "19 · Optical Microscope",
    "4× · 10× · 40× Cells",
  ),
  reflex: makePose(
    "reflex",
    "biology",
    -5.4,
    1.4,
    Math.PI * 0.5,
    "21 · Reflex Arc Pathway",
    "t = d / v (Spinal Relay)",
  ),
  dna: makePose(
    "dna",
    "biology",
    5.4,
    -2.0,
    -Math.PI * 0.5,
    "20 · DNA Double Helix",
    "A ↔ T · C ↔ G",
  ),
  mendel: makePose(
    "mendel",
    "biology",
    5.4,
    1.4,
    -Math.PI * 0.5,
    "22 · Mendel Pea Cross",
    "Tt × Tt → 3 Tall : 1 Dwarf",
  ),
};

export interface LabRoomResult {
  roomEnvelope: THREE.Group;
  roomEnvelopes: Record<LabRoomId, THREE.Group>;
  benchesRoot: THREE.Group;
  benchGroups: Record<StationId, THREE.Group>;
  selectionRings: Record<StationId, THREE.Mesh>;
  hitProxies: THREE.Mesh[];
  portalProxies: THREE.Mesh[];
  setActiveRoom: (room: LabRoomId, arIsolatedStation?: StationId | null) => void;
  dispose: () => void;
}

function createTiledFloorTexture(
  baseBg: string,
  tileFill: string,
  groutColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = baseBg;
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = tileFill;
    ctx.fillRect(6, 6, 244, 244);
    ctx.fillRect(262, 262, 244, 244);
    ctx.strokeStyle = groutColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 252);
    ctx.strokeRect(258, 2, 252, 252);
    ctx.strokeRect(2, 258, 252, 252);
    ctx.strokeRect(258, 258, 252, 252);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function createWallChartTexture(
  header: string,
  accentHex: string,
  rows: [string, string][],
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#FAF9F6";
    ctx.fillRect(0, 0, 768, 512);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 768, 76);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 30px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(header, 384, 39);

    ctx.textAlign = "left";
    rows.forEach(([title, eq], idx) => {
      const y = 128 + idx * 70;
      ctx.fillStyle = idx % 2 === 0 ? "#F2F0EC" : "#FFFFFF";
      ctx.fillRect(32, y - 26, 704, 54);
      ctx.fillStyle = "#231B16";
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(title, 54, y);
      ctx.fillStyle = accentHex;
      ctx.font = "700 22px monospace";
      ctx.textAlign = "right";
      ctx.fillText(eq, 712, y);
      ctx.textAlign = "left";
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function buildDoorwayPortal(
  targetRoom: LabRoomId,
  signTitle: string,
  signSub: string,
  xPos: number,
  zPos: number,
  frameMat: THREE.Material,
  doorMat: THREE.Material,
  maxAnisotropy: number,
  disposables: { dispose: () => void }[],
): { group: THREE.Group; proxy: THREE.Mesh } {
  const portalGroup = new THREE.Group();
  portalGroup.position.set(xPos, 0, zPos);

  const frameLeftGeo = new THREE.BoxGeometry(0.16, 2.7, 0.2);
  const frameTopGeo = new THREE.BoxGeometry(2.3, 0.2, 0.22);
  const doorPanelGeo = new THREE.BoxGeometry(1.98, 2.52, 0.08);
  const glassPaneGeo = new THREE.PlaneGeometry(1.42, 1.05);
  const handleGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.28, 12);
  const signGeo = new THREE.PlaneGeometry(2.05, 0.42);
  const proxyGeo = new THREE.BoxGeometry(2.35, 2.8, 0.42);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdbe6f6,
    emissive: 0x3b5998,
    emissiveIntensity: 0.22,
    roughness: 0.14,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xc59b57,
    roughness: 0.25,
    metalness: 0.9,
  });
  const signTex = createPlaqueTexture(signTitle, signSub, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.45,
    metalness: 0.06,
  });
  const proxyMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  disposables.push(
    frameLeftGeo,
    frameTopGeo,
    doorPanelGeo,
    glassPaneGeo,
    handleGeo,
    signGeo,
    proxyGeo,
    glassMat,
    handleMat,
    signTex,
    signMat,
    proxyMat,
  );

  const leftPost = new THREE.Mesh(frameLeftGeo, frameMat);
  leftPost.position.set(-1.08, 1.35, 0);
  const rightPost = new THREE.Mesh(frameLeftGeo, frameMat);
  rightPost.position.set(1.08, 1.35, 0);
  const topHeader = new THREE.Mesh(frameTopGeo, frameMat);
  topHeader.position.set(0, 2.72, 0);

  const doorPanel = new THREE.Mesh(doorPanelGeo, doorMat);
  doorPanel.position.set(0, 1.26, 0.04);

  const glassPane = new THREE.Mesh(glassPaneGeo, glassMat);
  glassPane.position.set(0, 1.72, -0.01);
  glassPane.rotation.y = Math.PI;

  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(-0.62, 1.05, -0.04);

  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(0, 3.08, -0.04);
  signMesh.rotation.y = Math.PI;

  const proxy = new THREE.Mesh(proxyGeo, proxyMat);
  proxy.position.set(0, 1.4, -0.1);
  proxy.layers.enable(1);
  proxy.userData.targetRoom = targetRoom;
  proxy.userData.portalLabel = signTitle;

  portalGroup.add(
    leftPost,
    rightPost,
    topHeader,
    doorPanel,
    glassPane,
    handle,
    signMesh,
    proxy,
  );
  return { group: portalGroup, proxy };
}

function buildSubjectShell(
  roomId: LabRoomId,
  config: {
    size: number;
    wallHeight: number;
    floorBg: string;
    tileFill: string;
    grout: string;
    wallColor: number;
    trimColor: number;
    ceilingColor: number;
    plaqueTitle: string;
    plaqueSub: string;
    chartTitle: string;
    chartAccent: string;
    chartRows: [string, string][];
    portals: [
      { target: LabRoomId; title: string; sub: string },
      { target: LabRoomId; title: string; sub: string },
    ];
  },
  materials: LabMaterialLibrary,
  maxAnisotropy: number,
  disposables: { dispose: () => void }[],
): { group: THREE.Group; proxies: THREE.Mesh[] } {
  const group = new THREE.Group();
  group.name = `LabRoom_${roomId}`;

  const half = config.size / 2;
  const h = config.wallHeight;

  const floorTex = createTiledFloorTexture(
    config.floorBg,
    config.tileFill,
    config.grout,
    maxAnisotropy,
  );
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.72,
    metalness: 0.04,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: config.wallColor,
    roughness: 0.86,
    metalness: 0.02,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: config.trimColor,
    roughness: 0.48,
    metalness: 0.14,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: config.ceilingColor,
    roughness: 0.9,
    metalness: 0.0,
  });
  const lightPanelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffaf0,
    emissiveIntensity: 0.95,
    roughness: 0.18,
  });

  const floorGeo = new THREE.PlaneGeometry(config.size, config.size);
  const ceilGeo = new THREE.PlaneGeometry(config.size, config.size);
  const wallGeo = new THREE.PlaneGeometry(config.size, h);
  const trimBandGeo = new THREE.BoxGeometry(config.size - 0.1, 0.14, 0.05);
  const trimSideGeo = new THREE.BoxGeometry(0.05, 0.14, config.size - 0.1);
  const lightPanelGeo = new THREE.BoxGeometry(2.6, 0.06, 1.35);
  const plaqueFrameGeo = new THREE.BoxGeometry(4.5, 1.0, 0.08);
  const plaqueFaceGeo = new THREE.PlaneGeometry(4.24, 0.78);
  const chartFrameGeo = new THREE.BoxGeometry(0.08, 1.65, 2.45);
  const chartFaceGeo = new THREE.PlaneGeometry(2.3, 1.5);

  const plaqueTex = createPlaqueTexture(
    config.plaqueTitle,
    config.plaqueSub,
    maxAnisotropy,
  );
  const plaqueFaceMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    roughness: 0.48,
    metalness: 0.04,
  });

  const chartTex = createWallChartTexture(
    config.chartTitle,
    config.chartAccent,
    config.chartRows,
    maxAnisotropy,
  );
  const chartFaceMat = new THREE.MeshStandardMaterial({
    map: chartTex,
    roughness: 0.55,
    metalness: 0.02,
  });

  disposables.push(
    floorTex,
    floorMat,
    wallMat,
    trimMat,
    ceilMat,
    lightPanelMat,
    floorGeo,
    ceilGeo,
    wallGeo,
    trimBandGeo,
    trimSideGeo,
    lightPanelGeo,
    plaqueFrameGeo,
    plaqueFaceGeo,
    chartFrameGeo,
    chartFaceGeo,
    plaqueTex,
    plaqueFaceMat,
    chartTex,
    chartFaceMat,
  );

  // Floor & Ceiling
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  group.add(ceiling);

  // 4 Perimeter Walls
  const northWall = new THREE.Mesh(wallGeo, wallMat);
  northWall.position.set(0, h / 2, -half);
  const southWall = new THREE.Mesh(wallGeo, wallMat);
  southWall.position.set(0, h / 2, half);
  southWall.rotation.y = Math.PI;
  const westWall = new THREE.Mesh(wallGeo, wallMat);
  westWall.position.set(-half, h / 2, 0);
  westWall.rotation.y = Math.PI / 2;
  const eastWall = new THREE.Mesh(wallGeo, wallMat);
  eastWall.position.set(half, h / 2, 0);
  eastWall.rotation.y = -Math.PI / 2;
  group.add(northWall, southWall, westWall, eastWall);

  // Architectural Chair-Rail & Baseboard Accent Trim
  const northRail = new THREE.Mesh(trimBandGeo, trimMat);
  northRail.position.set(0, 1.15, -half + 0.03);
  const southRail = new THREE.Mesh(trimBandGeo, trimMat);
  southRail.position.set(0, 1.15, half - 0.03);
  const westRail = new THREE.Mesh(trimSideGeo, trimMat);
  westRail.position.set(-half + 0.03, 1.15, 0);
  const eastRail = new THREE.Mesh(trimSideGeo, trimMat);
  eastRail.position.set(half - 0.03, 1.15, 0);
  group.add(northRail, southRail, westRail, eastRail);

  // Skylight Ceiling Panels
  [
    [-3.6, -3.2],
    [3.6, -3.2],
    [-3.6, 2.6],
    [3.6, 2.6],
  ].forEach(([lx, lz]) => {
    const panel = new THREE.Mesh(lightPanelGeo, lightPanelMat);
    panel.position.set(lx, h - 0.04, lz);
    group.add(panel);
  });

  // North Wall Subject Header Plaque
  const plaqueFrame = new THREE.Mesh(plaqueFrameGeo, trimMat);
  plaqueFrame.position.set(0, 3.35, -half + 0.08);
  const plaqueFace = new THREE.Mesh(plaqueFaceGeo, plaqueFaceMat);
  plaqueFace.position.set(0, 3.35, -half + 0.13);
  group.add(plaqueFrame, plaqueFace);

  // West Wall Subject Formula / Reference Chart
  const chartFrame = new THREE.Mesh(chartFrameGeo, trimMat);
  chartFrame.position.set(-half + 0.07, 2.3, -0.5);
  const chartFace = new THREE.Mesh(chartFaceGeo, chartFaceMat);
  chartFace.position.set(-half + 0.12, 2.3, -0.5);
  chartFace.rotation.y = Math.PI / 2;
  group.add(chartFrame, chartFace);

  // East Wall Mirror Reference Board (Room-specific architectural cabinet/prop)
  const shelfFrameGeo = new THREE.BoxGeometry(0.32, 2.1, 2.2);
  const shelfGlassGeo = new THREE.BoxGeometry(0.04, 1.8, 1.96);
  const shelfGlassMat = new THREE.MeshStandardMaterial({
    color: 0xeaf2f8,
    transparent: true,
    opacity: 0.35,
    roughness: 0.12,
  });
  disposables.push(shelfFrameGeo, shelfGlassGeo, shelfGlassMat);
  const cabinet = new THREE.Mesh(shelfFrameGeo, trimMat);
  cabinet.position.set(half - 0.2, 1.05, 0.2);
  const cabinetGlass = new THREE.Mesh(shelfGlassGeo, shelfGlassMat);
  cabinetGlass.position.set(half - 0.37, 1.15, 0.2);
  group.add(cabinet, cabinetGlass);

  // Two Clickable South-Wall Doorway Portals linking directly to the other 2 Subject Rooms
  const portalLeft = buildDoorwayPortal(
    config.portals[0].target,
    config.portals[0].title,
    config.portals[0].sub,
    -2.5,
    half - 0.14,
    trimMat,
    materials.darkIron,
    maxAnisotropy,
    disposables,
  );
  const portalRight = buildDoorwayPortal(
    config.portals[1].target,
    config.portals[1].title,
    config.portals[1].sub,
    2.5,
    half - 0.14,
    trimMat,
    materials.darkIron,
    maxAnisotropy,
    disposables,
  );
  group.add(portalLeft.group, portalRight.group);

  return {
    group,
    proxies: [portalLeft.proxy, portalRight.proxy],
  };
}

export function buildLabRoom(
  materials: LabMaterialLibrary,
  maxAnisotropy: number,
): LabRoomResult {
  const disposables: { dispose: () => void }[] = [];

  const roomEnvelope = new THREE.Group();
  roomEnvelope.name = "AllSubjectRoomsRoot";

  const physicsShell = buildSubjectShell(
    "physics",
    {
      size: 18,
      wallHeight: 4.5,
      floorBg: "#E6ECF4",
      tileFill: "#F2F5FA",
      grout: "#CFD8E6",
      wallColor: 0xedf1f7,
      trimColor: 0x2f4368,
      ceilingColor: 0xf7f9fc,
      plaqueTitle: "POCKET LABS · PHYSICS LABORATORY",
      plaqueSub: "Mechanics · Optics · Electricity · Quantum Physics (01–10)",
      chartTitle: "PHYSICS FORMULAS & CONSTANTS",
      chartAccent: "#2F4368",
      chartRows: [
        ["Simple Pendulum", "T = 2π √(L / g)"],
        ["Thin Lens Equation", "1/f = 1/v − 1/u"],
        ["Double-Slit Fringes", "β = λD / d"],
        ["Photoelectric Effect", "eV₀ = hc/λ − φ₀"],
        ["Solenoid Field", "B = μᵣ μ₀ (N/L) I"],
      ],
      portals: [
        {
          target: "chemistry",
          title: "→ CHEMISTRY LAB",
          sub: "Click Door · Stations 11–17",
        },
        {
          target: "biology",
          title: "→ BIOLOGY LAB",
          sub: "Click Door · Stations 18–24",
        },
      ],
    },
    materials,
    maxAnisotropy,
    disposables,
  );

  const chemistryShell = buildSubjectShell(
    "chemistry",
    {
      size: 17,
      wallHeight: 4.5,
      floorBg: "#EFEAE2",
      tileFill: "#F8F5F0",
      grout: "#DDD4C8",
      wallColor: 0xf6f1e9,
      trimColor: 0x6f4e37,
      ceilingColor: 0xfcfaf6,
      plaqueTitle: "POCKET LABS · CHEMISTRY LABORATORY",
      plaqueSub: "Titration · Kinetics · Equilibrium · Electrochemistry (11–17)",
      chartTitle: "ANALYTICAL & PHYSICAL CHEMISTRY",
      chartAccent: "#6F4E37",
      chartRows: [
        ["Neutralization", "HCl + NaOH → NaCl + H₂O"],
        ["Water Electrolysis", "2H₂O → 2H₂(g) + O₂(g)"],
        ["Haber Equilibrium", "N₂ + 3H₂ ⇌ 2NH₃ (Fe cat.)"],
        ["Nernst Galvanic EMF", "E = E° − (RT/nF) ln Q"],
        ["Alkane Homologues", "CₙH₂ₙ₊₂ (109.5° sp³)"],
      ],
      portals: [
        {
          target: "physics",
          title: "→ PHYSICS LAB",
          sub: "Click Door · Stations 01–10",
        },
        {
          target: "biology",
          title: "→ BIOLOGY LAB",
          sub: "Click Door · Stations 18–24",
        },
      ],
    },
    materials,
    maxAnisotropy,
    disposables,
  );

  const biologyShell = buildSubjectShell(
    "biology",
    {
      size: 17,
      wallHeight: 4.5,
      floorBg: "#E6EFE8",
      tileFill: "#F2F8F3",
      grout: "#CCE0D1",
      wallColor: 0xeef5f0,
      trimColor: 0x2d6a4f,
      ceilingColor: 0xf7fbf8,
      plaqueTitle: "POCKET LABS · BIOLOGY LABORATORY",
      plaqueSub: "Botany · Microscopy · Neuro · Molecular Biotech (18–24)",
      chartTitle: "LIFE SCIENCES & BIOTECHNOLOGY",
      chartAccent: "#2D6A4F",
      chartRows: [
        ["Photosynthesis", "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂"],
        ["Chargaff's Rule", "A = T (2H) · C ≡ G (3H)"],
        ["Action Potential", "−70 mV → +40 mV (Na⁺/K⁺)"],
        ["PCR Amplification", "N = N₀ · 2ⁿ (94°→56°→72°C)"],
        ["Mendel F₂ Ratio", "Tt × Tt → 3 Tall : 1 Dwarf"],
      ],
      portals: [
        {
          target: "physics",
          title: "→ PHYSICS LAB",
          sub: "Click Door · Stations 01–10",
        },
        {
          target: "chemistry",
          title: "→ CHEMISTRY LAB",
          sub: "Click Door · Stations 11–17",
        },
      ],
    },
    materials,
    maxAnisotropy,
    disposables,
  );

  const roomEnvelopes: Record<LabRoomId, THREE.Group> = {
    physics: physicsShell.group,
    chemistry: chemistryShell.group,
    biology: biologyShell.group,
  };

  roomEnvelope.add(
    physicsShell.group,
    chemistryShell.group,
    biologyShell.group,
  );

  // Subject-specific bench top materials
  const physicsTopMat = new THREE.MeshStandardMaterial({
    color: 0x2b364d,
    roughness: 0.42,
    metalness: 0.14,
  });
  const chemistryTopMat = new THREE.MeshStandardMaterial({
    color: 0x2d2926,
    roughness: 0.36,
    metalness: 0.12,
  });
  const biologyTopMat = new THREE.MeshStandardMaterial({
    color: 0x6f5743,
    roughness: 0.5,
    metalness: 0.05,
  });
  disposables.push(physicsTopMat, chemistryTopMat, biologyTopMat);

  const benchTopByRoom: Record<LabRoomId, THREE.Material> = {
    physics: physicsTopMat,
    chemistry: chemistryTopMat,
    biology: biologyTopMat,
  };

  const ringColorByRoom: Record<LabRoomId, number> = {
    physics: 0x3b5998,
    chemistry: 0x6f4e37,
    biology: 0x2d6a4f,
  };

  // Shared Bench Geometries
  const benchesRoot = new THREE.Group();
  benchesRoot.name = "WorkbenchesRoot";

  const benchTopGeo = new THREE.BoxGeometry(1.56, 0.08, 0.92);
  const benchLipGeo = new THREE.BoxGeometry(1.6, 0.03, 0.96);
  const benchLegGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.84, 12);
  const benchShelfGeo = new THREE.BoxGeometry(1.38, 0.035, 0.72);
  const labelBoardGeo = new THREE.PlaneGeometry(0.96, 0.32);
  const ringGeo = new THREE.RingGeometry(0.92, 1.0, 40);
  const proxyGeo = new THREE.BoxGeometry(1.68, 1.5, 1.08);

  const proxyMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  disposables.push(
    benchTopGeo,
    benchLipGeo,
    benchLegGeo,
    benchShelfGeo,
    labelBoardGeo,
    ringGeo,
    proxyGeo,
    proxyMat,
  );

  const benchGroups = {} as Record<StationId, THREE.Group>;
  const selectionRings = {} as Record<StationId, THREE.Mesh>;
  const hitProxies: THREE.Mesh[] = [];
  const portalProxies: THREE.Mesh[] = [
    ...physicsShell.proxies,
    ...chemistryShell.proxies,
    ...biologyShell.proxies,
  ];

  (Object.keys(BENCH_POSES) as StationId[]).forEach((id) => {
    const pose = BENCH_POSES[id];
    const group = new THREE.Group();
    group.name = `Bench_${id}`;
    group.position.copy(pose.position);
    group.rotation.y = pose.rotationY;

    const top = new THREE.Mesh(benchTopGeo, benchTopByRoom[pose.room]);
    top.position.y = 0.84;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const lip = new THREE.Mesh(benchLipGeo, materials.platinumMetal);
    lip.position.y = 0.795;
    group.add(lip);

    const legPositions: [number, number][] = [
      [-0.68, -0.36],
      [0.68, -0.36],
      [-0.68, 0.36],
      [0.68, 0.36],
    ];
    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(benchLegGeo, materials.platinumMetal);
      leg.position.set(lx, 0.42, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    const shelf = new THREE.Mesh(benchShelfGeo, materials.warmIvoryTrim);
    shelf.position.y = 0.22;
    shelf.receiveShadow = true;
    group.add(shelf);

    const labelTex = createPlaqueTexture(
      pose.labelTitle,
      pose.labelFormula,
      maxAnisotropy,
    );
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.45,
      metalness: 0.05,
    });
    disposables.push(labelTex, labelMat);

    const labelMesh = new THREE.Mesh(labelBoardGeo, labelMat);
    labelMesh.position.set(0, 0.56, 0.47);
    group.add(labelMesh);

    const accentColor = ringColorByRoom[pose.room];
    const ringMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    disposables.push(ringMat);

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.008;
    group.add(ring);

    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.position.set(0, 0.9, 0);
    proxy.layers.enable(1);
    proxy.userData.stationId = id;
    group.add(proxy);

    hitProxies.push(proxy);
    benchGroups[id] = group;
    selectionRings[id] = ring;
    benchesRoot.add(group);
  });

  const setActiveRoom = (
    room: LabRoomId,
    arIsolatedStation: StationId | null = null,
  ) => {
    const showRoomShell = arIsolatedStation === null;
    roomEnvelope.visible = showRoomShell;
    roomEnvelopes.physics.visible = showRoomShell && room === "physics";
    roomEnvelopes.chemistry.visible = showRoomShell && room === "chemistry";
    roomEnvelopes.biology.visible = showRoomShell && room === "biology";

    (Object.keys(BENCH_POSES) as StationId[]).forEach((id) => {
      if (arIsolatedStation !== null) {
        benchGroups[id].visible = id === arIsolatedStation;
      } else {
        benchGroups[id].visible = BENCH_POSES[id].room === room;
      }
    });
  };

  setActiveRoom("physics");

  return {
    roomEnvelope,
    roomEnvelopes,
    benchesRoot,
    benchGroups,
    selectionRings,
    hitProxies,
    portalProxies,
    setActiveRoom,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
