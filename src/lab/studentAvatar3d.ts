import * as THREE from "three";
import {
  LAB_COAT_PRESETS,
  type StudentAvatarProfile,
} from "../context/StudentAvatarContext";

export interface AvatarControlInput {
  manualMode: boolean;
  moveX: number;
  moveZ: number;
  sprinting?: boolean;
  speaking?: boolean;
}

export interface StudentAvatar3DController {
  group: THREE.Group;
  applyProfile: (profile: StudentAvatarProfile) => void;
  getPosition: () => THREE.Vector3;
  setPosition: (x: number, z: number, yaw?: number) => void;
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

  // Shared PBR Materials dynamically recolored via applyProfile()
  const skinMat = new THREE.MeshStandardMaterial({
    color: initialProfile.skinTone,
    roughness: 0.72,
    metalness: 0.02,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: LAB_COAT_PRESETS[initialProfile.labCoat].coatHex,
    roughness: 0.68,
    metalness: 0.04,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: LAB_COAT_PRESETS[initialProfile.labCoat].trimHex,
    roughness: 0.52,
    metalness: 0.1,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: initialProfile.hairColor,
    roughness: 0.82,
    metalness: 0.03,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: 0x3b4456,
    roughness: 0.85,
    metalness: 0.02,
  });
  const sneakerSoleMat = new THREE.MeshStandardMaterial({
    color: 0xf7f5f2,
    roughness: 0.55,
    metalness: 0.04,
  });
  const backpackMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.78,
    metalness: 0.04,
  });
  const goggleFrameMat = new THREE.MeshStandardMaterial({
    color: 0x42335c,
    roughness: 0.35,
    metalness: 0.45,
  });
  const goggleLensMat = new THREE.MeshStandardMaterial({
    color: 0xe6e0f0,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.52,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x1a1310,
    roughness: 0.2,
    metalness: 0.1,
  });
  const glintMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const cheekMat = new THREE.MeshStandardMaterial({
    color: 0xf08c84,
    roughness: 0.85,
    transparent: true,
    opacity: 0.45,
  });
  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x7c3e32,
    roughness: 0.6,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x231b16,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  disposables.push(
    skinMat,
    coatMat,
    trimMat,
    hairMat,
    shortsMat,
    sneakerSoleMat,
    backpackMat,
    goggleFrameMat,
    goggleLensMat,
    eyeMat,
    glintMat,
    cheekMat,
    mouthMat,
    shadowMat,
  );

  // Contact shadow disc grounded flush at y = 0.012
  const shadowGeo = new THREE.CircleGeometry(0.24, 28);
  disposables.push(shadowGeo);
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.012;
  group.add(shadowDisc);

  // Kid Legs + Socks + Two-tone Sneakers (hip pivot y = 0.44)
  const shortsLegGeo = new THREE.CylinderGeometry(0.064, 0.056, 0.18, 12);
  const calfGeo = new THREE.CylinderGeometry(0.044, 0.038, 0.18, 12);
  const shoeUpperGeo = new THREE.BoxGeometry(0.105, 0.055, 0.175);
  const shoeSoleGeo = new THREE.BoxGeometry(0.114, 0.028, 0.19);
  const shoeToeGeo = new THREE.SphereGeometry(0.052, 10, 8);
  disposables.push(shortsLegGeo, calfGeo, shoeUpperGeo, shoeSoleGeo, shoeToeGeo);

  const buildKidLeg = (sideX: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sideX, 0.44, 0);

    const shortsLeg = new THREE.Mesh(shortsLegGeo, shortsMat);
    shortsLeg.position.y = -0.09;
    shortsLeg.castShadow = true;

    const calf = new THREE.Mesh(calfGeo, skinMat);
    calf.position.y = -0.26;
    calf.castShadow = true;

    const shoeUpper = new THREE.Mesh(shoeUpperGeo, trimMat);
    shoeUpper.position.set(0, -0.385, 0.03);
    shoeUpper.castShadow = true;

    const shoeSole = new THREE.Mesh(shoeSoleGeo, sneakerSoleMat);
    shoeSole.position.set(0, -0.422, 0.032);
    shoeSole.castShadow = true;

    const shoeToe = new THREE.Mesh(shoeToeGeo, sneakerSoleMat);
    shoeToe.scale.set(1.0, 0.65, 1.0);
    shoeToe.position.set(0, -0.398, 0.102);

    pivot.add(shortsLeg, calf, shoeUpper, shoeSole, shoeToe);
    return pivot;
  };

  const leftLegPivot = buildKidLeg(-0.085);
  const rightLegPivot = buildKidLeg(0.085);
  group.add(leftLegPivot, rightLegPivot);

  // Upper Body Assembly (kid torso ~0.42..0.92, breathing/bounce bob)
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const torsoGeo = new THREE.CylinderGeometry(0.155, 0.185, 0.36, 16);
  const skirtGeo = new THREE.CylinderGeometry(0.185, 0.215, 0.15, 16);
  const collarGeo = new THREE.BoxGeometry(0.13, 0.13, 0.04);
  const badgeGeo = new THREE.BoxGeometry(0.072, 0.042, 0.015);
  disposables.push(torsoGeo, skirtGeo, collarGeo, badgeGeo);

  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.position.y = 0.66;
  torso.scale.set(1.0, 1.0, 0.78);
  torso.castShadow = true;
  bodyGroup.add(torso);

  const coatSkirt = new THREE.Mesh(skirtGeo, coatMat);
  coatSkirt.position.y = 0.43;
  coatSkirt.scale.set(1.0, 1.0, 0.8);
  coatSkirt.castShadow = true;
  bodyGroup.add(coatSkirt);

  const collarStripe = new THREE.Mesh(collarGeo, trimMat);
  collarStripe.position.set(0, 0.77, 0.132);
  bodyGroup.add(collarStripe);

  const chestBadge = new THREE.Mesh(badgeGeo, trimMat);
  chestBadge.position.set(0.082, 0.71, 0.145);
  bodyGroup.add(chestBadge);

  // School Science Backpack (back of kid coat)
  const packBodyGeo = new THREE.BoxGeometry(0.24, 0.26, 0.12);
  const packFlapGeo = new THREE.BoxGeometry(0.245, 0.08, 0.13);
  const packPocketGeo = new THREE.BoxGeometry(0.16, 0.11, 0.04);
  const strapGeo = new THREE.BoxGeometry(0.045, 0.28, 0.19);
  disposables.push(packBodyGeo, packFlapGeo, packPocketGeo, strapGeo);

  const packBody = new THREE.Mesh(packBodyGeo, backpackMat);
  packBody.position.set(0, 0.65, -0.175);
  packBody.castShadow = true;
  const packFlap = new THREE.Mesh(packFlapGeo, trimMat);
  packFlap.position.set(0, 0.76, -0.175);
  const packPocket = new THREE.Mesh(packPocketGeo, trimMat);
  packPocket.position.set(0, 0.59, -0.24);
  const leftStrap = new THREE.Mesh(strapGeo, backpackMat);
  leftStrap.position.set(-0.11, 0.69, -0.02);
  const rightStrap = new THREE.Mesh(strapGeo, backpackMat);
  rightStrap.position.set(0.11, 0.69, -0.02);
  bodyGroup.add(packBody, packFlap, packPocket, leftStrap, rightStrap);

  // Articulated Kid Arms (shoulder pivot y = 0.80)
  const sleeveGeo = new THREE.CylinderGeometry(0.052, 0.045, 0.28, 12);
  const handGeo = new THREE.SphereGeometry(0.046, 12, 12);
  disposables.push(sleeveGeo, handGeo);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.205, 0.8, 0);
  const leftSleeve = new THREE.Mesh(sleeveGeo, coatMat);
  leftSleeve.position.y = -0.14;
  leftSleeve.castShadow = true;
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.y = -0.3;
  leftArmPivot.add(leftSleeve, leftHand);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.205, 0.8, 0);
  const rightSleeve = new THREE.Mesh(sleeveGeo, coatMat);
  rightSleeve.position.y = -0.14;
  rightSleeve.castShadow = true;
  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.y = -0.3;
  rightArmPivot.add(rightSleeve, rightHand);
  bodyGroup.add(rightArmPivot);

  // Neck & Stylized Expressive Kid Head (big friendly proportions)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.9, 0);
  bodyGroup.add(headGroup);

  const neckGeo = new THREE.CylinderGeometry(0.05, 0.058, 0.08, 12);
  const headGeo = new THREE.SphereGeometry(0.195, 24, 22);
  const earGeo = new THREE.SphereGeometry(0.036, 10, 10);
  const eyeGeo = new THREE.SphereGeometry(0.024, 12, 12);
  const glintGeo = new THREE.SphereGeometry(0.0085, 8, 8);
  const noseGeo = new THREE.SphereGeometry(0.021, 10, 10);
  const cheekGeo = new THREE.SphereGeometry(0.032, 10, 10);
  const smileGeo = new THREE.TorusGeometry(0.038, 0.007, 8, 16, Math.PI);
  disposables.push(
    neckGeo,
    headGeo,
    earGeo,
    eyeGeo,
    glintGeo,
    noseGeo,
    cheekGeo,
    smileGeo,
  );

  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = -0.02;
  headGroup.add(neck);

  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.14;
  headMesh.scale.set(1.04, 0.98, 0.98);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(-0.195, 0.13, 0);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(0.195, 0.13, 0);
  headGroup.add(leftEar, rightEar);

  // Big Sparkling Kid Eyes
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.068, 0.145, 0.175);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.068, 0.145, 0.175);
  const leftGlint = new THREE.Mesh(glintGeo, glintMat);
  leftGlint.position.set(-0.061, 0.154, 0.196);
  const rightGlint = new THREE.Mesh(glintGeo, glintMat);
  rightGlint.position.set(0.075, 0.154, 0.196);
  headGroup.add(leftEye, rightEye, leftGlint, rightGlint);

  // Button Nose, Rosy Cheeks, Cheerful Kid Smile
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.position.set(0, 0.115, 0.194);
  const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
  leftCheek.scale.set(1.2, 0.85, 0.5);
  leftCheek.position.set(-0.11, 0.095, 0.158);
  const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
  rightCheek.scale.set(1.2, 0.85, 0.5);
  rightCheek.position.set(0.11, 0.095, 0.158);
  const smileMesh = new THREE.Mesh(smileGeo, mouthMat);
  smileMesh.position.set(0, 0.088, 0.176);
  smileMesh.rotation.z = Math.PI;
  headGroup.add(noseMesh, leftCheek, rightCheek, smileMesh);

  // Kid Hair Styles (fitted cleanly around 0.195 kid head)
  const hairCapGeo = new THREE.SphereGeometry(
    0.205,
    20,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.56,
  );
  const bangTuftGeo = new THREE.SphereGeometry(0.058, 12, 10);
  const bobBackGeo = new THREE.CylinderGeometry(0.195, 0.215, 0.2, 16);
  const bunGeo = new THREE.SphereGeometry(0.092, 14, 14);
  const curlPuffGeo = new THREE.SphereGeometry(0.078, 12, 12);
  disposables.push(hairCapGeo, bangTuftGeo, bobBackGeo, bunGeo, curlPuffGeo);

  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.set(0, 0.155, -0.01);
  hairCap.rotation.x = -0.18;
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  // Playful front kid bangs for "short" hairstyle
  const shortBangs = new THREE.Group();
  [
    [-0.07, 0.265, 0.135, 0.9, 0.7],
    [0.0, 0.275, 0.145, 1.0, 0.75],
    [0.075, 0.26, 0.13, 0.9, 0.7],
  ].forEach(([bx, by, bz, sx, sy]) => {
    const tuft = new THREE.Mesh(bangTuftGeo, hairMat);
    tuft.position.set(bx, by, bz);
    tuft.scale.set(sx, sy, 0.8);
    shortBangs.add(tuft);
  });
  headGroup.add(shortBangs);

  const bobBack = new THREE.Mesh(bobBackGeo, hairMat);
  bobBack.position.set(0, 0.08, -0.055);
  headGroup.add(bobBack);

  const bunMesh = new THREE.Mesh(bunGeo, hairMat);
  bunMesh.position.set(0, 0.365, -0.075);
  headGroup.add(bunMesh);

  const curlCluster = new THREE.Group();
  [
    [-0.145, 0.24, 0.02],
    [0.145, 0.24, 0.02],
    [-0.175, 0.13, -0.02],
    [0.175, 0.13, -0.02],
    [0, 0.31, -0.03],
    [-0.07, 0.28, 0.11],
    [0.07, 0.28, 0.11],
  ].forEach(([cx, cy, cz]) => {
    const puff = new THREE.Mesh(curlPuffGeo, hairMat);
    puff.position.set(cx, cy, cz);
    curlCluster.add(puff);
  });
  headGroup.add(curlCluster);

  // Cute Oversized Kid Safety Goggles
  const goggleGroup = new THREE.Group();
  const lensGeo = new THREE.BoxGeometry(0.105, 0.068, 0.024);
  const bridgeGeo = new THREE.BoxGeometry(0.036, 0.018, 0.022);
  const goggleStrapGeo = new THREE.TorusGeometry(0.2, 0.012, 8, 28);
  disposables.push(lensGeo, bridgeGeo, goggleStrapGeo);

  const leftLens = new THREE.Mesh(lensGeo, goggleLensMat);
  leftLens.position.set(-0.068, 0.148, 0.194);
  const rightLens = new THREE.Mesh(lensGeo, goggleLensMat);
  rightLens.position.set(0.068, 0.148, 0.194);
  const bridge = new THREE.Mesh(bridgeGeo, goggleFrameMat);
  bridge.position.set(0, 0.152, 0.195);
  const strap = new THREE.Mesh(goggleStrapGeo, goggleFrameMat);
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, 0.15, -0.005);

  goggleGroup.add(leftLens, rightLens, bridge, strap);
  headGroup.add(goggleGroup);

  const applyProfile = (profile: StudentAvatarProfile) => {
    const coat = LAB_COAT_PRESETS[profile.labCoat];
    skinMat.color.set(profile.skinTone);
    hairMat.color.set(profile.hairColor);
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

  const setPosition = (x: number, z: number, yaw?: number) => {
    group.position.set(x, 0, z);
    if (typeof yaw === "number") {
      group.rotation.y = yaw;
    }
    initializedPos = true;
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
    leftArmPivot.rotation.x = -swing * 0.78;
    rightArmPivot.rotation.x = swing * 0.78;
    bodyGroup.position.y = Math.abs(Math.sin(walkCycle)) * 0.032;
    headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, 0, 10, delta);
    headGroup.rotation.z = Math.sin(walkCycle * 0.5) * 0.04;
  };

  const animateIdleOrSpeak = (
    delta: number,
    elapsed: number,
    speaking: boolean,
  ) => {
    leftLegPivot.rotation.x = THREE.MathUtils.damp(
      leftLegPivot.rotation.x,
      0,
      10,
      delta,
    );
    rightLegPivot.rotation.x = THREE.MathUtils.damp(
      rightLegPivot.rotation.x,
      0,
      10,
      delta,
    );
    if (speaking) {
      leftArmPivot.rotation.x = THREE.MathUtils.damp(
        leftArmPivot.rotation.x,
        -0.42 + Math.sin(elapsed * 4.5) * 0.16,
        10,
        delta,
      );
      rightArmPivot.rotation.x = THREE.MathUtils.damp(
        rightArmPivot.rotation.x,
        -0.55 + Math.cos(elapsed * 4.2) * 0.18,
        10,
        delta,
      );
      bodyGroup.position.y = Math.abs(Math.sin(elapsed * 3.8)) * 0.018;
      headGroup.rotation.y = Math.sin(elapsed * 2.2) * 0.18;
      headGroup.rotation.z = Math.sin(elapsed * 3.1) * 0.06;
    } else {
      leftArmPivot.rotation.x = THREE.MathUtils.damp(
        leftArmPivot.rotation.x,
        -0.14 + Math.sin(elapsed * 2.0) * 0.04,
        8,
        delta,
      );
      rightArmPivot.rotation.x = THREE.MathUtils.damp(
        rightArmPivot.rotation.x,
        -0.2 + Math.cos(elapsed * 2.0) * 0.05,
        8,
        delta,
      );
      bodyGroup.position.y = Math.sin(elapsed * 2.6) * 0.012;
      headGroup.rotation.y = Math.sin(elapsed * 1.1) * 0.15;
      headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, 0, 8, delta);
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

    if (control?.manualMode) {
      const speedSq = control.moveX * control.moveX + control.moveZ * control.moveZ;
      if (speedSq > 0.0001) {
        const moveYaw = Math.atan2(control.moveX, control.moveZ);
        animateWalkStride(delta, control.sprinting ? 1.25 : 0.95, moveYaw);
      } else {
        animateIdleOrSpeak(delta, elapsed, Boolean(control.speaking));
      }
      return;
    }

    _targetPos.set(targetPosition.x, 0, targetPosition.z);
    _dir.subVectors(_targetPos, group.position);
    const dist = _dir.length();

    if (dist > 0.04) {
      // Smoothly walk toward the selected bench or floor click target
      const step = Math.min(dist, 3.4 * delta);
      _dir.normalize();
      group.position.addScaledVector(_dir, step);
      animateWalkStride(delta, 0.95, Math.atan2(_dir.x, _dir.z));
    } else {
      // Stand beside bench & face the apparatus
      _dir.subVectors(targetLookAt, group.position);
      _dir.y = 0;
      if (_dir.lengthSq() > 0.001) {
        const faceYaw = Math.atan2(_dir.x, _dir.z);
        let diff = faceYaw - group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * (1 - Math.exp(-8 * delta));
      }
      animateIdleOrSpeak(delta, elapsed, Boolean(control?.speaking));
    }
  };

  return {
    group,
    applyProfile,
    getPosition: () => group.position,
    setPosition,
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
