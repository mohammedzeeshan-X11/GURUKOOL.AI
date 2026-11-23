import * as THREE from "three";
import {
  LAB_COAT_PRESETS,
  type StudentAvatarProfile,
} from "../context/StudentAvatarContext";

export type AvatarLabAction =
  | "adjust"
  | "pour"
  | "switch"
  | "inspect"
  | "celebrate"
  | "wave";

export interface AvatarControlInput {
  manualMode: boolean;
  moveX: number;
  moveZ: number;
  sprinting?: boolean;
  speaking?: boolean;
  jumpHeight?: number;
}

export interface StudentAvatar3DController {
  group: THREE.Group;
  applyProfile: (profile: StudentAvatarProfile) => void;
  getPosition: () => THREE.Vector3;
  setPosition: (x: number, z: number, yaw?: number) => void;
  triggerAction: (action: AvatarLabAction, durationSec?: number) => void;
  update: (
    delta: number,
    elapsed: number,
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    visible: boolean,
    control?: AvatarControlInput,
  ) => void;
  dispose: () => void;
}

const _dir = new THREE.Vector3();
const _targetPos = new THREE.Vector3();

export function buildStudentAvatar3D(
  initialProfile: StudentAvatarProfile,
): StudentAvatar3DController {
  const group = new THREE.Group();
  group.name = "StudentKidAvatar";

  const disposables: { dispose: () => void }[] = [];

  // Stylized Cartoon Scientist Boy Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: initialProfile.skinTone,
    roughness: 0.68,
    metalness: 0.02,
  });
  const earInnerMat = new THREE.MeshStandardMaterial({
    color: 0xe6a87c,
    roughness: 0.78,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: LAB_COAT_PRESETS[initialProfile.labCoat].coatHex,
    roughness: 0.56,
    metalness: 0.03,
  });
  const coatDetailMat = new THREE.MeshStandardMaterial({
    color: 0xe2eaf2,
    roughness: 0.62,
    metalness: 0.04,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: LAB_COAT_PRESETS[initialProfile.labCoat].trimHex,
    roughness: 0.52,
    metalness: 0.06,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: initialProfile.hairColor,
    roughness: 0.72,
    metalness: 0.05,
  });
  const hairHighlightMat = new THREE.MeshStandardMaterial({
    color: 0xa66233,
    roughness: 0.65,
    metalness: 0.06,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x55687c,
    roughness: 0.82,
    metalness: 0.03,
  });
  const pantsCuffMat = new THREE.MeshStandardMaterial({
    color: 0x3f4f61,
    roughness: 0.84,
    metalness: 0.04,
  });
  const sneakerBlueMat = new THREE.MeshStandardMaterial({
    color: 0x4ca7eb,
    roughness: 0.48,
    metalness: 0.06,
  });
  const sneakerWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fbff,
    roughness: 0.45,
    metalness: 0.04,
  });
  const goggleFrameMat = new THREE.MeshStandardMaterial({
    color: 0x2b3a4b,
    roughness: 0.34,
    metalness: 0.35,
  });
  const goggleLensMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff,
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.34,
    clearcoat: 0.9,
  });
  const goggleRimMat = new THREE.MeshStandardMaterial({
    color: 0xd9ecfa,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.82,
  });
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0x5e3018,
    roughness: 0.25,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x160e0a,
    roughness: 0.18,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: 0x2a1810,
    roughness: 0.6,
  });
  const glintMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const cheekMat = new THREE.MeshStandardMaterial({
    color: 0xf4978e,
    roughness: 0.85,
    transparent: true,
    opacity: 0.34,
  });
  const smileTeethMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.28,
  });
  const smileOutlineMat = new THREE.MeshStandardMaterial({
    color: 0xb97a56,
    roughness: 0.55,
  });
  const flaskGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6f4ff,
    roughness: 0.08,
    metalness: 0.06,
    transparent: true,
    opacity: 0.48,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const flaskRimMat = new THREE.MeshStandardMaterial({
    color: 0xdbeeff,
    roughness: 0.18,
    metalness: 0.12,
  });
  const flaskLiquidMat = new THREE.MeshStandardMaterial({
    color: 0x1874f5,
    emissive: 0x0b4fc4,
    emissiveIntensity: 0.42,
    roughness: 0.18,
    metalness: 0.08,
  });
  const flaskLiquidLightMat = new THREE.MeshStandardMaterial({
    color: 0x56b4ff,
    emissive: 0x2b8cf7,
    emissiveIntensity: 0.32,
    roughness: 0.2,
  });
  const sparkleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const toolBrassMat = new THREE.MeshStandardMaterial({
    color: 0xc99c49,
    roughness: 0.28,
    metalness: 0.85,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x1c2530,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  disposables.push(
    skinMat,
    earInnerMat,
    coatMat,
    coatDetailMat,
    trimMat,
    hairMat,
    hairHighlightMat,
    pantsMat,
    pantsCuffMat,
    sneakerBlueMat,
    sneakerWhiteMat,
    goggleFrameMat,
    goggleLensMat,
    goggleRimMat,
    scleraMat,
    irisMat,
    pupilMat,
    browMat,
    glintMat,
    cheekMat,
    smileTeethMat,
    smileOutlineMat,
    flaskGlassMat,
    flaskRimMat,
    flaskLiquidMat,
    flaskLiquidLightMat,
    sparkleMat,
    toolBrassMat,
    shadowMat,
  );

  // Contact shadow disc grounded flush at y = 0.012
  const shadowGeo = new THREE.CircleGeometry(0.25, 28);
  disposables.push(shadowGeo);
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.012;
  group.add(shadowDisc);

  // =========================================================================
  // FULL-LENGTH SLATE BLUE-GREY TROUSERS + SKY-BLUE & WHITE SNEAKERS
  // =========================================================================
  const trouserGeo = new THREE.CylinderGeometry(0.062, 0.056, 0.34, 14);
  const cuffHemGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.045, 14);
  const shoeUpperGeo = new THREE.BoxGeometry(0.112, 0.062, 0.165);
  const shoeSoleGeo = new THREE.BoxGeometry(0.12, 0.026, 0.205);
  const shoeToeGeo = new THREE.SphereGeometry(0.056, 12, 10);
  const laceBarGeo = new THREE.BoxGeometry(0.064, 0.011, 0.016);
  disposables.push(
    trouserGeo,
    cuffHemGeo,
    shoeUpperGeo,
    shoeSoleGeo,
    shoeToeGeo,
    laceBarGeo,
  );

  const buildScientistLeg = (sideX: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sideX, 0.45, 0);

    const trouser = new THREE.Mesh(trouserGeo, pantsMat);
    trouser.position.y = -0.17;
    trouser.castShadow = true;

    const cuffHem = new THREE.Mesh(cuffHemGeo, pantsCuffMat);
    cuffHem.position.y = -0.345;
    cuffHem.castShadow = true;

    const shoeUpper = new THREE.Mesh(shoeUpperGeo, sneakerBlueMat);
    shoeUpper.position.set(0, -0.392, 0.022);
    shoeUpper.castShadow = true;

    const shoeSole = new THREE.Mesh(shoeSoleGeo, sneakerWhiteMat);
    shoeSole.position.set(0, -0.432, 0.036);
    shoeSole.castShadow = true;

    const shoeToe = new THREE.Mesh(shoeToeGeo, sneakerWhiteMat);
    shoeToe.scale.set(1.02, 0.68, 1.05);
    shoeToe.position.set(0, -0.402, 0.102);

    // Three crisp white sneaker laces on top of the sky-blue upper
    const lace1 = new THREE.Mesh(laceBarGeo, sneakerWhiteMat);
    lace1.position.set(0, -0.362, 0.035);
    const lace2 = new THREE.Mesh(laceBarGeo, sneakerWhiteMat);
    lace2.position.set(0, -0.365, 0.062);
    const lace3 = new THREE.Mesh(laceBarGeo, sneakerWhiteMat);
    lace3.position.set(0, -0.371, 0.085);

    pivot.add(trouser, cuffHem, shoeUpper, shoeSole, shoeToe, lace1, lace2, lace3);
    return pivot;
  };

  const leftLegPivot = buildScientistLeg(-0.082);
  const rightLegPivot = buildScientistLeg(0.082);
  group.add(leftLegPivot, rightLegPivot);

  // =========================================================================
  // UPPER BODY: CRISP WHITE LAB COAT, NOTCHED LAPELS, TEAL V-SHIRT & POCKETS
  // =========================================================================
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const torsoGeo = new THREE.CylinderGeometry(0.156, 0.184, 0.37, 18);
  const skirtGeo = new THREE.CylinderGeometry(0.184, 0.206, 0.18, 18);
  const hemUnderGeo = new THREE.CylinderGeometry(0.188, 0.194, 0.032, 16);
  const pocketGeo = new THREE.BoxGeometry(0.086, 0.086, 0.016);
  const pocketTrimGeo = new THREE.BoxGeometry(0.088, 0.014, 0.018);
  const lapelGeo = new THREE.BoxGeometry(0.056, 0.15, 0.022);
  const vShirtGeo = new THREE.ConeGeometry(0.072, 0.165, 4);
  const seamLineGeo = new THREE.BoxGeometry(0.008, 0.27, 0.012);
  const buttonGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.012, 10);
  disposables.push(
    torsoGeo,
    skirtGeo,
    hemUnderGeo,
    pocketGeo,
    pocketTrimGeo,
    lapelGeo,
    vShirtGeo,
    seamLineGeo,
    buttonGeo,
  );

  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.position.y = 0.675;
  torso.scale.set(1.0, 1.0, 0.74);
  torso.castShadow = true;
  bodyGroup.add(torso);

  const coatSkirt = new THREE.Mesh(skirtGeo, coatMat);
  coatSkirt.position.y = 0.435;
  coatSkirt.scale.set(1.0, 1.0, 0.76);
  coatSkirt.castShadow = true;
  bodyGroup.add(coatSkirt);

  // Subtle dark navy waist band peeking right under the white lab coat hem
  const hemUnder = new THREE.Mesh(hemUnderGeo, pantsCuffMat);
  hemUnder.position.y = 0.34;
  hemUnder.scale.set(0.95, 1.0, 0.74);
  bodyGroup.add(hemUnder);

  // Teal/emerald green V-neck inner shirt peeking cleanly at the collar
  const vShirt = new THREE.Mesh(vShirtGeo, trimMat);
  vShirt.position.set(0, 0.785, 0.105);
  vShirt.rotation.z = Math.PI;
  vShirt.rotation.y = Math.PI / 4;
  vShirt.scale.set(1.15, 1.0, 0.38);
  bodyGroup.add(vShirt);

  // Left and Right crisp white notched lapels
  const leftLapel = new THREE.Mesh(lapelGeo, coatDetailMat);
  leftLapel.position.set(-0.064, 0.79, 0.118);
  leftLapel.rotation.z = 0.34;
  const rightLapel = new THREE.Mesh(lapelGeo, coatDetailMat);
  rightLapel.position.set(0.064, 0.79, 0.118);
  rightLapel.rotation.z = -0.34;
  bodyGroup.add(leftLapel, rightLapel);

  // Front coat seam & subtle buttons
  const seamLine = new THREE.Mesh(seamLineGeo, coatDetailMat);
  seamLine.position.set(0, 0.52, 0.145);
  bodyGroup.add(seamLine);

  [0.64, 0.56].forEach((by) => {
    const btn = new THREE.Mesh(buttonGeo, coatDetailMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0.022, by, 0.146);
    bodyGroup.add(btn);
  });

  // Two iconic square front lab coat pockets
  [-0.088, 0.088].forEach((px) => {
    const pocket = new THREE.Mesh(pocketGeo, coatMat);
    pocket.position.set(px, 0.475, 0.148);
    const pocketLip = new THREE.Mesh(pocketTrimGeo, coatDetailMat);
    pocketLip.position.set(px, 0.514, 0.152);
    bodyGroup.add(pocket, pocketLip);
  });

  // =========================================================================
  // ARTICULATED 2-JOINT ARMS (Shoulder -> Elbow -> Wrist + Palm + Fingers)
  // =========================================================================
  const upperSleeveGeo = new THREE.CylinderGeometry(0.052, 0.047, 0.16, 12);
  const elbowJointGeo = new THREE.SphereGeometry(0.046, 10, 10);
  const forearmSleeveGeo = new THREE.CylinderGeometry(0.045, 0.041, 0.145, 12);
  const cuffGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.022, 12);
  const palmGeo = new THREE.SphereGeometry(0.045, 12, 12);
  const thumbGeo = new THREE.CapsuleGeometry(0.013, 0.024, 4, 8);
  const fingerGeo = new THREE.CapsuleGeometry(0.012, 0.032, 4, 8);
  disposables.push(
    upperSleeveGeo,
    elbowJointGeo,
    forearmSleeveGeo,
    cuffGeo,
    palmGeo,
    thumbGeo,
    fingerGeo,
  );

  const buildArticulatedArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.205, 0.815, 0);

    const upperSleeve = new THREE.Mesh(upperSleeveGeo, coatMat);
    upperSleeve.position.y = -0.078;
    upperSleeve.castShadow = true;
    shoulderPivot.add(upperSleeve);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.156, 0);
    shoulderPivot.add(elbowPivot);

    const elbowBall = new THREE.Mesh(elbowJointGeo, coatMat);
    elbowPivot.add(elbowBall);

    const forearmSleeve = new THREE.Mesh(forearmSleeveGeo, coatMat);
    forearmSleeve.position.y = -0.074;
    forearmSleeve.castShadow = true;
    elbowPivot.add(forearmSleeve);

    const cuff = new THREE.Mesh(cuffGeo, coatDetailMat);
    cuff.position.y = -0.145;
    elbowPivot.add(cuff);

    const wristGroup = new THREE.Group();
    wristGroup.position.set(0, -0.174, 0);
    elbowPivot.add(wristGroup);

    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.scale.set(0.94, 1.04, 0.74);
    wristGroup.add(palm);

    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(-side * 0.033, -0.008, 0.024);
    thumb.rotation.z = side * 0.55;
    wristGroup.add(thumb);

    const fingers = new THREE.Mesh(fingerGeo, skinMat);
    fingers.position.set(0, -0.036, 0.014);
    fingers.rotation.x = 0.34;
    wristGroup.add(fingers);

    return { shoulderPivot, elbowPivot, wristGroup };
  };

  const leftArm = buildArticulatedArm(-1);
  const rightArm = buildArticulatedArm(1);
  bodyGroup.add(leftArm.shoulderPivot, rightArm.shoulderPivot);

  // =========================================================================
  // SIGNATURE PROP: ROUND-BOTTOM FLORENCE FLASK WITH BLUE LIQUID & SPARKLES
  // Held proudly in Left Hand (matches the exact cartoon scientist boy!)
  // =========================================================================
  const flaskGroup = new THREE.Group();
  const flaskBulbGeo = new THREE.SphereGeometry(0.088, 20, 18);
  const flaskNeckGeo = new THREE.CylinderGeometry(0.026, 0.03, 0.078, 14);
  const flaskRimGeo = new THREE.TorusGeometry(0.031, 0.007, 8, 18);
  const flaskLiquidGeo = new THREE.SphereGeometry(
    0.078,
    18,
    14,
    0,
    Math.PI * 2,
    Math.PI * 0.48,
    Math.PI * 0.52,
  );
  const flaskLiquidTopGeo = new THREE.CircleGeometry(0.076, 18);
  const sparkleGeo = new THREE.OctahedronGeometry(0.022, 0);
  disposables.push(
    flaskBulbGeo,
    flaskNeckGeo,
    flaskRimGeo,
    flaskLiquidGeo,
    flaskLiquidTopGeo,
    sparkleGeo,
  );

  // Position flask so the fingers grip the glass neck & the bulb hangs naturally
  const flaskBulb = new THREE.Mesh(flaskBulbGeo, flaskGlassMat);
  flaskBulb.position.set(0, -0.095, 0.035);
  flaskBulb.renderOrder = 4;

  const flaskNeck = new THREE.Mesh(flaskNeckGeo, flaskGlassMat);
  flaskNeck.position.set(0, 0.01, 0.035);
  flaskNeck.renderOrder = 4;

  const flaskRim = new THREE.Mesh(flaskRimGeo, flaskRimMat);
  flaskRim.rotation.x = Math.PI / 2;
  flaskRim.position.set(0, 0.05, 0.035);

  const flaskLiquid = new THREE.Mesh(flaskLiquidGeo, flaskLiquidMat);
  flaskLiquid.position.set(0, -0.095, 0.035);

  const flaskLiquidTop = new THREE.Mesh(flaskLiquidTopGeo, flaskLiquidLightMat);
  flaskLiquidTop.rotation.x = -Math.PI / 2;
  flaskLiquidTop.position.set(0, -0.092, 0.035);

  // Two cute cartoon diamond sparkles floating right above the flask rim
  const sparkle1 = new THREE.Mesh(sparkleGeo, sparkleMat);
  sparkle1.position.set(-0.025, 0.115, 0.045);
  sparkle1.scale.set(0.65, 1.35, 0.3);
  const sparkle2 = new THREE.Mesh(sparkleGeo, sparkleMat);
  sparkle2.position.set(0.042, 0.155, 0.045);
  sparkle2.scale.set(0.85, 1.6, 0.35);

  flaskGroup.add(
    flaskLiquid,
    flaskLiquidTop,
    flaskBulb,
    flaskNeck,
    flaskRim,
    sparkle1,
    sparkle2,
  );
  flaskGroup.position.set(-0.012, -0.015, 0.022);
  leftArm.wristGroup.add(flaskGroup);

  // Right Hand Dynamic Lab Tools (Pipette & Brass Probe during bench actions)
  const pipetteGroup = new THREE.Group();
  const pipetteTubeGeo = new THREE.CylinderGeometry(0.012, 0.005, 0.16, 10);
  const pipetteBulbGeo = new THREE.SphereGeometry(0.022, 10, 10);
  const pipetteLiquidGeo = new THREE.CylinderGeometry(0.008, 0.004, 0.07, 8);
  disposables.push(pipetteTubeGeo, pipetteBulbGeo, pipetteLiquidGeo);
  const pipetteTube = new THREE.Mesh(pipetteTubeGeo, flaskGlassMat);
  pipetteTube.position.y = 0.01;
  const pipetteBulb = new THREE.Mesh(pipetteBulbGeo, trimMat);
  pipetteBulb.position.y = 0.095;
  const pipetteLiquid = new THREE.Mesh(pipetteLiquidGeo, flaskLiquidLightMat);
  pipetteLiquid.position.y = -0.025;
  pipetteGroup.add(pipetteTube, pipetteBulb, pipetteLiquid);
  pipetteGroup.position.set(0, -0.03, 0.055);
  pipetteGroup.rotation.x = Math.PI * 0.42;
  pipetteGroup.visible = false;
  rightArm.wristGroup.add(pipetteGroup);

  const probeGroup = new THREE.Group();
  const probeRodGeo = new THREE.CylinderGeometry(0.009, 0.007, 0.19, 10);
  const probeTipGeo = new THREE.SphereGeometry(0.015, 10, 10);
  disposables.push(probeRodGeo, probeTipGeo);
  const probeRod = new THREE.Mesh(probeRodGeo, toolBrassMat);
  probeRod.position.y = 0.02;
  const probeTip = new THREE.Mesh(probeTipGeo, flaskLiquidLightMat);
  probeTip.position.y = 0.115;
  probeGroup.add(probeRod, probeTip);
  probeGroup.position.set(0, -0.025, 0.05);
  probeGroup.rotation.x = Math.PI * 0.48;
  probeGroup.visible = false;
  rightArm.wristGroup.add(probeGroup);

  // =========================================================================
  // CARTOON SCIENTIST BOY HEAD: BIG BROWN EYES, TOOTHY GRIN, SIDE-SWEPT HAIR & GOGGLES
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.915, 0);
  bodyGroup.add(headGroup);

  const neckGeo = new THREE.CylinderGeometry(0.052, 0.06, 0.085, 12);
  const headGeo = new THREE.SphereGeometry(0.215, 26, 24);
  const earGeo = new THREE.SphereGeometry(0.042, 12, 10);
  const earInnerGeo = new THREE.SphereGeometry(0.024, 10, 8);
  const scleraGeo = new THREE.SphereGeometry(0.04, 14, 14);
  const irisGeo = new THREE.SphereGeometry(0.026, 12, 12);
  const pupilGeo = new THREE.SphereGeometry(0.016, 10, 10);
  const glintGeo = new THREE.SphereGeometry(0.0085, 8, 8);
  const browGeo = new THREE.TorusGeometry(0.036, 0.0068, 8, 16, Math.PI * 0.72);
  const noseGeo = new THREE.SphereGeometry(0.018, 10, 10);
  const cheekGeo = new THREE.SphereGeometry(0.032, 10, 10);
  const smileTeethGeo = new THREE.CircleGeometry(0.058, 18, Math.PI, Math.PI);
  const smileRimGeo = new THREE.TorusGeometry(0.059, 0.0055, 8, 18, Math.PI);
  disposables.push(
    neckGeo,
    headGeo,
    earGeo,
    earInnerGeo,
    scleraGeo,
    irisGeo,
    pupilGeo,
    glintGeo,
    browGeo,
    noseGeo,
    cheekGeo,
    smileTeethGeo,
    smileRimGeo,
  );

  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = -0.015;
  headGroup.add(neck);

  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.16;
  headMesh.scale.set(1.03, 1.0, 0.96);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Rounded Cartoon Ears with inner shadow
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * 0.214, 0.145, -0.01);
    ear.scale.set(0.75, 1.0, 0.72);
    const earIn = new THREE.Mesh(earInnerGeo, earInnerMat);
    earIn.position.set(side * 0.222, 0.142, 0.004);
    earIn.scale.set(0.55, 0.8, 0.5);
    headGroup.add(ear, earIn);
  });

  // Expressive Big Cartoon Eyes (White Sclera + Warm Brown Iris + Pupil + Catchlight)
  [-1, 1].forEach((side) => {
    const ex = side * 0.072;
    const sclera = new THREE.Mesh(scleraGeo, scleraMat);
    sclera.position.set(ex, 0.172, 0.178);
    sclera.scale.set(0.92, 1.12, 0.52);

    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(ex, 0.17, 0.194);
    iris.scale.set(0.95, 1.05, 0.45);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(ex, 0.17, 0.202);
    pupil.scale.set(1.0, 1.05, 0.4);

    const glint = new THREE.Mesh(glintGeo, glintMat);
    glint.position.set(ex + 0.011, 0.181, 0.208);

    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.set(ex, 0.212, 0.186);
    brow.rotation.z = Math.PI * 0.14;

    headGroup.add(sclera, iris, pupil, glint, brow);
  });

  // Cute Nose, Warm Cheeks & Big Bright Toothy Smile
  const noseMesh = new THREE.Mesh(noseGeo, earInnerMat);
  noseMesh.position.set(0, 0.132, 0.208);
  noseMesh.scale.set(0.9, 0.72, 0.72);

  const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
  leftCheek.scale.set(1.2, 0.75, 0.45);
  leftCheek.position.set(-0.125, 0.115, 0.165);
  const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
  rightCheek.scale.set(1.2, 0.75, 0.45);
  rightCheek.position.set(0.125, 0.115, 0.165);

  const smileTeeth = new THREE.Mesh(smileTeethGeo, smileTeethMat);
  smileTeeth.position.set(0, 0.104, 0.196);
  smileTeeth.rotation.x = 0.18;

  const smileRim = new THREE.Mesh(smileRimGeo, smileOutlineMat);
  smileRim.position.set(0, 0.104, 0.197);
  smileRim.rotation.z = Math.PI;
  smileRim.rotation.x = 0.18;

  headGroup.add(noseMesh, leftCheek, rightCheek, smileTeeth, smileRim);

  // =========================================================================
  // SIGNATURE SIDE-SWEPT CHESTNUT BROWN HAIR (+ Optional Hair Styles)
  // =========================================================================
  const hairCapGeo = new THREE.SphereGeometry(
    0.228,
    24,
    18,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.58,
  );
  const backHairGeo = new THREE.SphereGeometry(0.222, 20, 16);
  const swooshGeo = new THREE.SphereGeometry(0.115, 16, 14);
  const sideLockGeo = new THREE.ConeGeometry(0.052, 0.135, 10);
  const napeTuftGeo = new THREE.ConeGeometry(0.036, 0.105, 8);
  const bobBackGeo = new THREE.CylinderGeometry(0.21, 0.23, 0.22, 16);
  const bunGeo = new THREE.SphereGeometry(0.098, 14, 14);
  const curlPuffGeo = new THREE.SphereGeometry(0.082, 12, 12);
  disposables.push(
    hairCapGeo,
    backHairGeo,
    swooshGeo,
    sideLockGeo,
    napeTuftGeo,
    bobBackGeo,
    bunGeo,
    curlPuffGeo,
  );

  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.set(0, 0.175, -0.015);
  hairCap.rotation.x = -0.22;
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  const backHair = new THREE.Mesh(backHairGeo, hairMat);
  backHair.position.set(0, 0.16, -0.055);
  backHair.scale.set(1.02, 0.96, 0.88);
  backHair.castShadow = true;
  headGroup.add(backHair);

  // Signature Boy Side-Swept Swoop Hair ("short" default style)
  const shortBangs = new THREE.Group();

  // Main voluminous side-swept top wave arcing toward the right
  const topWave = new THREE.Mesh(swooshGeo, hairMat);
  topWave.position.set(0.035, 0.345, 0.075);
  topWave.scale.set(1.65, 0.72, 1.15);
  topWave.rotation.z = -0.26;
  topWave.castShadow = true;

  // Lighter chestnut highlight crest on top
  const topHighlight = new THREE.Mesh(swooshGeo, hairHighlightMat);
  topHighlight.position.set(-0.02, 0.375, 0.04);
  topHighlight.scale.set(1.25, 0.42, 0.95);
  topHighlight.rotation.z = -0.18;

  // Left-side part volume
  const leftCrown = new THREE.Mesh(swooshGeo, hairMat);
  leftCrown.position.set(-0.14, 0.305, 0.04);
  leftCrown.scale.set(0.95, 0.82, 1.0);
  leftCrown.rotation.z = 0.42;

  // Sweeping pointed fringe lock swooping right across the brow
  const frontSwooshTip = new THREE.Mesh(sideLockGeo, hairMat);
  frontSwooshTip.position.set(0.155, 0.275, 0.145);
  frontSwooshTip.rotation.z = 0.95;
  frontSwooshTip.rotation.x = 0.2;

  // Side framing tufts in front of / over the ears
  const leftSideLock = new THREE.Mesh(sideLockGeo, hairMat);
  leftSideLock.position.set(-0.195, 0.19, 0.05);
  leftSideLock.rotation.z = 2.85;
  const rightSideLock = new THREE.Mesh(sideLockGeo, hairMat);
  rightSideLock.position.set(0.195, 0.19, 0.05);
  rightSideLock.rotation.z = -2.85;

  // Cute spiky nape tufts sticking out at the lower back behind the ears
  [-0.17, -0.11, 0.11, 0.17].forEach((nx, i) => {
    const tuft = new THREE.Mesh(napeTuftGeo, hairMat);
    tuft.position.set(nx, 0.068 - (i % 2) * 0.015, -0.12);
    tuft.rotation.z = nx < 0 ? 2.45 : -2.45;
    tuft.rotation.x = -0.35;
    shortBangs.add(tuft);
  });

  shortBangs.add(
    topWave,
    topHighlight,
    leftCrown,
    frontSwooshTip,
    leftSideLock,
    rightSideLock,
  );
  headGroup.add(shortBangs);

  const bobBack = new THREE.Mesh(bobBackGeo, hairMat);
  bobBack.position.set(0, 0.095, -0.055);
  headGroup.add(bobBack);

  const bunMesh = new THREE.Mesh(bunGeo, hairMat);
  bunMesh.position.set(0, 0.395, -0.075);
  headGroup.add(bunMesh);

  const curlCluster = new THREE.Group();
  [
    [-0.155, 0.255, 0.02],
    [0.155, 0.255, 0.02],
    [-0.185, 0.145, -0.02],
    [0.185, 0.145, -0.02],
    [0, 0.33, -0.03],
    [-0.075, 0.3, 0.11],
    [0.075, 0.3, 0.11],
  ].forEach(([cx, cy, cz]) => {
    const puff = new THREE.Mesh(curlPuffGeo, hairMat);
    puff.position.set(cx, cy, cz);
    curlCluster.add(puff);
  });
  headGroup.add(curlCluster);

  // =========================================================================
  // CLEAR WRAP-AROUND SAFETY GOGGLES WITH DARK SLATE TOP BAR
  // =========================================================================
  const goggleGroup = new THREE.Group();
  const topBarGeo = new THREE.BoxGeometry(0.285, 0.024, 0.042);
  const visorLensGeo = new THREE.BoxGeometry(0.268, 0.092, 0.016);
  const bottomRimGeo = new THREE.BoxGeometry(0.268, 0.008, 0.018);
  const sideTempleGeo = new THREE.BoxGeometry(0.016, 0.022, 0.21);
  const sideShieldGeo = new THREE.BoxGeometry(0.012, 0.088, 0.055);
  disposables.push(
    topBarGeo,
    visorLensGeo,
    bottomRimGeo,
    sideTempleGeo,
    sideShieldGeo,
  );

  const topBar = new THREE.Mesh(topBarGeo, goggleFrameMat);
  topBar.position.set(0, 0.216, 0.214);

  const visorLens = new THREE.Mesh(visorLensGeo, goggleLensMat);
  visorLens.position.set(0, 0.168, 0.222);
  visorLens.renderOrder = 3;

  const bottomRim = new THREE.Mesh(bottomRimGeo, goggleRimMat);
  bottomRim.position.set(0, 0.122, 0.224);

  [-1, 1].forEach((side) => {
    const temple = new THREE.Mesh(sideTempleGeo, goggleFrameMat);
    temple.position.set(side * 0.142, 0.205, 0.112);
    const shield = new THREE.Mesh(sideShieldGeo, goggleLensMat);
    shield.position.set(side * 0.136, 0.168, 0.195);
    goggleGroup.add(temple, shield);
  });

  goggleGroup.add(topBar, visorLens, bottomRim);
  headGroup.add(goggleGroup);

  const applyProfile = (profile: StudentAvatarProfile) => {
    const coat = LAB_COAT_PRESETS[profile.labCoat];
    skinMat.color.set(profile.skinTone);
    hairMat.color.set(profile.hairColor);
    const highlightColor = new THREE.Color(profile.hairColor).offsetHSL(
      0.01,
      0.05,
      0.1,
    );
    hairHighlightMat.color.copy(highlightColor);
    coatMat.color.set(coat.coatHex);
    trimMat.color.set(coat.trimHex);
    goggleGroup.visible = profile.goggles;

    shortBangs.visible = profile.hairStyle === "short";
    bobBack.visible = profile.hairStyle === "bob";
    bunMesh.visible = profile.hairStyle === "bun";
    curlCluster.visible = profile.hairStyle === "curly";
  };

  applyProfile(initialProfile);

  let initializedPos = false;
  let walkCycle = 0;

  // Interactive Hand Action State Machine
  let activeAction: AvatarLabAction | null = null;
  let actionTimer = 0;
  let actionDuration = 1.2;

  const triggerAction = (action: AvatarLabAction, durationSec?: number) => {
    activeAction = action;
    actionDuration =
      durationSec ??
      (action === "celebrate"
        ? 1.9
        : action === "pour"
          ? 1.35
          : action === "wave"
            ? 1.5
            : 1.15);
    actionTimer = actionDuration;
  };

  const setPosition = (x: number, z: number, yaw?: number) => {
    group.position.set(x, 0, z);
    if (typeof yaw === "number") {
      group.rotation.y = yaw;
    }
    initializedPos = true;
  };

  const dampPose = (
    target: {
      lShX: number;
      lShZ: number;
      lElX: number;
      lWrX?: number;
      lWrZ?: number;
      rShX: number;
      rShZ: number;
      rElX: number;
      rWrZ: number;
      torsoLeanX: number;
      headPitchX: number;
      headYawY: number;
      headRollZ: number;
      bobY: number;
    },
    delta: number,
    speed = 11,
  ) => {
    leftArm.shoulderPivot.rotation.x = THREE.MathUtils.damp(
      leftArm.shoulderPivot.rotation.x,
      target.lShX,
      speed,
      delta,
    );
    leftArm.shoulderPivot.rotation.z = THREE.MathUtils.damp(
      leftArm.shoulderPivot.rotation.z,
      target.lShZ,
      speed,
      delta,
    );
    leftArm.elbowPivot.rotation.x = THREE.MathUtils.damp(
      leftArm.elbowPivot.rotation.x,
      target.lElX,
      speed,
      delta,
    );
    leftArm.wristGroup.rotation.x = THREE.MathUtils.damp(
      leftArm.wristGroup.rotation.x,
      target.lWrX ?? 0,
      speed,
      delta,
    );
    leftArm.wristGroup.rotation.z = THREE.MathUtils.damp(
      leftArm.wristGroup.rotation.z,
      target.lWrZ ?? 0,
      speed,
      delta,
    );

    rightArm.shoulderPivot.rotation.x = THREE.MathUtils.damp(
      rightArm.shoulderPivot.rotation.x,
      target.rShX,
      speed,
      delta,
    );
    rightArm.shoulderPivot.rotation.z = THREE.MathUtils.damp(
      rightArm.shoulderPivot.rotation.z,
      target.rShZ,
      speed,
      delta,
    );
    rightArm.elbowPivot.rotation.x = THREE.MathUtils.damp(
      rightArm.elbowPivot.rotation.x,
      target.rElX,
      speed,
      delta,
    );
    rightArm.wristGroup.rotation.z = THREE.MathUtils.damp(
      rightArm.wristGroup.rotation.z,
      target.rWrZ,
      speed,
      delta,
    );

    bodyGroup.rotation.x = THREE.MathUtils.damp(
      bodyGroup.rotation.x,
      target.torsoLeanX,
      speed,
      delta,
    );
    headGroup.rotation.x = THREE.MathUtils.damp(
      headGroup.rotation.x,
      target.headPitchX,
      speed,
      delta,
    );
    headGroup.rotation.y = THREE.MathUtils.damp(
      headGroup.rotation.y,
      target.headYawY,
      speed,
      delta,
    );
    headGroup.rotation.z = THREE.MathUtils.damp(
      headGroup.rotation.z,
      target.headRollZ,
      speed,
      delta,
    );
    bodyGroup.position.y = target.bobY;
  };

  const animateWalkStride = (delta: number, speedFactor: number, moveYaw: number) => {
    let diff = moveYaw - group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    group.rotation.y += diff * (1 - Math.exp(-12 * delta));

    walkCycle += delta * (9.5 + speedFactor * 4.5);
    const amp = 0.52 * Math.min(1.25, speedFactor);
    const swing = Math.sin(walkCycle) * amp;
    leftLegPivot.rotation.x = swing;
    rightLegPivot.rotation.x = -swing;

    pipetteGroup.visible = false;
    probeGroup.visible = false;
    sparkle1.visible = false;
    sparkle2.visible = false;

    dampPose(
      {
        // Left hand carries the glowing blue flask steadily while walking
        lShX: -0.55 - swing * 0.25,
        lShZ: -0.14,
        lElX: -0.78,
        lWrX: 1.25,
        lWrZ: 0.12,
        rShX: swing * 0.78,
        rShZ: 0.08,
        rElX: -0.25 - Math.max(0, swing) * 0.45,
        rWrZ: 0,
        torsoLeanX: 0.08 * speedFactor,
        headPitchX: 0,
        headYawY: 0,
        headRollZ: Math.sin(walkCycle * 0.5) * 0.04,
        bobY: Math.abs(Math.sin(walkCycle)) * 0.032,
      },
      delta,
      14,
    );
  };

  const animateStationOrAction = (
    delta: number,
    elapsed: number,
    speaking: boolean,
  ) => {
    leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, 0, 10, delta);
    rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, 0, 10, delta);

    // Subtle sparkle pulse above the blue flask
    const sparklePulse = 0.75 + Math.sin(elapsed * 5.2) * 0.3;
    sparkle1.scale.set(0.65 * sparklePulse, 1.35 * sparklePulse, 0.3);
    sparkle2.scale.set(0.85 * (1.5 - sparklePulse), 1.6 * (1.5 - sparklePulse), 0.35);
    sparkle1.rotation.y = elapsed * 2.2;
    sparkle2.rotation.y = -elapsed * 2.6;

    if (actionTimer > 0 && activeAction) {
      actionTimer = Math.max(0, actionTimer - delta);
      const t = 1 - actionTimer / Math.max(0.01, actionDuration);

      if (activeAction === "adjust") {
        pipetteGroup.visible = false;
        probeGroup.visible = true;
        sparkle1.visible = true;
        sparkle2.visible = true;
        const dialWiggle = Math.sin(t * Math.PI * 4) * 0.22;
        dampPose(
          {
            lShX: -1.15 + Math.sin(t * Math.PI * 2) * 0.1,
            lShZ: -0.35,
            lElX: -0.55,
            lWrX: 1.5,
            lWrZ: 0.22,
            rShX: -1.16 + Math.cos(t * Math.PI * 3) * 0.14,
            rShZ: -0.16,
            rElX: -0.45 + Math.sin(t * Math.PI * 4) * 0.15,
            rWrZ: dialWiggle,
            torsoLeanX: 0.14,
            headPitchX: 0.12,
            headYawY: Math.sin(t * Math.PI * 2) * 0.14,
            headRollZ: 0.04,
            bobY: 0.008 + Math.sin(t * Math.PI) * 0.012,
          },
          delta,
          15,
        );
        return;
      }

      if (activeAction === "pour") {
        // Tilting his glowing blue flask forward & dripping with pipette!
        pipetteGroup.visible = true;
        probeGroup.visible = false;
        sparkle1.visible = true;
        sparkle2.visible = true;
        const dip = Math.sin(t * Math.PI * 2.5) * 0.18;
        dampPose(
          {
            lShX: -1.35 + dip * 0.6,
            lShZ: 0.12,
            lElX: -0.42,
            lWrX: 0.95,
            lWrZ: -0.68,
            rShX: -1.32 + dip,
            rShZ: -0.16,
            rElX: -0.42 - dip * 0.5,
            rWrZ: 0.45 + Math.sin(t * Math.PI * 5) * 0.2,
            torsoLeanX: 0.18,
            headPitchX: 0.18,
            headYawY: -0.06,
            headRollZ: -0.05,
            bobY: 0.01,
          },
          delta,
          14,
        );
        return;
      }

      if (activeAction === "switch") {
        pipetteGroup.visible = false;
        probeGroup.visible = false;
        sparkle1.visible = true;
        sparkle2.visible = true;
        const press = Math.sin(t * Math.PI);
        dampPose(
          {
            lShX: -1.65,
            lShZ: -0.48,
            lElX: -0.25,
            lWrX: 1.75,
            lWrZ: 0.35,
            rShX: -1.38 * press - 0.42 * (1 - press),
            rShZ: -0.08,
            rElX: -0.25 * press - 0.85 * (1 - press),
            rWrZ: 0.18 * press,
            torsoLeanX: 0.14 * press,
            headPitchX: 0.1 * press,
            headYawY: 0.08 * press,
            headRollZ: 0,
            bobY: 0.015 * press,
          },
          delta,
          18,
        );
        return;
      }

      if (activeAction === "inspect") {
        // Raises the sparkling blue flask up beside his goggles to inspect!
        pipetteGroup.visible = false;
        probeGroup.visible = true;
        sparkle1.visible = true;
        sparkle2.visible = true;
        const fineTurn = Math.sin(t * Math.PI * 5) * 0.16;
        dampPose(
          {
            lShX: -2.05,
            lShZ: -0.52,
            lElX: -0.22,
            lWrX: 2.1,
            lWrZ: 0.42,
            rShX: -1.04,
            rShZ: -0.22,
            rElX: -0.78 + fineTurn * 0.5,
            rWrZ: fineTurn * 1.4,
            torsoLeanX: 0.18,
            headPitchX: 0.12,
            headYawY: -0.14 + Math.sin(t * Math.PI * 2) * 0.1,
            headRollZ: 0.07,
            bobY: 0.005,
          },
          delta,
          13,
        );
        return;
      }

      if (activeAction === "celebrate") {
        // Raises glowing blue flask high with sparkling stars & happy hop!
        pipetteGroup.visible = false;
        probeGroup.visible = false;
        sparkle1.visible = true;
        sparkle2.visible = true;
        const pump = Math.sin(t * Math.PI * 6);
        const hop = Math.abs(Math.sin(t * Math.PI * 3)) * 0.16;
        dampPose(
          {
            lShX: -2.55 + pump * 0.2,
            lShZ: -0.45,
            lElX: -0.22,
            lWrX: 2.5,
            lWrZ: 0.38,
            rShX: -2.5 - pump * 0.24,
            rShZ: 0.34,
            rElX: -0.35 - Math.max(0, -pump) * 0.3,
            rWrZ: 0,
            torsoLeanX: -0.06,
            headPitchX: -0.1,
            headYawY: Math.sin(t * Math.PI * 4) * 0.2,
            headRollZ: Math.sin(t * Math.PI * 4) * 0.09,
            bobY: hop,
          },
          delta,
          16,
        );
        return;
      }

      if (activeAction === "wave") {
        pipetteGroup.visible = false;
        probeGroup.visible = false;
        sparkle1.visible = true;
        sparkle2.visible = true;
        const wave = Math.sin(t * Math.PI * 7) * 0.35;
        dampPose(
          {
            lShX: -1.85,
            lShZ: -0.5,
            lElX: -0.2,
            lWrX: 1.9,
            lWrZ: 0.4,
            rShX: -2.4,
            rShZ: 0.38 + wave * 0.5,
            rElX: -0.55 + wave * 0.4,
            rWrZ: wave,
            torsoLeanX: 0,
            headPitchX: -0.04,
            headYawY: 0.16,
            headRollZ: 0.08,
            bobY: 0.015,
          },
          delta,
          15,
        );
        return;
      }
    } else {
      activeAction = null;
    }

    pipetteGroup.visible = false;
    probeGroup.visible = false;
    sparkle1.visible = true;
    sparkle2.visible = true;

    if (speaking) {
      // Gesturing enthusiastically while holding up the sparkling blue flask!
      dampPose(
        {
          lShX: -1.85 + Math.sin(elapsed * 3.2) * 0.14,
          lShZ: -0.52,
          lElX: -0.25 + Math.cos(elapsed * 3.2) * 0.1,
          lWrX: 1.95,
          lWrZ: 0.44,
          rShX: -0.82 + Math.cos(elapsed * 3.8) * 0.22,
          rShZ: 0.12,
          rElX: -0.86 + Math.sin(elapsed * 3.8) * 0.2,
          rWrZ: Math.sin(elapsed * 4.5) * 0.18,
          torsoLeanX: 0.04,
          headPitchX: -0.02,
          headYawY: Math.sin(elapsed * 2.1) * 0.18,
          headRollZ: Math.sin(elapsed * 3.0) * 0.06,
          bobY: Math.abs(Math.sin(elapsed * 3.8)) * 0.016,
        },
        delta,
        10,
      );
    } else {
      // Iconic Reference Pose: Left hand proudly holds up the sparkling blue flask,
      // right hand bent cheerfully in front of chest ready to work on the bench!
      const curiousCycle = Math.sin(elapsed * 1.45);
      dampPose(
        {
          lShX: -1.85 + Math.sin(elapsed * 1.8) * 0.07,
          lShZ: -0.54,
          lElX: -0.18 + Math.cos(elapsed * 1.8) * 0.05,
          lWrX: 1.9,
          lWrZ: 0.46,
          rShX: -0.45 + Math.cos(elapsed * 1.6) * 0.08,
          rShZ: 0.14,
          rElX: -1.18 + Math.sin(elapsed * 1.9) * 0.08,
          rWrZ: -0.22 + Math.sin(elapsed * 2.2) * 0.08,
          torsoLeanX: 0.02 + curiousCycle * 0.02,
          headPitchX: 0.02 + Math.sin(elapsed * 1.2) * 0.035,
          headYawY: Math.sin(elapsed * 1.05) * 0.14,
          headRollZ: Math.sin(elapsed * 0.9) * 0.03,
          bobY: Math.sin(elapsed * 2.4) * 0.011,
        },
        delta,
        8,
      );
    }
  };

  const update = (
    delta: number,
    elapsed: number,
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    visible: boolean,
    control?: AvatarControlInput,
  ) => {
    group.visible = visible;
    if (!visible) return;

    if (!initializedPos) {
      group.position.set(targetPosition.x, 0, targetPosition.z);
      initializedPos = true;
    }

    const jumpY = Math.max(0, control?.jumpHeight ?? 0);
    const inAir = jumpY > 0.03;
    leftLegPivot.position.y = 0.45 + jumpY;
    rightLegPivot.position.y = 0.45 + jumpY;
    const shadowScale = Math.max(0.55, 1 - jumpY * 0.45);
    shadowDisc.scale.set(shadowScale, shadowScale, 1);
    shadowMat.opacity = Math.max(0.08, 0.24 - jumpY * 0.14);

    if (control?.manualMode) {
      const speedSq = control.moveX * control.moveX + control.moveZ * control.moveZ;
      if (speedSq > 0.0001) {
        const moveYaw = Math.atan2(control.moveX, control.moveZ);
        animateWalkStride(delta, control.sprinting ? 1.25 : 0.95, moveYaw);
      } else {
        if (actionTimer > 0) {
          _dir.subVectors(targetLookAt, group.position);
          _dir.y = 0;
          if (_dir.lengthSq() > 0.001) {
            const faceYaw = Math.atan2(_dir.x, _dir.z);
            let diff = faceYaw - group.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            group.rotation.y += diff * (1 - Math.exp(-9 * delta));
          }
        }
        animateStationOrAction(delta, elapsed, Boolean(control.speaking));
      }
      if (inAir) {
        leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, 0.36, 14, delta);
        rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, -0.28, 14, delta);
        leftArm.shoulderPivot.rotation.x = THREE.MathUtils.damp(
          leftArm.shoulderPivot.rotation.x,
          -2.1,
          14,
          delta,
        );
        rightArm.shoulderPivot.rotation.x = THREE.MathUtils.damp(
          rightArm.shoulderPivot.rotation.x,
          -1.2,
          14,
          delta,
        );
      }
      bodyGroup.position.y += jumpY;
      return;
    }

    _targetPos.set(targetPosition.x, 0, targetPosition.z);
    _dir.subVectors(_targetPos, group.position);
    const dist = _dir.length();

    if (dist > 0.04) {
      const step = Math.min(dist, 3.4 * delta);
      _dir.normalize();
      group.position.addScaledVector(_dir, step);
      animateWalkStride(delta, 0.95, Math.atan2(_dir.x, _dir.z));
    } else {
      _dir.subVectors(targetLookAt, group.position);
      _dir.y = 0;
      if (_dir.lengthSq() > 0.001) {
        const faceYaw = Math.atan2(_dir.x, _dir.z);
        let diff = faceYaw - group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * (1 - Math.exp(-8 * delta));
      }
      animateStationOrAction(delta, elapsed, Boolean(control?.speaking));
    }
    bodyGroup.position.y += jumpY;
  };

  return {
    group,
    applyProfile,
    getPosition: () => group.position,
    setPosition,
    triggerAction,
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
