import { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Tag,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type {
  GeneratedScene3DSpec,
  Sim3DObjectSpec,
  Sim3DReadoutSpec,
} from "../../types/simulation3d";

interface DynamicConcept3DViewerProps {
  spec: GeneratedScene3DSpec;
}

interface AnimatedPart {
  spec: Sim3DObjectSpec;
  root: THREE.Group;
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  baseScale: THREE.Vector3;
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  particles?: THREE.Mesh[];
  waveNodes?: THREE.Mesh[];
  orbitSatellite?: THREE.Mesh;
}

function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padX = 28;
    ctx.font = "600 32px Inter, system-ui, sans-serif";
    const measured = Math.min(440, Math.max(150, ctx.measureText(text).width + padX * 2));
    const x = (canvas.width - measured) / 2;
    const y = 20;
    const h = 68;
    const r = 18;

    ctx.fillStyle = "rgba(250, 248, 245, 0.94)";
    ctx.strokeStyle = "rgba(35, 27, 22, 0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + measured - r, y);
    ctx.quadraticCurveTo(x + measured, y, x + measured, y + r);
    ctx.lineTo(x + measured, y + h - r);
    ctx.quadraticCurveTo(x + measured, y + h, x + measured - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#231B16";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, y + h / 2 + 1, measured - 24);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.55, 0.34, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function buildPartGeometry(
  spec: Sim3DObjectSpec,
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
): {
  root: THREE.Group;
  particles?: THREE.Mesh[];
  waveNodes?: THREE.Mesh[];
  orbitSatellite?: THREE.Mesh;
} {
  const root = new THREE.Group();
  root.name = spec.name;

  const [sx, sy, sz] = spec.scale;

  if (spec.shape === "box") {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.castShadow = spec.opacity > 0.7;
    mesh.receiveShadow = true;
    root.add(mesh);
  } else if (spec.shape === "sphere") {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 22), material);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = spec.opacity > 0.7;
    mesh.receiveShadow = true;
    root.add(mesh);
  } else if (spec.shape === "cylinder") {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 28),
      material,
    );
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = spec.opacity > 0.7;
    mesh.receiveShadow = true;
    root.add(mesh);
  } else if (spec.shape === "cone") {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 26), material);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = spec.opacity > 0.7;
    mesh.receiveShadow = true;
    root.add(mesh);
  } else if (spec.shape === "torus") {
    const radius = Math.max(0.18, sx * 0.5);
    const tube = Math.max(0.04, Math.min(0.24, sy * 0.18));
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 16, 40),
      material,
    );
    mesh.castShadow = true;
    root.add(mesh);
  } else if (spec.shape === "ring") {
    const outer = Math.max(0.22, sx * 0.5);
    const inner = Math.max(0.12, outer * 0.78);
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 40),
      material,
    );
    mesh.material.side = THREE.DoubleSide;
    root.add(mesh);
  } else if (spec.shape === "arrow") {
    const len = Math.max(0.45, sx);
    const radius = Math.max(0.025, Math.min(0.09, sy * 0.14));
    const shaftLen = len * 0.72;
    const headLen = len * 0.28;

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, shaftLen, 14),
      material,
    );
    shaft.rotation.z = -Math.PI / 2;
    shaft.position.x = -headLen * 0.5;

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 2.4, headLen, 16),
      material,
    );
    head.rotation.z = -Math.PI / 2;
    head.position.x = shaftLen * 0.5;

    root.add(shaft, head);
  } else if (spec.shape === "beam") {
    const len = Math.max(0.6, sx);
    const thickness = Math.max(0.028, Math.min(0.12, sy * 0.16));
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(thickness * 0.55, thickness * 0.55, len, 14),
      material,
    );
    core.rotation.z = -Math.PI / 2;

    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.color),
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(
      new THREE.CylinderGeometry(thickness * 1.45, thickness * 1.45, len, 14),
      glowMat,
    );
    halo.rotation.z = -Math.PI / 2;

    root.add(core, halo);
  } else if (spec.shape === "helix") {
    const pts: THREE.Vector3[] = [];
    const turns = 4.5;
    const height = Math.max(0.7, sy);
    const radius = Math.max(0.14, sx * 0.42);
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2 * turns;
      pts.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          (t - 0.5) * height,
          Math.sin(angle) * radius,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 80, 0.032, 10, false);
    const mesh = new THREE.Mesh(tubeGeo, material);
    mesh.castShadow = true;
    root.add(mesh);
  } else if (spec.shape === "wave") {
    const waveNodes: THREE.Mesh[] = [];
    const span = Math.max(1.2, sx);
    const count = 26;
    const beadGeo = new THREE.SphereGeometry(0.048, 12, 10);
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const bead = new THREE.Mesh(beadGeo, material);
      bead.position.set((u - 0.5) * span, 0, 0);
      root.add(bead);
      waveNodes.push(bead);
    }
    return { root, waveNodes };
  } else if (spec.shape === "particles") {
    const particles: THREE.Mesh[] = [];
    const span = Math.max(1.2, sx);
    const count = 14;
    const pGeo = new THREE.SphereGeometry(
      Math.max(0.035, Math.min(0.08, sy * 0.14)),
      12,
      10,
    );
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(pGeo, material);
      const u = i / count;
      p.position.set(
        (u - 0.5) * span,
        ((i % 3) - 1) * 0.08,
        (((i + 1) % 3) - 1) * 0.08,
      );
      root.add(p);
      particles.push(p);
    }
    return { root, particles };
  } else if (spec.shape === "orbit") {
    const radius = Math.max(0.35, spec.orbitRadius || sx * 0.5);
    const trackMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.color),
      transparent: true,
      opacity: 0.35,
    });
    const track = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 10, 56),
      trackMat,
    );
    track.rotation.x = Math.PI / 2;

    const sat = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.06, Math.min(0.15, sy * 0.2)), 18, 14),
      material,
    );
    sat.position.set(radius, 0, 0);
    root.add(track, sat);
    return { root, orbitSatellite: sat };
  }

  return { root };
}

function evaluateReadout(
  readout: Sim3DReadoutSpec,
  values: number[],
): number {
  const a = values[readout.paramA] ?? 0;
  const b = readout.paramB >= 0 ? (values[readout.paramB] ?? 1) : 1;
  const s = readout.scale || 1;
  const off = readout.offset || 0;

  switch (readout.formulaType) {
    case "ratio": {
      const denom = Math.abs(b) < 1e-4 ? 1e-4 : b;
      return (a / denom) * s + off;
    }
    case "product":
      return a * b * s + off;
    case "sum":
      return (a + b) * s + off;
    case "snell_deg": {
      const n = Math.max(1.0, b);
      const sinI = Math.sin((a * Math.PI) / 180);
      const sinR = Math.max(-1, Math.min(1, sinI / n));
      return (Math.asin(sinR) * 180) / Math.PI;
    }
    case "inverse": {
      const denom = Math.abs(a) < 1e-4 ? 1e-4 : a;
      return (s / denom) + off;
    }
    case "pendulum_t": {
      const len = Math.max(0.05, a);
      const g = readout.paramB >= 0 ? Math.max(1, b) : 9.81;
      return 2 * Math.PI * Math.sqrt(len / g);
    }
    case "direct":
    default:
      return a * s + off;
  }
}

export function DynamicConcept3DViewer({ spec }: DynamicConcept3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [paramValues, setParamValues] = useState<number[]>(() =>
    spec.parameters.map((p) => p.defaultValue),
  );
  const [playing, setPlaying] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const paramValuesRef = useRef(paramValues);
  const playingRef = useRef(playing);
  const showLabelsRef = useRef(showLabels);

  const orbitStateRef = useRef({
    theta: 0.48,
    phi: 1.12,
    radius: spec.cameraDistance || 6.2,
    targetY: 1.05,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Reset slider values & camera distance whenever a new 3D spec is generated
  useEffect(() => {
    const defaults = spec.parameters.map((p) => p.defaultValue);
    setParamValues(defaults);
    paramValuesRef.current = defaults;
    setPlaying(true);
    orbitStateRef.current.theta = 0.48;
    orbitStateRef.current.phi = 1.12;
    orbitStateRef.current.radius = spec.cameraDistance || 6.2;
  }, [spec]);

  useEffect(() => {
    paramValuesRef.current = paramValues;
  }, [paramValues]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    showLabelsRef.current = showLabels;
  }, [showLabels]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 400;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(spec.backgroundHex || "#EEF2F7");
    scene.background = bgColor;
    scene.fog = new THREE.Fog(bgColor, 11, 24);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 60);

    // Studio three-point lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc8beb3, 0.9);
    hemi.position.set(0, 6, 0);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.5);
    keyLight.position.set(4.5, 7.2, 5.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 22;
    const sd = 5.2;
    keyLight.shadow.camera.left = -sd;
    keyLight.shadow.camera.right = sd;
    keyLight.shadow.camera.top = sd;
    keyLight.shadow.camera.bottom = -sd;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdfe6f5, 0.65);
    rimLight.position.set(-4.5, 4.0, -4.0);
    scene.add(rimLight);

    // Warm Laboratory Workbench Stage Pedestal
    const stageGroup = new THREE.Group();
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0xf7f4ef,
      roughness: 0.72,
      metalness: 0.04,
    });
    const benchTop = new THREE.Mesh(
      new THREE.CylinderGeometry(4.3, 4.45, 0.16, 64),
      benchMat,
    );
    benchTop.position.y = -0.08;
    benchTop.receiveShadow = true;
    stageGroup.add(benchTop);

    const rimTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd8cfc4,
      roughness: 0.5,
      metalness: 0.18,
    });
    const benchRim = new THREE.Mesh(
      new THREE.TorusGeometry(4.32, 0.032, 12, 64),
      rimTrimMat,
    );
    benchRim.rotation.x = Math.PI / 2;
    benchRim.position.y = 0.0;
    stageGroup.add(benchRim);

    const grid = new THREE.PolarGridHelper(4.15, 12, 5, 64, 0xc7bfb5, 0xe4ddd4);
    grid.position.y = 0.004;
    stageGroup.add(grid);
    scene.add(stageGroup);

    // Build all dynamic objects from Gemini's 3D spec
    const parts: AnimatedPart[] = [];
    const labelSprites: THREE.Sprite[] = [];
    const deg2rad = Math.PI / 180;

    for (const objSpec of spec.objects) {
      const isGlass = objSpec.opacity < 0.88;
      const isGlow =
        objSpec.shape === "beam" ||
        objSpec.shape === "particles" ||
        objSpec.shape === "wave";
      const baseColor = new THREE.Color(objSpec.color);

      const material = isGlass
        ? new THREE.MeshPhysicalMaterial({
            color: baseColor,
            transparent: true,
            opacity: objSpec.opacity,
            roughness: Math.min(0.25, objSpec.roughness),
            metalness: objSpec.metalness * 0.3,
            transmission: 0.25,
            thickness: 0.35,
            depthWrite: false,
          })
        : new THREE.MeshStandardMaterial({
            color: baseColor,
            metalness: objSpec.metalness,
            roughness: objSpec.roughness,
            emissive: isGlow ? baseColor : new THREE.Color(0x000000),
            emissiveIntensity: isGlow ? 0.35 : 0.0,
          });

      const built = buildPartGeometry(objSpec, material);
      const basePos = new THREE.Vector3(...objSpec.position);
      const baseRot = new THREE.Euler(
        objSpec.rotation[0] * deg2rad,
        objSpec.rotation[1] * deg2rad,
        objSpec.rotation[2] * deg2rad,
      );

      built.root.position.copy(basePos);
      built.root.rotation.copy(baseRot);

      if (objSpec.label) {
        const sprite = createLabelSprite(objSpec.label);
        const yLift = Math.max(0.32, objSpec.scale[1] * 0.55 + 0.24);
        sprite.position.set(0, yLift, 0);
        built.root.add(sprite);
        labelSprites.push(sprite);
      }

      scene.add(built.root);
      parts.push({
        spec: objSpec,
        root: built.root,
        basePos,
        baseRot,
        baseScale: new THREE.Vector3(1, 1, 1),
        material,
        particles: built.particles,
        waveNodes: built.waveNodes,
        orbitSatellite: built.orbitSatellite,
      });
    }

    // Pointer orbit + wheel zoom handlers
    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";

    const onPointerDown = (e: PointerEvent) => {
      orbitStateRef.current.dragging = true;
      orbitStateRef.current.lastX = e.clientX;
      orbitStateRef.current.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!orbitStateRef.current.dragging) return;
      const dx = e.clientX - orbitStateRef.current.lastX;
      const dy = e.clientY - orbitStateRef.current.lastY;
      orbitStateRef.current.lastX = e.clientX;
      orbitStateRef.current.lastY = e.clientY;
      orbitStateRef.current.theta -= dx * 0.008;
      orbitStateRef.current.phi = THREE.MathUtils.clamp(
        orbitStateRef.current.phi - dy * 0.007,
        0.24,
        1.48,
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      orbitStateRef.current.dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitStateRef.current.radius = THREE.MathUtils.clamp(
        orbitStateRef.current.radius + e.deltaY * 0.004,
        2.8,
        12.5,
      );
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mount);

    let rafId = 0;
    let simTime = 0;
    let lastNow = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      if (playingRef.current) {
        simTime += dt;
      }

      // Sync label visibility
      const labelsVis = showLabelsRef.current;
      for (const s of labelSprites) {
        s.visible = labelsVis;
      }

      // Update each part with animation + bound slider parameters
      const vals = paramValuesRef.current;
      for (const part of parts) {
        const s = part.spec;
        let normParam = 0.5;
        let centeredParam = 0;

        if (s.paramIndex >= 0 && s.paramIndex < spec.parameters.length) {
          const pDef = spec.parameters[s.paramIndex];
          const val = vals[s.paramIndex] ?? pDef.defaultValue;
          const range = pDef.max - pDef.min || 1;
          normParam = THREE.MathUtils.clamp((val - pDef.min) / range, 0, 1);
          centeredParam = (normParam - 0.5) * 2; // -1 to +1
        }

        // Start from base transforms
        let px = part.basePos.x;
        let py = part.basePos.y;
        let pz = part.basePos.z;
        let rx = part.baseRot.x;
        let ry = part.baseRot.y;
        let rz = part.baseRot.z;
        let scX = 1;
        let scY = 1;
        let scZ = 1;
        let speedMult = 1;
        let ampMult = 1;

        if (s.paramIndex >= 0 && s.paramProperty !== "none") {
          const f = s.paramFactor || 1;
          switch (s.paramProperty) {
            case "scale_y":
              scY = Math.max(0.18, 0.35 + normParam * 1.3 * Math.abs(f));
              break;
            case "scale_all": {
              const sc = Math.max(0.25, 0.45 + normParam * 1.1 * Math.abs(f));
              scX = sc;
              scY = sc;
              scZ = sc;
              break;
            }
            case "move_x":
              px += centeredParam * 0.9 * f;
              break;
            case "move_y":
              py = Math.max(0.05, py + centeredParam * 0.75 * f);
              break;
            case "rotate_z":
              rz += centeredParam * 0.85 * f;
              break;
            case "rotate_y":
              ry += centeredParam * 1.1 * f;
              break;
            case "bend_angle":
              rz += centeredParam * 0.55 * f;
              break;
            case "speed":
              speedMult = Math.max(0.15, 0.25 + normParam * 2.2 * Math.abs(f));
              break;
            case "amplitude":
              ampMult = Math.max(0.15, 0.2 + normParam * 1.8 * Math.abs(f));
              break;
            case "emissive":
              part.material.emissive.set(s.color);
              part.material.emissiveIntensity = Math.max(
                0,
                normParam * 1.35 * Math.abs(f),
              );
              break;
          }
        }

        const speed = s.animSpeed * speedMult;
        const amp = s.animAmplitude * ampMult;
        const t = simTime * speed;

        switch (s.animation) {
          case "spin_y":
            ry += t;
            break;
          case "spin_x":
            rx += t;
            break;
          case "bob":
            py += Math.sin(t * 2.0) * amp;
            break;
          case "oscillate_x":
            px += Math.sin(t * 2.2) * amp;
            break;
          case "oscillate_y":
            py += Math.sin(t * 2.2) * amp;
            break;
          case "swing":
            rz += Math.sin(t * 2.2) * Math.min(0.75, amp + 0.15);
            break;
          case "pulse": {
            const p = 1 + Math.sin(t * 3.0) * Math.min(0.28, amp * 0.5 + 0.08);
            scX *= p;
            scY *= p;
            scZ *= p;
            break;
          }
          case "orbit": {
            const r = s.orbitRadius || 0.9;
            if (part.orbitSatellite) {
              part.orbitSatellite.position.set(
                Math.cos(t) * r,
                0,
                Math.sin(t) * r,
              );
            } else {
              px = part.basePos.x + Math.cos(t) * r;
              pz = part.basePos.z + Math.sin(t) * r;
            }
            break;
          }
          case "flow":
          case "wave":
          case "none":
          default:
            break;
        }

        // Shape-specific live procedural updates
        if (part.particles && part.particles.length > 0) {
          const span = Math.max(1.2, s.scale[0]);
          part.particles.forEach((p, idx) => {
            const u = ((idx / part.particles!.length) + simTime * 0.32 * speedMult) % 1;
            p.position.x = (u - 0.5) * span;
            p.position.y =
              Math.sin(u * Math.PI * 2 + simTime * 2) * (0.06 * ampMult);
          });
        }

        if (part.waveNodes && part.waveNodes.length > 0) {
          const span = Math.max(1.2, s.scale[0]);
          const waveAmp = Math.max(0.14, s.animAmplitude * ampMult);
          part.waveNodes.forEach((bead, idx) => {
            const u = idx / (part.waveNodes!.length - 1);
            bead.position.x = (u - 0.5) * span;
            bead.position.y =
              Math.sin(u * Math.PI * 4 - simTime * 3.2 * speedMult) * waveAmp;
          });
        }

        if (part.orbitSatellite && s.animation !== "orbit") {
          const r = s.orbitRadius || Math.max(0.35, s.scale[0] * 0.5);
          part.orbitSatellite.position.set(
            Math.cos(simTime * (speed || 1.2)) * r,
            0,
            Math.sin(simTime * (speed || 1.2)) * r,
          );
        }

        part.root.position.set(px, py, pz);
        part.root.rotation.set(rx, ry, rz);
        part.root.scale.set(scX, scY, scZ);
      }

      // Position spherical orbit camera
      const orb = orbitStateRef.current;
      camera.position.set(
        orb.radius * Math.sin(orb.phi) * Math.sin(orb.theta),
        orb.targetY + orb.radius * Math.cos(orb.phi),
        orb.radius * Math.sin(orb.phi) * Math.cos(orb.theta),
      );
      camera.lookAt(0, orb.targetY, 0);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      envTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        } else if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [spec]);

  const computedReadouts = useMemo(
    () =>
      spec.readouts.map((r) => ({
        label: r.label,
        unit: r.unit,
        value: evaluateReadout(r, paramValues),
      })),
    [spec.readouts, paramValues],
  );

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden flex flex-col"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            3D Simulation · {spec.title}
          </p>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {spec.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            title={playing ? "Pause simulation" : "Play simulation"}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-white px-2.5 h-8 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{playing ? "Pause" : "Play"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLabels((s) => !s)}
            title="Toggle 3D callout labels"
            className={[
              "inline-flex items-center gap-1 rounded-lg border px-2.5 h-8 text-xs font-medium cursor-pointer transition-colors",
              showLabels
                ? "border-[#2F4368] bg-[#2F4368] text-white"
                : "border-[var(--border-hairline)] bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            ].join(" ")}
          >
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Labels</span>
          </button>

          <button
            type="button"
            onClick={() => {
              orbitStateRef.current.radius = Math.max(
                2.8,
                orbitStateRef.current.radius - 0.9,
              );
            }}
            aria-label="Zoom in"
            title="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-white text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              orbitStateRef.current.radius = Math.min(
                12.5,
                orbitStateRef.current.radius + 0.9,
              );
            }}
            aria-label="Zoom out"
            title="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-white text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              orbitStateRef.current.theta = 0.48;
              orbitStateRef.current.phi = 1.12;
              orbitStateRef.current.radius = spec.cameraDistance || 6.2;
              setParamValues(spec.parameters.map((p) => p.defaultValue));
            }}
            aria-label="Reset 3D view and parameters"
            title="Reset view & sliders"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-white text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen 3D view"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-white text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive WebGL 3D Canvas */}
      <div className="relative w-full flex-1 min-h-[360px] sm:min-h-[420px]">
        <div
          ref={canvasMountRef}
          className="h-[360px] sm:h-[420px] w-full cursor-grab active:cursor-grabbing"
          style={isFullscreen ? { height: "calc(100vh - 180px)" } : undefined}
        />
        <div className="pointer-events-none absolute bottom-2.5 left-3 rounded-lg bg-[#FAF8F5]/85 backdrop-blur-sm border border-[#231B16]/10 px-2.5 py-1 text-[11px] text-[#5C5149]">
          Drag to orbit 360° · Scroll to zoom · Adjust sliders below
        </div>
      </div>

      {/* Live Sliders & Computed Scientific Readouts */}
      <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3.5 space-y-3">
        {spec.parameters.length > 0 ? (
          <div
            className={[
              "grid gap-4",
              spec.parameters.length === 1
                ? "grid-cols-1"
                : spec.parameters.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-3",
            ].join(" ")}
          >
            {spec.parameters.map((param, idx) => {
              const current = paramValues[idx] ?? param.defaultValue;
              return (
                <label key={param.id} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {param.label}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--accent-mocha)] shrink-0">
                      {Number.isInteger(param.step)
                        ? Math.round(current)
                        : current.toFixed(2)}{" "}
                      {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={current}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setParamValues((prev) => {
                        const next = [...prev];
                        next[idx] = v;
                        return next;
                      });
                    }}
                    className="w-full accent-[#6F4E37] cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        {computedReadouts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-hairline)]">
            {computedReadouts.map((ro) => (
              <div
                key={ro.label}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-hairline)] bg-white px-3 py-1.5 text-xs"
              >
                <span className="text-[var(--text-muted)]">{ro.label}:</span>
                <span className="font-mono font-semibold tabular-nums text-[#2F4368]">
                  {Number.isFinite(ro.value) ? ro.value.toFixed(2) : "—"}
                  {ro.unit ? ` ${ro.unit}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
