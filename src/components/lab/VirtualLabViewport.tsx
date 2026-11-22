import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { StereoEffect } from "three/addons/effects/StereoEffect.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Eye,
  Footprints,
  Glasses,
  LayoutGrid,
  Loader2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Square,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useStudentAvatar } from "../../context/StudentAvatarContext";
import { labAudio } from "../../lab/audio";
import {
  buildSpokenExplanationScript,
  LAB_LANGUAGE_OPTIONS,
} from "../../lab/explainability";
import { labVoiceNarrator, useVoiceNarrator } from "../../lab/voiceNarrator";
import { createLabMaterials } from "../../lab/materials";
import {
  buildProgressSnapshot,
  calculateBoylesPressure,
  calculateOpticsDeviation,
  calculatePhotosynthesisRate,
  calculateProjectileRange,
  calculateTitrationPh,
  calculateWaveHarmonic,
  evaluateDnaMatches,
  evaluateQuests,
  getComplementaryBase,
  INITIAL_EXPERIMENT_STATE,
  LAB_QUESTS,
} from "../../lab/quests";
import { BENCH_POSES, buildLabRoom } from "../../lab/roomGeometry";
import { buildExperimentStations } from "../../lab/stations";
import {
  buildStudentAvatar3D,
  type StudentAvatar3DController,
} from "../../lab/studentAvatar3d";
import type {
  DnaBase,
  LabExperimentState,
  LabViewMode,
  MicroscopeSpecimen,
  StationId,
} from "../../lab/types";
import type { TutorLanguage } from "../../types/navigation";
import { StudentAvatarSvg } from "../avatar/StudentAvatarSvg";

interface VirtualLabViewportProps {
  initialStation?: StationId;
  completedQuests?: Record<StationId, boolean>;
  onQuestsChange?: (completed: Record<StationId, boolean>) => void;
  onExitLab: () => void;
}

const STATION_ORDER: readonly StationId[] = [
  "pendulum",
  "optics",
  "titration",
  "circuit",
  "electrolysis",
  "photosynthesis",
  "microscope",
  "projectile",
  "boyles",
  "wave",
  "dna",
  "trig",
];

const STATION_SHORT_LABEL: Record<StationId, string> = {
  pendulum: "Pendulum",
  optics: "Ray Optics",
  titration: "Titration",
  circuit: "Ohm's Circuit",
  electrolysis: "Electrolysis",
  photosynthesis: "Photosynthesis",
  microscope: "Microscope",
  projectile: "Projectile",
  boyles: "Boyle's Law",
  wave: "Sound Wave",
  dna: "DNA Helix",
  trig: "Unit Circle",
};

const EMPTY_COMPLETED: Record<StationId, boolean> = {
  pendulum: false,
  optics: false,
  titration: false,
  circuit: false,
  electrolysis: false,
  photosynthesis: false,
  microscope: false,
  projectile: false,
  boyles: false,
  wave: false,
  dna: false,
  trig: false,
};

const _walkForward = new THREE.Vector3();
const _walkRight = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _followCamPos = new THREE.Vector3();
const _followLookTarget = new THREE.Vector3();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _floorHit = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();
const _yAxis = new THREE.Vector3(0, 1, 0);

const AVATAR_BENCH_SPOTS: Record<StationId, THREE.Vector3> = (
  Object.keys(BENCH_POSES) as StationId[]
).reduce(
  (acc, id) => {
    const pose = BENCH_POSES[id];
    const offset = new THREE.Vector3(-0.98, 0, 0.92).applyAxisAngle(
      _yAxis,
      pose.rotationY,
    );
    acc[id] = pose.position.clone().add(offset);
    return acc;
  },
  {} as Record<StationId, THREE.Vector3>,
);

export function VirtualLabViewport({
  initialStation = "pendulum",
  completedQuests: externalCompleted,
  onQuestsChange,
  onExitLab,
}: VirtualLabViewportProps) {
  const { avatar, updateAvatar, setCustomizerOpen } = useStudentAvatar();
  const viewportRootRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const studentAvatar3dRef = useRef<StudentAvatar3DController | null>(null);
  const avatarProfileRef = useRef(avatar);

  const voice = useVoiceNarrator();
  const [activeStation, setActiveStation] = useState<StationId>(initialStation);
  const [viewMode, setViewMode] = useState<LabViewMode>("orbit");
  const [vrStereo, setVrStereo] = useState(false);
  const [arBackdropActive, setArBackdropActive] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [stationMenuOpen, setStationMenuOpen] = useState(false);
  const [questPopoverOpen, setQuestPopoverOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const [xrSupport, setXrSupport] = useState<{ vr: boolean; ar: boolean }>({
    vr: false,
    ar: false,
  });

  const [experimentState, setExperimentState] = useState<LabExperimentState>(
    INITIAL_EXPERIMENT_STATE,
  );
  const [completedQuests, setCompletedQuests] = useState<
    Record<StationId, boolean>
  >(() => externalCompleted ?? { ...EMPTY_COMPLETED });
  const [questBanner, setQuestBanner] = useState<string | null>(null);

  const activeStationRef = useRef<StationId>(activeStation);
  const viewModeRef = useRef<LabViewMode>(viewMode);
  const vrStereoRef = useRef(vrStereo);
  const voiceStatusRef = useRef(voice.status);
  const avatarManualRef = useRef(false);
  const floorWalkTargetRef = useRef<THREE.Vector3 | null>(null);
  const floorWalkDestVec = useRef(new THREE.Vector3());
  const experimentStateRef = useRef<LabExperimentState>(experimentState);
  const completedQuestsRef = useRef(completedQuests);
  const keysPressedRef = useRef<Record<string, boolean>>({});
  const walkPadRef = useRef({ forward: 0, strafe: 0, turn: 0 });

  const cameraTransitionRef = useRef<{
    active: boolean;
    targetPos: THREE.Vector3;
    targetLook: THREE.Vector3;
  }>({
    active: false,
    targetPos: BENCH_POSES[initialStation].cameraPosition.clone(),
    targetLook: BENCH_POSES[initialStation].cameraTarget.clone(),
  });

  const xrControllerRef = useRef<{
    startXr: (mode: "immersive-vr" | "immersive-ar") => Promise<void>;
    endXr: () => Promise<void>;
    setArIsolation: (enabled: boolean, station: StationId) => void;
    setTransparentBackground: (transparent: boolean) => void;
    focusStation: (station: StationId) => void;
    enterWalkMode: (station: StationId, mode: "walk" | "kid-control" | "vr-preview") => void;
    exitToOrbit: (station: StationId) => void;
    zoomBy: (dir: -1 | 1) => void;
    triggerActiveAction: () => void;
  } | null>(null);

  useEffect(() => {
    activeStationRef.current = activeStation;
  }, [activeStation]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    vrStereoRef.current = vrStereo;
  }, [vrStereo]);

  useEffect(() => {
    voiceStatusRef.current = voice.status;
  }, [voice.status]);

  useEffect(() => {
    experimentStateRef.current = experimentState;
  }, [experimentState]);

  useEffect(() => {
    completedQuestsRef.current = completedQuests;
  }, [completedQuests]);

  useEffect(() => {
    avatarProfileRef.current = avatar;
    studentAvatar3dRef.current?.applyProfile(avatar);
  }, [avatar]);

  useEffect(() => {
    return () => {
      labVoiceNarrator.stop();
    };
  }, []);

  const speakStation = useCallback((stationOverride?: StationId) => {
    labAudio.muted = false;
    setIsMuted(false);
    const target = stationOverride ?? activeStationRef.current;
    const lang = avatarProfileRef.current.language;
    const script = buildSpokenExplanationScript(
      target,
      experimentStateRef.current,
      avatarProfileRef.current.name,
      lang,
    );
    void labVoiceNarrator.speak(`vp:${target}:${lang}`, script, {
      language: lang,
    });
  }, []);

  const speakStationRef = useRef(speakStation);
  useEffect(() => {
    speakStationRef.current = speakStation;
  }, [speakStation]);

  // Pre-warm natural voice PCM in the background when focusing a station or changing language
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const script = buildSpokenExplanationScript(
        activeStation,
        experimentStateRef.current,
        avatar.name,
        avatar.language,
      );
      labVoiceNarrator.prefetch(script, { language: avatar.language });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeStation, avatar.name, avatar.language]);

  useEffect(() => {
    const { completed, newlyCompleted } = evaluateQuests(
      experimentState,
      completedQuestsRef.current,
    );
    if (newlyCompleted.length > 0) {
      completedQuestsRef.current = completed;
      setCompletedQuests(completed);
      onQuestsChange?.(completed);
      labAudio.playQuestComplete();
      const firstQuest = LAB_QUESTS[newlyCompleted[0]];
      setQuestBanner(
        `Quest Completed: ${firstQuest.title} (+${firstQuest.xpReward} XP · ${firstQuest.badgeTitle})`,
      );
    }
  }, [experimentState, onQuestsChange]);

  useEffect(() => {
    if (!questBanner) return;
    const timer = window.setTimeout(() => setQuestBanner(null), 4500);
    return () => window.clearTimeout(timer);
  }, [questBanner]);

  useEffect(() => {
    if (!statusNotice) return;
    const timer = window.setTimeout(() => setStatusNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [statusNotice]);

  useEffect(() => {
    const xr = (
      navigator as unknown as {
        xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
      }
    ).xr;
    if (!xr?.isSessionSupported) return;

    Promise.all([
      xr.isSessionSupported("immersive-vr").catch(() => false),
      xr.isSessionSupported("immersive-ar").catch(() => false),
    ]).then(([vr, ar]) => {
      setXrSupport({ vr: Boolean(vr), ar: Boolean(ar) });
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (
        (viewModeRef.current === "walk" ||
          viewModeRef.current === "kid-control" ||
          viewModeRef.current === "vr-preview" ||
          viewModeRef.current === "orbit") &&
        (e.code === "ArrowUp" ||
          e.code === "ArrowDown" ||
          e.code === "ArrowLeft" ||
          e.code === "ArrowRight" ||
          e.code === "Space")
      ) {
        e.preventDefault();
      }
      keysPressedRef.current[e.code] = true;
      if (e.code === "Escape") {
        setStationMenuOpen(false);
        setQuestPopoverOpen(false);
      }
      if (e.code === "KeyH") {
        setStationMenuOpen(false);
        setDockCollapsed((prev) => !prev);
      }
      if (e.code === "KeyE" || e.code === "KeyV") {
        speakStationRef.current();
      }
      if (e.code === "Space" && viewModeRef.current === "vr-preview") {
        xrControllerRef.current?.triggerActiveAction();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };
    const onWindowBlur = () => {
      keysPressedRef.current = {};
      walkPadRef.current = { forward: 0, strafe: 0, turn: 0 };
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  const stopCameraFeed = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) return true;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.setClearColor(0xfaf8f5, 1);

    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    const scene = new THREE.Scene();
    const ivoryBg = new THREE.Color(0xfaf8f5);
    scene.background = ivoryBg;
    scene.fog = new THREE.Fog(0xfaf8f5, 11, 24);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = roomEnvTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.08, 45);
    const initialPose = BENCH_POSES[activeStationRef.current];
    camera.position.copy(initialPose.cameraPosition);

    const xrRig = new THREE.Group();
    xrRig.name = "XRPlayerRig";
    scene.add(xrRig);

    const hemiLight = new THREE.HemisphereLight(0xf3eff9, 0x8a7566, 0.85);
    hemiLight.position.set(0, 4, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e2, 1.45);
    keyLight.position.set(4.0, 5.8, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 22;
    const d = 8.0;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe6e0f0, 0.65);
    rimLight.position.set(-4, 3.4, -3.5);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const materials = createLabMaterials(isSoftwareGl, maxAnisotropy);
    const room = buildLabRoom(materials, maxAnisotropy);
    const stations = buildExperimentStations(room.benchGroups, materials);
    const studentAvatar3d = buildStudentAvatar3D(avatarProfileRef.current);
    studentAvatar3d.group.position.copy(
      AVATAR_BENCH_SPOTS[activeStationRef.current],
    );
    studentAvatar3dRef.current = studentAvatar3d;
    scene.add(room.roomEnvelope);
    scene.add(room.benchesRoot);
    scene.add(studentAvatar3d.group);

    const interactiveProxies: THREE.Mesh[] = [...room.hitProxies];

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Subtle AR calibration floor ring & Kid Floor-Click Target Marker
    const arFloorGrid = new THREE.PolarGridHelper(1.4, 8, 4, 48, 0x6f4e37, 0xd8d3cc);
    arFloorGrid.position.copy(BENCH_POSES[activeStationRef.current].position);
    arFloorGrid.position.y = 0.008;
    arFloorGrid.visible = false;
    scene.add(arFloorGrid);

    const floorMarkerGeo = new THREE.RingGeometry(0.16, 0.23, 28);
    const floorMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x6f4e37,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const floorMarker = new THREE.Mesh(floorMarkerGeo, floorMarkerMat);
    floorMarker.rotation.x = -Math.PI / 2;
    floorMarker.position.y = 0.015;
    floorMarker.visible = false;
    scene.add(floorMarker);

    const clampAvatarToLabFloor = (pos: THREE.Vector3) => {
      pos.x = THREE.MathUtils.clamp(pos.x, -6.95, 6.95);
      pos.z = THREE.MathUtils.clamp(pos.z, -6.95, 6.95);
      for (const id of STATION_ORDER) {
        const bp = BENCH_POSES[id].position;
        const dx = pos.x - bp.x;
        const dz = pos.z - bp.z;
        const distSq = dx * dx + dz * dz;
        const minR = 0.94;
        if (distSq < minR * minR && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          pos.x = bp.x + (dx / dist) * minR;
          pos.z = bp.z + (dz / dist) * minR;
        }
      }
      pos.x = THREE.MathUtils.clamp(pos.x, -6.95, 6.95);
      pos.z = THREE.MathUtils.clamp(pos.z, -6.95, 6.95);
    };

    const syncNearestStationFromAvatar = (pos: THREE.Vector3) => {
      let nearest: StationId | null = null;
      let bestDistSq = 1.85 * 1.85;
      for (const id of STATION_ORDER) {
        const bp = BENCH_POSES[id].position;
        const dx = pos.x - bp.x;
        const dz = pos.z - bp.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          nearest = id;
        }
      }
      if (nearest && nearest !== activeStationRef.current) {
        activeStationRef.current = nearest;
        setActiveStation(nearest);
        arFloorGrid.position.set(
          BENCH_POSES[nearest].position.x,
          0.008,
          BENCH_POSES[nearest].position.z,
        );
      }
    };

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 0.7;
    controls.maxDistance = 10.5;
    controls.target.copy(initialPose.cameraTarget);
    controls.update();

    const stereoEffect = new StereoEffect(renderer);
    stereoEffect.setEyeSeparation(0.064);
    stereoEffect.setSize(width, height);

    controls.addEventListener("start", () => {
      cameraTransitionRef.current.active = false;
    });

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let isDraggingLook = false;
    let activeWalkPointerId: number | null = null;
    let downX = 0;
    let downY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let walkYaw = 0;
    let walkPitch = -0.18;
    let kidFollowDist = 2.45;
    const walkPos = new THREE.Vector3(0, 1.65, 3.2);

    const isFreeLookMode = (mode: LabViewMode) =>
      mode === "walk" || mode === "kid-control" || mode === "vr-preview";

    const zoomBy = (dir: -1 | 1) => {
      const mode = viewModeRef.current;
      if (mode === "orbit" || mode === "ar-camera") {
        cameraTransitionRef.current.active = false;
        const offset = _camForward.subVectors(camera.position, controls.target);
        const currentDist = offset.length() || 1.5;
        const factor = dir < 0 ? 0.8 : 1.25;
        const nextDist = THREE.MathUtils.clamp(
          currentDist * factor,
          controls.minDistance,
          controls.maxDistance,
        );
        offset.normalize().multiplyScalar(nextDist);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      } else if (mode === "kid-control") {
        kidFollowDist = THREE.MathUtils.clamp(
          kidFollowDist + dir * 0.45,
          1.15,
          7.5,
        );
      } else if (mode === "walk" || mode === "vr-preview") {
        camera.fov = THREE.MathUtils.clamp(camera.fov + dir * 6, 34, 84);
        camera.updateProjectionMatrix();
      }
    };

    const alignPoseToStation = (
      station: StationId,
      targetMode: "walk" | "kid-control" | "vr-preview",
    ) => {
      const pose = BENCH_POSES[station];
      if (targetMode === "kid-control") {
        const avatarPos = studentAvatar3d.getPosition();
        const dx = pose.cameraTarget.x - avatarPos.x;
        const dz = pose.cameraTarget.z - avatarPos.z;
        walkYaw = Math.atan2(-dx, -dz);
        walkPitch = -0.26;
        camera.fov = 58;
        camera.updateProjectionMatrix();
        camera.rotation.order = "XYZ";
        camera.rotation.z = 0;
      } else {
        walkPos.set(
          THREE.MathUtils.clamp(pose.cameraPosition.x, -7.1, 7.1),
          targetMode === "vr-preview" ? 1.62 : 1.65,
          THREE.MathUtils.clamp(pose.cameraPosition.z, -7.1, 7.1),
        );
        const dx = pose.cameraTarget.x - walkPos.x;
        const dy = pose.cameraTarget.y - walkPos.y;
        const dz = pose.cameraTarget.z - walkPos.z;
        const horiz = Math.hypot(dx, dz) || 1;
        walkYaw = Math.atan2(-dx, -dz);
        walkPitch = THREE.MathUtils.clamp(Math.atan2(dy, horiz), -0.75, 0.55);
        camera.fov = targetMode === "vr-preview" ? 76 : 58;
        camera.updateProjectionMatrix();
        camera.position.copy(walkPos);
        camera.rotation.order = "YXZ";
        camera.rotation.y = walkYaw;
        camera.rotation.x = walkPitch;
        camera.rotation.z = 0;
      }
    };

    const focusStation = (station: StationId) => {
      const pose = BENCH_POSES[station];
      arFloorGrid.position.set(pose.position.x, 0.008, pose.position.z);
      if (viewModeRef.current === "ar-camera" || viewModeRef.current === "ar-xr") {
        STATION_ORDER.forEach((id) => {
          room.benchGroups[id].visible = id === station;
        });
      }
      avatarManualRef.current = false;
      floorWalkTargetRef.current = null;
      floorMarker.visible = false;
      const mode = viewModeRef.current;
      if (mode === "walk" || mode === "kid-control" || mode === "vr-preview") {
        alignPoseToStation(station, mode);
      } else {
        cameraTransitionRef.current.targetPos.copy(pose.cameraPosition);
        cameraTransitionRef.current.targetLook.copy(pose.cameraTarget);
        cameraTransitionRef.current.active = true;
      }
    };

    const triggerStationQuickAction = (station: StationId) => {
      if (station === "pendulum") {
        labAudio.playClick(560);
        setExperimentState((prev) => ({
          ...prev,
          pendulum: { ...prev.pendulum, running: !prev.pendulum.running },
        }));
      } else if (station === "optics") {
        labAudio.playClick(600);
        setExperimentState((prev) => {
          const nextAngle =
            prev.optics.prismAngleDeg >= 72
              ? 20
              : prev.optics.prismAngleDeg + 4;
          return {
            ...prev,
            optics: {
              ...prev.optics,
              beamOn: true,
              prismAngleDeg: nextAngle,
              deviationDeg: calculateOpticsDeviation(
                nextAngle,
                prev.optics.refractiveIndex,
              ),
            },
          };
        });
      } else if (station === "titration") {
        labAudio.playDrop();
        setExperimentState((prev) => {
          const nextBase = Math.min(50, Number((prev.titration.baseAddedMl + 1).toFixed(1)));
          return {
            ...prev,
            titration: {
              ...prev.titration,
              baseAddedMl: nextBase,
              currentPh: calculateTitrationPh(nextBase),
              dropPulse: prev.titration.dropPulse + 1,
            },
          };
        });
      } else if (station === "circuit") {
        labAudio.playClick(680);
        setExperimentState((prev) => {
          const nextClosed = !prev.circuit.switchClosed;
          return {
            ...prev,
            circuit: {
              ...prev.circuit,
              switchClosed: nextClosed,
              currentA: nextClosed
                ? prev.circuit.voltageV / prev.circuit.resistanceOhm
                : 0,
            },
          };
        });
      } else if (station === "electrolysis") {
        labAudio.playClick(600);
        setExperimentState((prev) => ({
          ...prev,
          electrolysis: {
            ...prev.electrolysis,
            powerOn: !prev.electrolysis.powerOn,
          },
        }));
      } else if (station === "photosynthesis") {
        labAudio.playClick(600);
        setExperimentState((prev) => {
          const nextOn = !prev.photosynthesis.lampOn;
          return {
            ...prev,
            photosynthesis: {
              ...prev.photosynthesis,
              lampOn: nextOn,
              bubblesPerMin: calculatePhotosynthesisRate(
                nextOn,
                prev.photosynthesis.lightIntensityPct,
                prev.photosynthesis.co2LevelGl,
              ),
            },
          };
        });
      } else if (station === "microscope") {
        labAudio.playClick(540);
        setExperimentState((prev) => {
          const nextMag: 4 | 10 | 40 =
            prev.microscope.magnification === 4
              ? 10
              : prev.microscope.magnification === 10
                ? 40
                : 4;
          return {
            ...prev,
            microscope: { ...prev.microscope, magnification: nextMag },
          };
        });
      } else if (station === "projectile") {
        labAudio.playClick(720);
        setExperimentState((prev) => ({
          ...prev,
          projectile: {
            ...prev.projectile,
            launchPulse: prev.projectile.launchPulse + 1,
          },
        }));
      } else if (station === "boyles") {
        labAudio.playClick(580);
        setExperimentState((prev) => {
          const nextVol =
            prev.boyles.volumeMl <= 15 ? 45 : prev.boyles.volumeMl - 5;
          return {
            ...prev,
            boyles: {
              volumeMl: nextVol,
              pressureKpa: calculateBoylesPressure(nextVol),
            },
          };
        });
      } else if (station === "wave") {
        labAudio.playClick(610);
        setExperimentState((prev) => ({
          ...prev,
          wave: { ...prev.wave, running: !prev.wave.running },
        }));
      } else if (station === "dna") {
        labAudio.playClick(630);
        setExperimentState((prev) => ({
          ...prev,
          dna: { ...prev.dna, rotating: !prev.dna.rotating },
        }));
      } else if (station === "trig") {
        labAudio.playClick(600);
        setExperimentState((prev) => ({
          ...prev,
          trig: { ...prev.trig, sweeping: !prev.trig.sweeping },
        }));
      }
    };

    const setPointerNdcFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      if (viewModeRef.current === "vr-preview" && vrStereoRef.current) {
        const halfW = rect.width * 0.5 || 1;
        const eyeX = localX >= halfW ? localX - halfW : localX;
        pointerNdc.x = (eyeX / halfW) * 2 - 1;
      } else {
        pointerNdc.x = (localX / (rect.width || 1)) * 2 - 1;
      }
      pointerNdc.y = -(localY / (rect.height || 1)) * 2 + 1;
    };

    const findVisibleStationHit = () => {
      const hits = raycaster.intersectObjects(interactiveProxies, false);
      return hits.find((h) => h.object.parent?.visible !== false);
    };

    const selectStationFromRay = (clientX: number, clientY: number): boolean => {
      setPointerNdcFromClient(clientX, clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hit = findVisibleStationHit();
      if (hit) {
        const hitStation = hit.object.userData.stationId as
          | StationId
          | undefined;
        if (hitStation) {
          if (hitStation === activeStationRef.current) {
            triggerStationQuickAction(hitStation);
          } else {
            labAudio.playClick(580);
            setActiveStation(hitStation);
            focusStation(hitStation);
          }
          return true;
        }
      }
      return false;
    };

    const tryFloorClickWalk = (clientX: number, clientY: number) => {
      if (viewModeRef.current !== "kid-control") {
        return;
      }
      setPointerNdcFromClient(clientX, clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      if (raycaster.ray.intersectPlane(_floorPlane, _floorHit)) {
        if (Math.abs(_floorHit.x) <= 7.0 && Math.abs(_floorHit.z) <= 7.0) {
          clampAvatarToLabFloor(_floorHit);
          floorWalkDestVec.current.copy(_floorHit);
          floorWalkTargetRef.current = floorWalkDestVec.current;
          avatarManualRef.current = false;
          floorMarker.position.set(_floorHit.x, 0.015, _floorHit.z);
          floorMarker.visible = true;
          labAudio.playClick(460);
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (isFreeLookMode(viewModeRef.current)) {
        isDraggingLook = true;
        activeWalkPointerId = e.pointerId;
        canvas.style.cursor = "grabbing";
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // Ignore pointer capture errors
        }
      }
    };

    let lastHoverCheck = 0;
    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      if (isDraggingLook && isFreeLookMode(viewModeRef.current)) {
        walkYaw -= dx * 0.0055;
        walkPitch = THREE.MathUtils.clamp(
          walkPitch - dy * 0.0045,
          -0.85,
          viewModeRef.current === "kid-control" ? 0.25 : 0.65,
        );
      } else {
        const now = performance.now();
        if (now - lastHoverCheck > 80) {
          lastHoverCheck = now;
          setPointerNdcFromClient(e.clientX, e.clientY);
          raycaster.setFromCamera(pointerNdc, camera);
          const hit = findVisibleStationHit();
          canvas.style.cursor = hit ? "pointer" : "grab";
        }
      }
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDraggingWalk = isDraggingLook;
      isDraggingLook = false;
      if (activeWalkPointerId !== null) {
        try {
          if (canvas.hasPointerCapture(activeWalkPointerId)) {
            canvas.releasePointerCapture(activeWalkPointerId);
          }
        } catch {
          // Ignore
        }
        activeWalkPointerId = null;
      }
      if (wasDraggingWalk && isFreeLookMode(viewModeRef.current)) {
        canvas.style.cursor = "grab";
      }
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist < 8) {
        const hitStation = selectStationFromRay(e.clientX, e.clientY);
        if (!hitStation) {
          tryFloorClickWalk(e.clientX, e.clientY);
        }
      }
    };

    const onPointerCancel = () => {
      isDraggingLook = false;
      activeWalkPointerId = null;
    };

    const onCanvasWheel = (e: WheelEvent) => {
      const mode = viewModeRef.current;
      if (mode === "orbit" || mode === "ar-camera") {
        cameraTransitionRef.current.active = false;
      } else if (isFreeLookMode(mode)) {
        e.preventDefault();
        zoomBy(e.deltaY > 0 ? 1 : -1);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("wheel", onCanvasWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    const xrRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -4),
    ]);
    const xrRayMat = new THREE.LineBasicMaterial({ color: 0x6f4e37 });
    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    controller0.add(new THREE.Line(xrRayGeo, xrRayMat));
    controller1.add(new THREE.Line(xrRayGeo, xrRayMat));
    xrRig.add(controller0, controller1);

    const onXrSelect = (event: { target: THREE.Object3D }) => {
      _tempMatrix.identity().extractRotation(event.target.matrixWorld);
      _rayOrigin.setFromMatrixPosition(event.target.matrixWorld);
      _rayDir.set(0, 0, -1).applyMatrix4(_tempMatrix);
      raycaster.set(_rayOrigin, _rayDir);
      const hits = raycaster.intersectObjects(interactiveProxies, false);
      if (hits.length > 0) {
        const hitStation = hits[0].object.userData.stationId as
          | StationId
          | undefined;
        if (hitStation) {
          labAudio.playClick(620);
          setActiveStation(hitStation);
          speakStationRef.current(hitStation);
        }
      }
    };
    controller0.addEventListener("selectstart", onXrSelect);
    controller1.addEventListener("selectstart", onXrSelect);

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      stereoEffect.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let wasStereoRendered = false;
    let pendingElectroH2 = 0;
    let electroSyncTimer = 0;
    let trigSyncTimer = 0;
    let pendingTrigDelta = 0;

    const stepSimulation = (delta: number, elapsed: number) => {
      STATION_ORDER.forEach((id) => {
        const ringMat = room.selectionRings[id]
          .material as THREE.MeshStandardMaterial;
        const isCurrent = id === activeStationRef.current;
        ringMat.emissiveIntensity = isCurrent ? 0.95 : 0.0;
        ringMat.opacity = isCurrent ? 0.85 : 0.35;
      });

      const currentMode = viewModeRef.current;
      const keys = keysPressedRef.current;
      const moveForward =
        (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0) -
        (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0) +
        walkPadRef.current.forward;
      const moveStrafe =
        (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) -
        (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0) +
        walkPadRef.current.strafe;
      const turnRate =
        ((keys["KeyQ"] ? 1 : 0) + (walkPadRef.current.turn < 0 ? 1 : 0)) -
        (walkPadRef.current.turn > 0 ? 1 : 0);
      const sprinting = Boolean(keys["ShiftLeft"] || keys["ShiftRight"]);

      let avatarMoveX = 0;
      let avatarMoveZ = 0;

      if (currentMode === "kid-control") {
        controls.enabled = false;
        if (turnRate !== 0) {
          walkYaw += turnRate * 1.75 * delta;
        }
        if (camera.rotation.order !== "XYZ") {
          camera.rotation.order = "XYZ";
        }
        const avatarPos = studentAvatar3d.getPosition();
        if (moveForward !== 0 || moveStrafe !== 0) {
          floorWalkTargetRef.current = null;
          floorMarker.visible = false;
          avatarManualRef.current = true;

          _walkForward.set(-Math.sin(walkYaw), 0, -Math.cos(walkYaw));
          _walkRight.set(Math.cos(walkYaw), 0, -Math.sin(walkYaw));
          avatarMoveX = _walkForward.x * moveForward + _walkRight.x * moveStrafe;
          avatarMoveZ = _walkForward.z * moveForward + _walkRight.z * moveStrafe;
          const len = Math.hypot(avatarMoveX, avatarMoveZ) || 1;
          avatarMoveX /= len;
          avatarMoveZ /= len;

          const speed = 2.9 * (sprinting ? 1.55 : 1.0) * delta;
          avatarPos.x += avatarMoveX * speed;
          avatarPos.z += avatarMoveZ * speed;
          clampAvatarToLabFloor(avatarPos);
          syncNearestStationFromAvatar(avatarPos);
        } else if (floorWalkTargetRef.current) {
          const distToTarget = Math.hypot(
            floorWalkTargetRef.current.x - avatarPos.x,
            floorWalkTargetRef.current.z - avatarPos.z,
          );
          if (distToTarget < 0.08) {
            floorWalkTargetRef.current = null;
            floorMarker.visible = false;
            avatarManualRef.current = true;
          } else {
            avatarManualRef.current = false;
            syncNearestStationFromAvatar(avatarPos);
          }
        }

        const pitchCos = Math.cos(walkPitch);
        _followCamPos.set(
          THREE.MathUtils.clamp(
            avatarPos.x + Math.sin(walkYaw) * pitchCos * kidFollowDist,
            -7.35,
            7.35,
          ),
          THREE.MathUtils.clamp(
            0.95 - Math.sin(walkPitch) * Math.max(1.6, kidFollowDist * 0.85),
            0.52,
            4.6,
          ),
          THREE.MathUtils.clamp(
            avatarPos.z + Math.cos(walkYaw) * pitchCos * kidFollowDist,
            -7.35,
            7.35,
          ),
        );
        _followLookTarget.set(avatarPos.x, 0.85, avatarPos.z);
        camera.position.lerp(_followCamPos, 1 - Math.exp(-12 * delta));
        camera.lookAt(_followLookTarget);
      } else if (currentMode === "walk" || currentMode === "vr-preview") {
        controls.enabled = false;
        if (turnRate !== 0) {
          walkYaw += turnRate * 1.65 * delta;
        }
        if (moveForward !== 0 || moveStrafe !== 0) {
          const speed = 3.2 * (sprinting ? 1.55 : 1.0) * delta;
          _walkForward.set(-Math.sin(walkYaw), 0, -Math.cos(walkYaw));
          _walkRight.set(Math.cos(walkYaw), 0, -Math.sin(walkYaw));
          walkPos.addScaledVector(_walkForward, moveForward * speed);
          walkPos.addScaledVector(_walkRight, moveStrafe * speed);
          walkPos.x = THREE.MathUtils.clamp(walkPos.x, -7.1, 7.1);
          walkPos.z = THREE.MathUtils.clamp(walkPos.z, -7.1, 7.1);
          syncNearestStationFromAvatar(walkPos);
        }
        camera.position.lerp(walkPos, 1 - Math.exp(-16 * delta));
        camera.rotation.order = "YXZ";
        camera.rotation.y = walkYaw;
        camera.rotation.x = walkPitch;
        camera.rotation.z = 0;
      } else if (currentMode === "orbit" || currentMode === "ar-camera") {
        controls.enabled = true;
        if (camera.rotation.order !== "XYZ") {
          camera.rotation.order = "XYZ";
        }
        if (cameraTransitionRef.current.active) {
          const alpha = 1 - Math.exp(-7 * delta);
          camera.position.lerp(cameraTransitionRef.current.targetPos, alpha);
          controls.target.lerp(cameraTransitionRef.current.targetLook, alpha);
          if (
            camera.position.distanceTo(cameraTransitionRef.current.targetPos) <
            0.02
          ) {
            cameraTransitionRef.current.active = false;
          }
        }
        controls.update();

        // Bonus: Direct WASD / Arrow control of the Kid Avatar even while orbiting!
        if (currentMode === "orbit" && (moveForward !== 0 || moveStrafe !== 0)) {
          avatarManualRef.current = true;
          floorWalkTargetRef.current = null;
          floorMarker.visible = false;
          camera.getWorldDirection(_camForward);
          _camForward.y = 0;
          if (_camForward.lengthSq() < 0.0001) _camForward.set(0, 0, -1);
          _camForward.normalize();
          _camRight.crossVectors(_camForward, _yAxis).normalize();

          avatarMoveX = _camForward.x * moveForward + _camRight.x * moveStrafe;
          avatarMoveZ = _camForward.z * moveForward + _camRight.z * moveStrafe;
          const len = Math.hypot(avatarMoveX, avatarMoveZ) || 1;
          avatarMoveX /= len;
          avatarMoveZ /= len;

          const avatarPos = studentAvatar3d.getPosition();
          const speed = 2.9 * (sprinting ? 1.55 : 1.0) * delta;
          avatarPos.x += avatarMoveX * speed;
          avatarPos.z += avatarMoveZ * speed;
          clampAvatarToLabFloor(avatarPos);
          syncNearestStationFromAvatar(avatarPos);
        }
      }

      if (floorMarker.visible) {
        const pulse = 1 + Math.sin(elapsed * 6) * 0.12;
        floorMarker.scale.set(pulse, pulse, 1);
      }

      const {
        oscillationCompleted,
        electrolysisH2Delta,
        projectileLandedRange,
      } = stations.update(
        experimentStateRef.current,
        delta,
        elapsed,
        activeStationRef.current,
      );

      const showAvatarInScene =
        !renderer.xr.isPresenting &&
        currentMode !== "walk" &&
        currentMode !== "vr-preview";

      const avatarTargetSpot =
        floorWalkTargetRef.current ?? AVATAR_BENCH_SPOTS[activeStationRef.current];

      studentAvatar3d.update(
        delta,
        elapsed,
        avatarTargetSpot,
        BENCH_POSES[activeStationRef.current].cameraTarget,
        showAvatarInScene,
        {
          manualMode: avatarManualRef.current && !floorWalkTargetRef.current,
          moveX: avatarMoveX,
          moveZ: avatarMoveZ,
          sprinting,
          speaking: voiceStatusRef.current === "speaking",
        },
      );

      pendingElectroH2 += electrolysisH2Delta;
      electroSyncTimer += delta;

      if (
        experimentStateRef.current.trig.sweeping &&
        activeStationRef.current === "trig"
      ) {
        pendingTrigDelta += delta * 28;
        trigSyncTimer += delta;
      }

      const shouldSyncElectro = electroSyncTimer >= 0.4 && pendingElectroH2 > 0;
      const shouldSyncTrig = trigSyncTimer >= 0.08 && pendingTrigDelta > 0;

      if (
        oscillationCompleted ||
        projectileLandedRange !== null ||
        shouldSyncElectro ||
        shouldSyncTrig
      ) {
        const addH2 = shouldSyncElectro ? pendingElectroH2 : 0;
        const addTrig = shouldSyncTrig ? pendingTrigDelta : 0;
        if (shouldSyncElectro) {
          pendingElectroH2 = 0;
          electroSyncTimer = 0;
        }
        if (shouldSyncTrig) {
          pendingTrigDelta = 0;
          trigSyncTimer = 0;
        }
        setExperimentState((prev) => {
          const nextH2 = Math.min(
            30,
            Number((prev.electrolysis.h2VolumeMl + addH2).toFixed(1)),
          );
          return {
            ...prev,
            pendulum: oscillationCompleted
              ? {
                  ...prev.pendulum,
                  elapsedOscillations: prev.pendulum.elapsedOscillations + 1,
                }
              : prev.pendulum,
            electrolysis:
              addH2 > 0
                ? {
                    ...prev.electrolysis,
                    h2VolumeMl: nextH2,
                    o2VolumeMl: Number((nextH2 / 2).toFixed(1)),
                  }
                : prev.electrolysis,
            projectile:
              projectileLandedRange !== null
                ? {
                    ...prev.projectile,
                    lastLandedRangeM: projectileLandedRange,
                  }
                : prev.projectile,
            trig:
              addTrig > 0
                ? {
                    ...prev.trig,
                    angleDeg: Math.round((prev.trig.angleDeg + addTrig) % 360),
                  }
                : prev.trig,
          };
        });
      }
    };

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed || renderer.xr.isPresenting) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      stepSimulation(delta, elapsed);

      if (viewModeRef.current === "vr-preview" && vrStereoRef.current) {
        wasStereoRendered = true;
        stereoEffect.render(scene, camera);
      } else {
        if (wasStereoRendered) {
          wasStereoRendered = false;
          const w = container.clientWidth || window.innerWidth;
          const h = container.clientHeight || window.innerHeight;
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    let activeXrSession: XRSession | null = null;
    xrControllerRef.current = {
      focusStation,
      zoomBy,
      triggerActiveAction: () => {
        triggerStationQuickAction(activeStationRef.current);
      },
      enterWalkMode: (
        station: StationId,
        mode: "walk" | "kid-control" | "vr-preview",
      ) => {
        viewModeRef.current = mode;
        cameraTransitionRef.current.active = false;
        controls.enabled = false;
        STATION_ORDER.forEach((id) => {
          room.benchGroups[id].visible = true;
        });
        room.roomEnvelope.visible = true;
        arFloorGrid.visible = false;
        scene.background = ivoryBg;
        scene.fog = new THREE.Fog(0xfaf8f5, 11, 24);
        renderer.setClearColor(0xfaf8f5, 1);
        renderer.setClearAlpha(1);
        alignPoseToStation(station, mode);
      },
      exitToOrbit: (station: StationId) => {
        viewModeRef.current = "orbit";
        camera.fov = 58;
        camera.updateProjectionMatrix();
        camera.rotation.order = "XYZ";
        camera.rotation.z = 0;
        controls.enabled = true;
        STATION_ORDER.forEach((id) => {
          room.benchGroups[id].visible = true;
        });
        room.roomEnvelope.visible = true;
        arFloorGrid.visible = false;
        scene.background = ivoryBg;
        scene.fog = new THREE.Fog(0xfaf8f5, 11, 24);
        renderer.setClearColor(0xfaf8f5, 1);
        renderer.setClearAlpha(1);
        const pose = BENCH_POSES[station];
        controls.target.copy(pose.cameraTarget);
        cameraTransitionRef.current.targetPos.copy(pose.cameraPosition);
        cameraTransitionRef.current.targetLook.copy(pose.cameraTarget);
        cameraTransitionRef.current.active = true;
        controls.update();
      },
      setArIsolation: (enabled: boolean, station: StationId) => {
        room.roomEnvelope.visible = !enabled;
        arFloorGrid.visible = enabled;
        STATION_ORDER.forEach((id) => {
          room.benchGroups[id].visible = enabled ? id === station : true;
        });
        const pose = BENCH_POSES[station];
        arFloorGrid.position.set(pose.position.x, 0.008, pose.position.z);
      },
      setTransparentBackground: (transparent: boolean) => {
        if (transparent) {
          scene.background = null;
          scene.fog = null;
          renderer.setClearColor(0x000000, 0);
          renderer.setClearAlpha(0);
        } else {
          scene.background = ivoryBg;
          scene.fog = new THREE.Fog(0xfaf8f5, 11, 24);
          renderer.setClearColor(0xfaf8f5, 1);
          renderer.setClearAlpha(1);
        }
      },
      startXr: async (mode: "immersive-vr" | "immersive-ar") => {
        const xr = (
          navigator as unknown as {
            xr?: {
              requestSession: (
                m: string,
                opts?: Record<string, unknown>,
              ) => Promise<XRSession>;
            };
          }
        ).xr;
        if (!xr) {
          throw new Error("WebXR is not available in this browser.");
        }
        const isAr = mode === "immersive-ar";
        const optionalFeatures = ["local-floor", "bounded-floor", "hand-tracking"];
        const sessionInit: Record<string, unknown> = { optionalFeatures };
        if (isAr && viewportRootRef.current) {
          optionalFeatures.push("dom-overlay");
          sessionInit.domOverlay = { root: viewportRootRef.current };
        }
        const session = await xr.requestSession(mode, sessionInit);
        activeXrSession = session;
        room.roomEnvelope.visible = !isAr;
        if (isAr) {
          const st = activeStationRef.current;
          STATION_ORDER.forEach((id) => {
            room.benchGroups[id].visible = id === st;
          });
          scene.background = null;
          scene.fog = null;
          renderer.setClearColor(0x000000, 0);
        }

        xrRig.position.set(0, 0, 3.6);
        xrRig.add(camera);

        renderer.xr.setReferenceSpaceType("local-floor");
        await renderer.xr.setSession(session);
        setViewMode(isAr ? "ar-xr" : "vr-xr");

        session.addEventListener("end", () => {
          activeXrSession = null;
          renderer.setAnimationLoop(null);
          xrRig.remove(camera);
          scene.add(camera);
          room.roomEnvelope.visible = true;
          STATION_ORDER.forEach((id) => {
            room.benchGroups[id].visible = true;
          });
          scene.background = ivoryBg;
          scene.fog = new THREE.Fog(0xfaf8f5, 11, 24);
          renderer.setClearColor(0xfaf8f5, 1);
          setViewMode("orbit");
          focusStation(activeStationRef.current);
          frameId = requestAnimationFrame(tick);
        });

        renderer.setAnimationLoop(() => {
          const delta = Math.min(clock.getDelta(), 0.05);
          const elapsed = clock.getElapsedTime();
          stepSimulation(delta, elapsed);
          renderer.render(scene, camera);
        });
      },
      endXr: async () => {
        if (activeXrSession) {
          await activeXrSession.end();
        }
      },
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.setAnimationLoop(null);
      if (activeXrSession) {
        void activeXrSession.end().catch(() => {});
      }
      stopCameraFeed();

      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("wheel", onCanvasWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);

      controls.dispose();
      stations.dispose();
      studentAvatar3d.dispose();
      studentAvatar3dRef.current = null;
      arFloorGrid.dispose();
      floorMarkerGeo.dispose();
      floorMarkerMat.dispose();
      room.dispose();
      materials.dispose();
      roomEnvTexture.dispose();
      xrRayGeo.dispose();
      xrRayMat.dispose();
      renderer.dispose();

      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
      xrControllerRef.current = null;
    };
  }, [stopCameraFeed]);

  const switchStation = (station: StationId) => {
    labAudio.playClick(560);
    setActiveStation(station);
    setShowHint(false);
    setStationMenuOpen(false);
    xrControllerRef.current?.focusStation(station);
  };

  const stepStation = (delta: -1 | 1) => {
    const idx = STATION_ORDER.indexOf(activeStation);
    const nextIdx = (idx + delta + STATION_ORDER.length) % STATION_ORDER.length;
    switchStation(STATION_ORDER[nextIdx]);
  };

  const returnToOrbitMode = async () => {
    if (viewMode === "orbit") return;
    labAudio.playClick(480);
    if (viewMode === "vr-xr" || viewMode === "ar-xr") {
      await xrControllerRef.current?.endXr().catch(() => {});
      return;
    }
    stopCameraFeed();
    setArBackdropActive(false);
    vrStereoRef.current = false;
    setVrStereo(false);
    xrControllerRef.current?.setArIsolation(false, activeStation);
    xrControllerRef.current?.setTransparentBackground(false);
    setViewMode("orbit");
    xrControllerRef.current?.exitToOrbit(activeStation);
    setStatusNotice("Orbit View: Drag to rotate · Scroll or +/- to zoom.");
  };

  const toggleWalkMode = () => {
    labAudio.playClick(500);
    stopCameraFeed();
    setArBackdropActive(false);
    setVrStereo(false);
    xrControllerRef.current?.setArIsolation(false, activeStation);
    xrControllerRef.current?.setTransparentBackground(false);

    if (viewMode === "walk") {
      setViewMode("orbit");
      xrControllerRef.current?.exitToOrbit(activeStation);
      setStatusNotice("Switched to Bench Orbit view.");
    } else {
      setViewMode("walk");
      xrControllerRef.current?.enterWalkMode(activeStation, "walk");
      setStatusNotice(
        "Walk Mode: WASD / Arrows to walk · Drag anywhere to look around · Scroll or +/- to zoom.",
      );
    }
  };

  const toggleKidControlMode = () => {
    labAudio.playClick(540);
    stopCameraFeed();
    setArBackdropActive(false);
    setVrStereo(false);
    xrControllerRef.current?.setArIsolation(false, activeStation);
    xrControllerRef.current?.setTransparentBackground(false);

    if (viewMode === "kid-control") {
      setViewMode("orbit");
      xrControllerRef.current?.exitToOrbit(activeStation);
      setStatusNotice("Switched to Bench Orbit view.");
    } else {
      setViewMode("kid-control");
      xrControllerRef.current?.enterWalkMode(activeStation, "kid-control");
      setStatusNotice(
        "Kid Avatar Control: WASD / Arrows / D-Pad to move · Shift to sprint · Drag to orbit · Scroll or +/- to zoom · Click floor to walk.",
      );
    }
  };

  const handleEnterVr = async () => {
    labAudio.playClick(640);
    stopCameraFeed();
    setArBackdropActive(false);
    xrControllerRef.current?.setArIsolation(false, activeStation);
    xrControllerRef.current?.setTransparentBackground(false);

    if (viewMode === "vr-xr") {
      await xrControllerRef.current?.endXr().catch(() => {});
      return;
    }

    if (viewMode === "vr-preview") {
      vrStereoRef.current = false;
      setVrStereo(false);
      setViewMode("orbit");
      xrControllerRef.current?.exitToOrbit(activeStation);
      setStatusNotice("Exited VR mode.");
      return;
    }

    if (xrSupport.vr) {
      try {
        await xrControllerRef.current?.startXr("immersive-vr");
        return;
      } catch {
        // Fallback smoothly to Interactive Stereo VR Mode below
      }
    }

    vrStereoRef.current = true;
    setVrStereo(true);
    viewModeRef.current = "vr-preview";
    setViewMode("vr-preview");
    xrControllerRef.current?.enterWalkMode(activeStation, "vr-preview");
    setStatusNotice(
      "Stereo VR Mode active: Drag to look 360° · WASD to move · Space to trigger bench · Switch Mono 360° anytime.",
    );
  };

  const handleToggleAr = async () => {
    labAudio.playClick(640);
    vrStereoRef.current = false;
    setVrStereo(false);

    if (viewMode === "ar-xr") {
      await xrControllerRef.current?.endXr().catch(() => {});
      return;
    }

    if (viewMode === "ar-camera") {
      stopCameraFeed();
      setArBackdropActive(false);
      xrControllerRef.current?.setArIsolation(false, activeStation);
      xrControllerRef.current?.setTransparentBackground(false);
      xrControllerRef.current?.exitToOrbit(activeStation);
      setViewMode("orbit");
      setStatusNotice("Exited AR Tabletop mode.");
      return;
    }
    if (viewMode === "walk" || viewMode === "kid-control" || viewMode === "vr-preview") {
      xrControllerRef.current?.exitToOrbit(activeStation);
    }

    if (xrSupport.ar) {
      try {
        await xrControllerRef.current?.startXr("immersive-ar");
        return;
      } catch {
        // Fallback to live camera passthrough or Spatial AR Tabletop Studio
      }
    }

    // Enter AR Tabletop immediately so UI responds instantaneously while probing camera
    setArBackdropActive(true);
    xrControllerRef.current?.setArIsolation(true, activeStation);
    xrControllerRef.current?.setTransparentBackground(true);
    viewModeRef.current = "ar-camera";
    setViewMode("ar-camera");
    xrControllerRef.current?.focusStation(activeStation);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusNotice(
        "AR Tabletop active: Isolated bench on spatial reticle. Drag to orbit & scroll / +/- to zoom.",
      );
      return;
    }

    const requestCameraWithTimeout = async (): Promise<MediaStream | null> => {
      const timeoutPromise = new Promise<null>((resolve) =>
        window.setTimeout(() => resolve(null), 2800),
      );
      const tryStream = async () => {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          try {
            return await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch {
            return null;
          }
        }
      };
      return Promise.race([tryStream(), timeoutPromise]);
    };

    const stream = await requestCameraWithTimeout();
    if (viewModeRef.current !== "ar-camera") {
      stream?.getTracks().forEach((t) => t.stop());
      return;
    }

    if (stream && stream.getVideoTracks().some((t) => t.readyState === "live")) {
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setArBackdropActive(false);
      setStatusNotice(
        "Live Camera AR active: Isolated bench overlaid onto your camera feed. Drag to orbit & scroll / +/- to zoom.",
      );
    } else {
      stream?.getTracks().forEach((t) => t.stop());
      setArBackdropActive(true);
      setStatusNotice(
        "AR Tabletop Studio active (camera blocked or unavailable — spatial desk surface enabled).",
      );
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    labAudio.muted = next;
    setIsMuted(next);
    if (next) {
      labVoiceNarrator.stop();
    } else {
      labAudio.playClick(600);
    }
  };

  const progress = buildProgressSnapshot(completedQuests);
  const completedCount = STATION_ORDER.filter((id) => completedQuests[id]).length;
  const activeQuest = LAB_QUESTS[activeStation];

  const microBlurPx = Math.abs(experimentState.microscope.focusValue - 50) * 0.14;
  const microZoom =
    experimentState.microscope.magnification === 4
      ? 0.68
      : experimentState.microscope.magnification === 10
        ? 1.0
        : 1.52;

  const trigRad = (experimentState.trig.angleDeg * Math.PI) / 180;
  const trigCos = Math.cos(trigRad);
  const trigSin = Math.sin(trigRad);

  return (
    <div
      ref={viewportRootRef}
      className="fixed inset-0 z-50 overflow-hidden bg-[#FAF8F5] select-none"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          void videoRef.current?.play().catch(() => {});
        }}
        className={[
          "absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-200",
          viewMode === "ar-camera" && !arBackdropActive
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {viewMode === "ar-camera" && arBackdropActive ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#EDEAE6] via-[#DFDBD5] to-[#CFC8BF]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.65) 0%, rgba(220,214,206,0.35) 60%, rgba(190,182,172,0.45) 100%), linear-gradient(to right, rgba(111,78,55,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(111,78,55,0.08) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 40px 40px, 40px 40px",
          }}
        />
      ) : null}

      <div
        ref={canvasMountRef}
        onPointerDown={() => {
          if (stationMenuOpen) setStationMenuOpen(false);
          if (questPopoverOpen) setQuestPopoverOpen(false);
        }}
        className="absolute inset-0 z-[1] h-full w-full"
      />

      {/* Subtle AR Viewfinder Calibration Brackets */}
      {viewMode === "ar-camera" ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-6 z-10">
          <div className="absolute top-0 left-0 h-7 w-7 border-t-2 border-l-2 border-[#6F4E37]/50 rounded-tl-md" />
          <div className="absolute top-0 right-0 h-7 w-7 border-t-2 border-r-2 border-[#6F4E37]/50 rounded-tr-md" />
          <div className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-[#6F4E37]/50 rounded-bl-md" />
          <div className="absolute bottom-0 right-0 h-7 w-7 border-b-2 border-r-2 border-[#6F4E37]/50 rounded-br-md" />
        </div>
      ) : null}

      {contextLost ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#FAF8F5] p-6 text-center">
          <div className="max-w-md rounded-2xl border border-[#231B16]/10 bg-white p-6 shadow-md space-y-3">
            <p className="font-display text-lg font-semibold text-[#231B16]">
              3D Graphics Context Interrupted
            </p>
            <p className="text-sm text-[#5C5149]">
              Your browser paused WebGL rendering. Return to the lab overview or reload to restore the 3D workbench.
            </p>
            <button
              type="button"
              onClick={onExitLab}
              className="rounded-xl bg-[#6F4E37] px-4 py-2 text-sm font-medium text-white cursor-pointer"
            >
              Exit to Lab Overview
            </button>
          </div>
        </div>
      ) : null}

      {/* Top HUD Bar: Ultra-Clean Frosted Floating Strips */}
      <div className="pointer-events-none fixed inset-x-4 top-3.5 z-20 flex items-start justify-between gap-3">
        {/* Top-Left: Compact Single-Row Profile & On-Demand Quest Popover */}
        <div className="pointer-events-auto relative flex flex-col items-start">
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/85 px-2 shadow-[0_4px_20px_rgba(35,27,22,0.06)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setQuestPopoverOpen(false);
                setCustomizerOpen(true);
              }}
              title="Customize student avatar"
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[#231B16]/[0.05] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <div className="scale-90 origin-left -mr-1">
                <StudentAvatarSvg avatar={avatar} size="sm" />
              </div>
              <span className="font-display text-sm font-semibold text-[#231B16] max-w-[110px] truncate">
                {avatar.name || "Student"}
              </span>
            </button>

            <span className="h-4 w-px bg-[#231B16]/12 shrink-0" aria-hidden="true" />

            <div className="hidden sm:flex items-center gap-1.5 px-1 text-xs font-mono tabular-nums text-[#5C5149] whitespace-nowrap shrink-0">
              <span className="font-medium text-[#42335C]">{progress.xp} XP</span>
              <span aria-hidden="true">·</span>
              <span>
                {completedCount}/{STATION_ORDER.length}
              </span>
            </div>

            <span className="hidden sm:block h-4 w-px bg-[#231B16]/12 shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => {
                setStationMenuOpen(false);
                setQuestPopoverOpen((prev) => !prev);
              }}
              aria-expanded={questPopoverOpen}
              className={[
                "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors",
                questPopoverOpen
                  ? "bg-[#6F4E37] text-white"
                  : "text-[#231B16] hover:bg-[#231B16]/[0.05]",
              ].join(" ")}
            >
              {completedQuests[activeStation] ? (
                <CheckCircle2
                  className={[
                    "h-3.5 w-3.5 shrink-0",
                    questPopoverOpen ? "text-white" : "text-[#2D6A4F]",
                  ].join(" ")}
                  aria-hidden="true"
                />
              ) : (
                <Award
                  className={[
                    "h-3.5 w-3.5 shrink-0",
                    questPopoverOpen ? "text-white" : "text-[#6F4E37]",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
              <span>Quest</span>
              <ChevronDown
                className={[
                  "h-3 w-3 transition-transform duration-150",
                  questPopoverOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>
          </div>

          {questPopoverOpen ? (
            <div className="mt-2 w-[min(320px,86vw)] rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/95 p-3.5 shadow-[0_12px_32px_rgba(35,27,22,0.12)] backdrop-blur-md space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#786D65]">
                    {activeQuest.subject} · {progress.rankTitle}
                  </p>
                  <p className="text-sm font-semibold text-[#231B16] leading-snug">
                    {activeQuest.stationNumber}. {activeQuest.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuestPopoverOpen(false)}
                  aria-label="Close quest details"
                  className="rounded-lg p-1 text-[#786D65] hover:bg-[#231B16]/[0.06] hover:text-[#231B16] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs leading-relaxed text-[#5C5149]">
                {showHint ? activeQuest.hint : activeQuest.objective}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[#231B16]/[0.08] text-xs">
                <span className="font-mono tabular-nums text-[#42335C]">
                  +{activeQuest.xpReward} XP · {activeQuest.badgeTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint((p) => !p)}
                  className="font-medium text-[#6F4E37] hover:underline cursor-pointer whitespace-nowrap"
                >
                  {showHint ? "Show Objective" : "Show Hint"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Top-Right: Streamlined Mode Switcher + Voice CTA + Minimal Utilities */}
        <div className="flex flex-col items-end gap-2.5 shrink-0 pointer-events-none max-w-full">
          <div className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/85 px-1.5 shadow-[0_4px_20px_rgba(35,27,22,0.06)] backdrop-blur-md">
            {/* Unified Spatial View Mode Segmented Switcher */}
            <div
              role="group"
              aria-label="View mode"
              className="flex items-center gap-0.5 rounded-xl bg-[#231B16]/[0.05] p-0.5"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  void returnToOrbitMode();
                }}
                title="Orbit around experiment bench"
                className={[
                  "inline-flex items-center gap-1 rounded-[10px] px-2.5 h-7 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all",
                  viewMode === "orbit"
                    ? "bg-white text-[#231B16] shadow-xs"
                    : "text-[#5C5149] hover:text-[#231B16]",
                ].join(" ")}
              >
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden lg:inline">Orbit</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleWalkMode();
                }}
                title="First-person walk mode"
                className={[
                  "inline-flex items-center gap-1 rounded-[10px] px-2.5 h-7 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all",
                  viewMode === "walk"
                    ? "bg-[#6F4E37] text-white shadow-xs"
                    : "text-[#5C5149] hover:text-[#231B16]",
                ].join(" ")}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Walk</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleKidControlMode();
                }}
                title="Control 3D Kid Avatar"
                className={[
                  "inline-flex items-center gap-1 rounded-[10px] px-2.5 h-7 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all",
                  viewMode === "kid-control"
                    ? "bg-[#6F4E37] text-white shadow-xs"
                    : "text-[#5C5149] hover:text-[#231B16]",
                ].join(" ")}
              >
                <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Kid</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  void handleEnterVr();
                }}
                title="VR stereoscopic immersion"
                className={[
                  "inline-flex items-center gap-1 rounded-[10px] px-2.5 h-7 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all",
                  viewMode === "vr-preview" || viewMode === "vr-xr"
                    ? "bg-[#42335C] text-white shadow-xs"
                    : "text-[#42335C] hover:bg-white/60",
                ].join(" ")}
              >
                <Glasses className="h-3.5 w-3.5" aria-hidden="true" />
                <span>VR</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  void handleToggleAr();
                }}
                title="AR tabletop & camera mode"
                className={[
                  "inline-flex items-center gap-1 rounded-[10px] px-2.5 h-7 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all",
                  viewMode === "ar-camera" || viewMode === "ar-xr"
                    ? "bg-[#6F4E37] text-white shadow-xs"
                    : "text-[#5C5149] hover:text-[#231B16]",
                ].join(" ")}
              >
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                <span>AR</span>
              </button>
            </div>

            <span className="h-4 w-px bg-[#231B16]/12 shrink-0" aria-hidden="true" />

            {/* Language + Voice Explain CTA */}
            <select
              aria-label="Explanation language"
              value={avatar.language}
              onChange={(e) => {
                labAudio.playClick(540);
                labVoiceNarrator.stop();
                updateAvatar({ language: e.target.value as TutorLanguage });
                e.currentTarget.blur();
              }}
              className="h-8 rounded-xl bg-transparent px-2 text-xs font-medium text-[#231B16] hover:bg-[#231B16]/[0.05] cursor-pointer transition-colors"
            >
              {LAB_LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.shortLabel}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                labAudio.playClick(600);
                speakStation(activeStation);
              }}
              title="Speak explanation (Shortcut: E)"
              className={[
                "inline-flex items-center gap-1.5 rounded-xl px-3 h-8 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-xs",
                voice.activeKey === `vp:${activeStation}:${avatar.language}` &&
                voice.status !== "idle"
                  ? "bg-[#42335C] text-white"
                  : "bg-[#6F4E37] text-white hover:bg-[#5A3E2B]",
              ].join(" ")}
            >
              {voice.activeKey === `vp:${activeStation}:${avatar.language}` &&
              voice.status === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : voice.activeKey === `vp:${activeStation}:${avatar.language}` &&
                voice.status === "speaking" ? (
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {voice.activeKey === `vp:${activeStation}:${avatar.language}` &&
                voice.status === "loading"
                  ? "Loading..."
                  : voice.activeKey === `vp:${activeStation}:${avatar.language}` &&
                      voice.status === "speaking"
                    ? "Stop"
                    : "Explain"}
              </span>
            </button>

            <span className="h-4 w-px bg-[#231B16]/12 shrink-0" aria-hidden="true" />

            {/* Clean Icon Utilities */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                toggleMute();
              }}
              aria-label={isMuted ? "Unmute lab audio" : "Mute lab audio"}
              title={isMuted ? "Unmute audio" : "Mute audio"}
              className="inline-flex items-center justify-center rounded-xl h-8 w-8 text-[#5C5149] hover:bg-[#231B16]/[0.06] hover:text-[#231B16] transition-colors cursor-pointer shrink-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                stopCameraFeed();
                setArBackdropActive(false);
                onExitLab();
              }}
              aria-label="Exit virtual laboratory"
              title="Exit to Lab Overview"
              className="inline-flex items-center justify-center rounded-xl h-8 w-8 text-[#5C5149] hover:bg-[#231B16]/[0.06] hover:text-[#231B16] transition-colors cursor-pointer shrink-0"
            >
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Live Eyepiece Specimen Field when Inspecting Microscope in 3D */}
          {activeStation === "microscope" ? (
            <div className="pointer-events-auto rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/88 backdrop-blur-md p-3 shadow-[0_8px_24px_rgba(35,27,22,0.08)] w-44 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#231B16]">Eyepiece</span>
                <span className="font-mono tabular-nums text-[#42335C]">
                  {experimentState.microscope.magnification}x
                </span>
              </div>
              <svg viewBox="0 0 160 160" className="w-full h-auto rounded-xl">
                <defs>
                  <clipPath id="vp-eyepiece-clip">
                    <circle cx="80" cy="80" r="72" />
                  </clipPath>
                  <filter id="vp-specimen-blur">
                    <feGaussianBlur stdDeviation={microBlurPx} />
                  </filter>
                </defs>
                <circle cx="80" cy="80" r="78" fill="#231B16" />
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill={
                    experimentState.microscope.illuminatorOn ? "#F8F5FC" : "#2E2621"
                  }
                />
                {experimentState.microscope.illuminatorOn ? (
                  <g clipPath="url(#vp-eyepiece-clip)">
                    <g
                      transform={`translate(80, 80) scale(${microZoom}) translate(-80, -80)`}
                      filter={microBlurPx > 0.2 ? "url(#vp-specimen-blur)" : undefined}
                    >
                      {experimentState.microscope.specimen === "onion" ? (
                        <g>
                          <rect x="20" y="30" width="58" height="44" fill="#E6E0F0" stroke="#42335C" strokeWidth="2" />
                          <circle cx="48" cy="52" r="8" fill="#6C4AB6" />
                          <rect x="78" y="30" width="60" height="44" fill="#EFEAF7" stroke="#42335C" strokeWidth="2" />
                          <circle cx="108" cy="54" r="8" fill="#6C4AB6" />
                          <rect x="20" y="74" width="58" height="46" fill="#EFEAF7" stroke="#42335C" strokeWidth="2" />
                          <circle cx="52" cy="96" r="8" fill="#6C4AB6" />
                          <rect x="78" y="74" width="60" height="46" fill="#E6E0F0" stroke="#42335C" strokeWidth="2" />
                          <circle cx="106" cy="94" r="8" fill="#6C4AB6" />
                        </g>
                      ) : experimentState.microscope.specimen === "stomata" ? (
                        <g>
                          <ellipse cx="80" cy="80" rx="58" ry="48" fill="#D4ECE4" stroke="#2D6A4F" strokeWidth="2" />
                          <path d="M 62 80 Q 80 54 98 80 Q 80 106 62 80 Z" fill="#40916C" stroke="#1B4332" strokeWidth="2" />
                          <ellipse cx="80" cy="80" rx="10" ry="4" fill="#FAF8F5" />
                          <circle cx="71" cy="70" r="3" fill="#1B4332" />
                          <circle cx="89" cy="90" r="3" fill="#1B4332" />
                        </g>
                      ) : (
                        <g>
                          <path d="M 35 60 Q 65 25 110 48 Q 130 85 95 118 Q 48 128 35 60 Z" fill="#F6E5EE" stroke="#9E2A5C" strokeWidth="2" />
                          <circle cx="78" cy="76" r="11" fill="#8C2754" />
                        </g>
                      )}
                    </g>
                  </g>
                ) : null}
              </svg>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right-Edge Minimal Floating Zoom Rocker */}
      <div className="pointer-events-auto fixed right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col overflow-hidden rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/82 shadow-[0_4px_20px_rgba(35,27,22,0.06)] backdrop-blur-md">
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={(e) => {
            e.currentTarget.blur();
            xrControllerRef.current?.zoomBy(-1);
          }}
          className="flex h-9 w-9 items-center justify-center text-[#231B16] hover:bg-[#231B16]/[0.06] transition-colors cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="h-px w-full bg-[#231B16]/10" aria-hidden="true" />
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={(e) => {
            e.currentTarget.blur();
            xrControllerRef.current?.zoomBy(1);
          }}
          className="flex h-9 w-9 items-center justify-center text-[#231B16] hover:bg-[#231B16]/[0.06] transition-colors cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Transient Quest / Voice / Status Toast (Auto-fades cleanly) */}
      {questBanner || statusNotice || voice.error || voice.status !== "idle" ? (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 max-w-[90vw]">
          {voice.status !== "idle" ? (
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[#42335C]/20 bg-[#F3EFF9]/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-[#42335C] shadow-sm">
              {voice.status === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>
                {voice.status === "loading"
                  ? "Preparing voice..."
                  : `Speaking: ${activeQuest.title}`}
              </span>
              <button
                type="button"
                onClick={() => labVoiceNarrator.stop()}
                className="font-semibold text-[#6F4E37] hover:underline cursor-pointer"
              >
                Stop
              </button>
            </div>
          ) : null}
          {questBanner ? (
            <div className="pointer-events-auto rounded-xl border border-[#2D6A4F]/25 bg-[#ECF5F0]/95 backdrop-blur-md px-4 py-2 text-xs sm:text-sm font-medium text-[#2D6A4F] shadow-sm">
              {questBanner}
            </div>
          ) : null}
          {voice.error ? (
            <div
              role="alert"
              className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[#D9822B]/30 bg-[#FFF8F1]/95 backdrop-blur-md px-3.5 py-1.5 text-xs text-[#8C4A0B] shadow-sm"
            >
              <span>{voice.error}</span>
              <button
                type="button"
                onClick={() => labVoiceNarrator.clearError()}
                aria-label="Dismiss voice notice"
                className="text-[#6F4E37] hover:text-[#231B16] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {statusNotice ? (
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[#231B16]/10 bg-[#FAF8F5]/92 backdrop-blur-md px-3.5 py-1.5 text-xs text-[#5C5149] shadow-sm">
              <span>{statusNotice}</span>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                aria-label="Dismiss notice"
                className="text-[#786D65] hover:text-[#231B16] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* VR Visor Overlay & Center Gaze Reticles */}
      {viewMode === "vr-preview" ? (
        vrStereo ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-10 grid grid-cols-2"
          >
            <div className="relative border-r-2 border-[#231B16]/50 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full border-2 border-[#42335C]/75 bg-white/70" />
            </div>
            <div className="relative flex items-center justify-center">
              <div className="h-3 w-3 rounded-full border-2 border-[#42335C]/75 bg-white/70" />
            </div>
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center"
          >
            <div className="h-3.5 w-3.5 rounded-full border-2 border-[#42335C]/75 bg-white/70" />
          </div>
        )
      ) : null}

      {/* Walk / Kid Control / VR Touch D-Pad & Mode Extras */}
      {viewMode === "walk" || viewMode === "kid-control" || viewMode === "vr-preview" ? (
        <div
          className={[
            "pointer-events-auto fixed right-4 z-20 flex flex-col gap-1.5 rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/86 backdrop-blur-md p-2 shadow-[0_8px_24px_rgba(35,27,22,0.08)] transition-all duration-200",
            dockCollapsed ? "bottom-16" : "bottom-36",
          ].join(" ")}
        >
          {viewMode === "vr-preview" ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                const next = !vrStereo;
                vrStereoRef.current = next;
                setVrStereo(next);
              }}
              className="rounded-xl bg-[#42335C]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#42335C] hover:bg-[#42335C]/15 transition-colors cursor-pointer whitespace-nowrap"
            >
              {vrStereo ? "Mono 360° VR" : "Stereo Split VR"}
            </button>
          ) : null}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              aria-label="Turn left"
              onPointerDown={() => (walkPadRef.current.turn = -1)}
              onPointerUp={() => (walkPadRef.current.turn = 0)}
              onPointerLeave={() => (walkPadRef.current.turn = 0)}
              onPointerCancel={() => (walkPadRef.current.turn = 0)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 hover:bg-white active:bg-[#E6E0F0] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#231B16]" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Walk forward"
              onPointerDown={() => (walkPadRef.current.forward = 1)}
              onPointerUp={() => (walkPadRef.current.forward = 0)}
              onPointerLeave={() => (walkPadRef.current.forward = 0)}
              onPointerCancel={() => (walkPadRef.current.forward = 0)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 hover:bg-white active:bg-[#E6E0F0] transition-colors cursor-pointer"
            >
              <ArrowUp className="h-4 w-4 text-[#231B16]" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Turn right"
              onPointerDown={() => (walkPadRef.current.turn = 1)}
              onPointerUp={() => (walkPadRef.current.turn = 0)}
              onPointerLeave={() => (walkPadRef.current.turn = 0)}
              onPointerCancel={() => (walkPadRef.current.turn = 0)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 hover:bg-white active:bg-[#E6E0F0] transition-colors cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5 text-[#231B16]" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Walk left"
              onPointerDown={() => (walkPadRef.current.strafe = -1)}
              onPointerUp={() => (walkPadRef.current.strafe = 0)}
              onPointerLeave={() => (walkPadRef.current.strafe = 0)}
              onPointerCancel={() => (walkPadRef.current.strafe = 0)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 hover:bg-white active:bg-[#E6E0F0] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-[#231B16]" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Walk backward"
              onPointerDown={() => (walkPadRef.current.forward = -1)}
              onPointerUp={() => (walkPadRef.current.forward = 0)}
              onPointerLeave={() => (walkPadRef.current.forward = 0)}
              onPointerCancel={() => (walkPadRef.current.forward = 0)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 hover:bg-white active:bg-[#E6E0F0] transition-colors cursor-pointer"
            >
              <ArrowDown className="h-4 w-4 text-[#231B16]" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Walk right"
              onPointerDown={() => (walkPadRef.current.strafe = 1)}
              onPointerUp={() => (walkPadRef.current.strafe = 0)}
              onPointerLeave={() => (walkPadRef.current.strafe = 0)}
              onPointerCancel={() => (walkPadRef.current.strafe = 0)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 hover:bg-white active:bg-[#E6E0F0] transition-colors cursor-pointer"
            >
              <ArrowRight className="h-4 w-4 text-[#231B16]" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Sleek Scrollbar-Free Bottom Experiment Dock */}
      {dockCollapsed ? (
        <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => setDockCollapsed(false)}
            className="inline-flex items-center gap-2.5 rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/88 backdrop-blur-md px-4 py-2 text-xs font-medium text-[#231B16] shadow-[0_8px_24px_rgba(35,27,22,0.08)] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <span className="font-mono tabular-nums text-[#6F4E37]">
              {activeQuest.stationNumber}
            </span>
            <span>{STATION_SHORT_LABEL[activeStation]}</span>
            <span className="text-[#786D65]" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[#5C5149]">
              <span>Controls</span>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </button>
        </div>
      ) : (
        <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(860px,94vw)]">
          {/* Floating 12-Station Grid Popover (Zero Horizontal Scrollbar) */}
          {stationMenuOpen ? (
            <div className="pointer-events-auto mb-2 rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/95 p-3 shadow-[0_16px_40px_rgba(35,27,22,0.14)] backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#231B16]/[0.08] px-1">
                <span className="text-xs font-semibold text-[#231B16]">
                  All 12 Laboratory Stations
                </span>
                <button
                  type="button"
                  onClick={() => setStationMenuOpen(false)}
                  aria-label="Close station directory"
                  className="rounded-lg p-1 text-[#786D65] hover:bg-[#231B16]/[0.06] hover:text-[#231B16] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {STATION_ORDER.map((id) => {
                  const quest = LAB_QUESTS[id];
                  const isActive = id === activeStation;
                  const isDone = completedQuests[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchStation(id)}
                      className={[
                        "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer",
                        isActive
                          ? "bg-[#6F4E37] text-white font-medium shadow-xs"
                          : "bg-white/75 text-[#231B16] hover:bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={[
                            "font-mono tabular-nums text-[11px] shrink-0",
                            isActive ? "text-white/80" : "text-[#786D65]",
                          ].join(" ")}
                        >
                          {quest.stationNumber}
                        </span>
                        <span className="truncate">{STATION_SHORT_LABEL[id]}</span>
                      </div>
                      {isDone ? (
                        <CheckCircle2
                          className={[
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-white" : "text-[#2D6A4F]",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="pointer-events-auto rounded-2xl border border-[#231B16]/10 bg-[#FAF8F5]/86 shadow-[0_12px_36px_rgba(35,27,22,0.10)] backdrop-blur-md">
            {/* Slim Station Switcher + Inline Objective Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#231B16]/[0.07] px-3 py-2">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => stepStation(-1)}
                  aria-label="Previous station"
                  title="Previous station"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5C5149] hover:bg-[#231B16]/[0.06] hover:text-[#231B16] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuestPopoverOpen(false);
                    setStationMenuOpen((prev) => !prev);
                  }}
                  aria-expanded={stationMenuOpen}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-2.5 h-7 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
                    stationMenuOpen
                      ? "bg-[#6F4E37] text-white"
                      : "bg-[#231B16]/[0.05] text-[#231B16] hover:bg-[#231B16]/[0.09]",
                  ].join(" ")}
                >
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                  <span className="font-mono tabular-nums opacity-75">
                    {activeQuest.stationNumber}
                  </span>
                  <span>{STATION_SHORT_LABEL[activeStation]}</span>
                  {completedQuests[activeStation] ? (
                    <CheckCircle2
                      className={[
                        "h-3.5 w-3.5 shrink-0",
                        stationMenuOpen ? "text-white" : "text-[#2D6A4F]",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  ) : null}
                  <ChevronDown
                    className={[
                      "h-3.5 w-3.5 transition-transform duration-150",
                      stationMenuOpen ? "rotate-180" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => stepStation(1)}
                  aria-label="Next station"
                  title="Next station"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5C5149] hover:bg-[#231B16]/[0.06] hover:text-[#231B16] transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Quiet Single-Line Objective & Hint Right Where You Experiment */}
              <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 text-xs text-[#5C5149]">
                <span className="truncate">
                  {showHint ? activeQuest.hint : activeQuest.objective}
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint((p) => !p)}
                  className="font-medium text-[#6F4E37] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showHint ? "Goal" : "Hint"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStationMenuOpen(false);
                  setDockCollapsed(true);
                }}
                aria-label="Minimize controls"
                title="Hide controls (Shortcut: H)"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5C5149] hover:bg-[#231B16]/[0.06] hover:text-[#231B16] transition-colors cursor-pointer shrink-0"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="px-4 py-3">

          {/* 01: Pendulum Controls */}
          {activeStation === "pendulum" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      String Length (L)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.pendulum.lengthM.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={1.6}
                    step={0.05}
                    value={experimentState.pendulum.lengthM}
                    onChange={(e) => {
                      const lengthM = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        pendulum: {
                          ...prev.pendulum,
                          lengthM,
                          measuredPeriodS: 2 * Math.PI * Math.sqrt(lengthM / 9.81),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Release Angle (θ)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.pendulum.amplitudeDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={30}
                    step={1}
                    value={experimentState.pendulum.amplitudeDeg}
                    onChange={(e) => {
                      const amplitudeDeg = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        pendulum: { ...prev.pendulum, amplitudeDeg },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="px-1 text-xs font-mono tabular-nums text-[#5C5149] whitespace-nowrap">
                  T = {experimentState.pendulum.measuredPeriodS.toFixed(2)} s ·{" "}
                  {experimentState.pendulum.elapsedOscillations} swings
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick();
                    setExperimentState((prev) => ({
                      ...prev,
                      pendulum: {
                        ...prev.pendulum,
                        running: !prev.pendulum.running,
                      },
                    }));
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  {experimentState.pendulum.running
                    ? "Pause Swing"
                    : "Start Swing"}
                </button>
              </div>
            </div>
          ) : null}

          {/* 02: Ray Optics Controls */}
          {activeStation === "optics" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Prism Rotation
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.optics.prismAngleDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={75}
                    step={1}
                    value={experimentState.optics.prismAngleDeg}
                    onChange={(e) => {
                      const prismAngleDeg = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        optics: {
                          ...prev.optics,
                          prismAngleDeg,
                          deviationDeg: calculateOpticsDeviation(
                            prismAngleDeg,
                            prev.optics.refractiveIndex,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Refractive Index (n)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.optics.refractiveIndex.toFixed(2)} · δ{" "}
                      {experimentState.optics.deviationDeg.toFixed(1)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.45}
                    max={1.7}
                    step={0.01}
                    value={experimentState.optics.refractiveIndex}
                    onChange={(e) => {
                      const refractiveIndex = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        optics: {
                          ...prev.optics,
                          refractiveIndex,
                          deviationDeg: calculateOpticsDeviation(
                            prev.optics.prismAngleDeg,
                            refractiveIndex,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  labAudio.playClick();
                  setExperimentState((prev) => ({
                    ...prev,
                    optics: { ...prev.optics, beamOn: !prev.optics.beamOn },
                  }));
                }}
                className="rounded-lg bg-[#6F4E37] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shrink-0"
              >
                {experimentState.optics.beamOn
                  ? "Turn Beam Off"
                  : "Turn Beam On"}
              </button>
            </div>
          ) : null}

          {/* 03: Titration Controls */}
          {activeStation === "titration" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="rounded-lg border border-[#E5E4E2] bg-white px-3 py-1.5 font-mono tabular-nums text-[#231B16]">
                  Acid: 25.0 mL · Base:{" "}
                  {experimentState.titration.baseAddedMl.toFixed(1)} mL
                </div>
                <div className="rounded-lg border border-[#DCD3EB] bg-[#F3EFF9] px-3 py-1.5 font-mono tabular-nums text-[#42335C] font-medium">
                  pH {experimentState.titration.currentPh.toFixed(2)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playDrop();
                    setExperimentState((prev) => {
                      const nextBase = Math.min(
                        50,
                        Number((prev.titration.baseAddedMl + 0.2).toFixed(1)),
                      );
                      return {
                        ...prev,
                        titration: {
                          ...prev.titration,
                          baseAddedMl: nextBase,
                          currentPh: calculateTitrationPh(nextBase),
                          dropPulse: prev.titration.dropPulse + 1,
                        },
                      };
                    });
                  }}
                  className="rounded-lg border border-[#6F4E37] bg-white px-3 py-2 text-xs font-medium text-[#6F4E37] hover:bg-[#FAF8F5] whitespace-nowrap cursor-pointer"
                >
                  +0.2 mL Micro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playDrop();
                    setExperimentState((prev) => {
                      const nextBase = Math.min(
                        50,
                        Number((prev.titration.baseAddedMl + 1).toFixed(1)),
                      );
                      return {
                        ...prev,
                        titration: {
                          ...prev.titration,
                          baseAddedMl: nextBase,
                          currentPh: calculateTitrationPh(nextBase),
                          dropPulse: prev.titration.dropPulse + 1,
                        },
                      };
                    });
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  +1 mL Drop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playDrop();
                    setExperimentState((prev) => {
                      const nextBase = Math.min(
                        50,
                        Number((prev.titration.baseAddedMl + 5).toFixed(1)),
                      );
                      return {
                        ...prev,
                        titration: {
                          ...prev.titration,
                          baseAddedMl: nextBase,
                          currentPh: calculateTitrationPh(nextBase),
                          dropPulse: prev.titration.dropPulse + 1,
                        },
                      };
                    });
                  }}
                  className="rounded-lg bg-[#E6E0F0] px-3.5 py-2 text-xs font-medium text-[#42335C] hover:bg-[#DBD2EB] whitespace-nowrap cursor-pointer"
                >
                  +5 mL Pour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(440);
                    setExperimentState((prev) => ({
                      ...prev,
                      titration: {
                        ...prev.titration,
                        baseAddedMl: 0,
                        currentPh: calculateTitrationPh(0),
                        dropPulse: 0,
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E4E2] bg-white px-3 py-2 text-xs font-medium text-[#231B16] hover:bg-[#F4F1EC] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* 04: Ohm's Law Circuit Controls */}
          {activeStation === "circuit" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">Voltage (V)</span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.circuit.voltageV.toFixed(1)} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={0.5}
                    value={experimentState.circuit.voltageV}
                    onChange={(e) => {
                      const voltageV = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        circuit: {
                          ...prev.circuit,
                          voltageV,
                          currentA: prev.circuit.switchClosed
                            ? voltageV / prev.circuit.resistanceOhm
                            : 0,
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Resistance (R)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.circuit.resistanceOhm.toFixed(1)} Ω
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    step={0.5}
                    value={experimentState.circuit.resistanceOhm}
                    onChange={(e) => {
                      const resistanceOhm = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        circuit: {
                          ...prev.circuit,
                          resistanceOhm,
                          currentA: prev.circuit.switchClosed
                            ? prev.circuit.voltageV / resistanceOhm
                            : 0,
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="px-1 text-xs font-mono tabular-nums text-[#5C5149] whitespace-nowrap">
                  I = {experimentState.circuit.currentA.toFixed(2)} A
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(680);
                    setExperimentState((prev) => {
                      const nextClosed = !prev.circuit.switchClosed;
                      return {
                        ...prev,
                        circuit: {
                          ...prev.circuit,
                          switchClosed: nextClosed,
                          currentA: nextClosed
                            ? prev.circuit.voltageV / prev.circuit.resistanceOhm
                            : 0,
                        },
                      };
                    });
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  {experimentState.circuit.switchClosed
                    ? "Open Switch"
                    : "Close Switch"}
                </button>
              </div>
            </div>
          ) : null}

          {/* 05: Electrolysis Controls */}
          {activeStation === "electrolysis" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <label className="space-y-1 text-xs min-w-[180px] flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Cell Voltage
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.electrolysis.voltageV.toFixed(1)} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={experimentState.electrolysis.voltageV}
                    onChange={(e) => {
                      const voltageV = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        electrolysis: { ...prev.electrolysis, voltageV },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>

                <div className="px-1 text-xs font-mono tabular-nums text-[#5C5149] whitespace-nowrap">
                  H₂: {experimentState.electrolysis.h2VolumeMl.toFixed(1)} mL · O₂:{" "}
                  {experimentState.electrolysis.o2VolumeMl.toFixed(1)} mL
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(600);
                    setExperimentState((prev) => ({
                      ...prev,
                      electrolysis: {
                        ...prev.electrolysis,
                        powerOn: !prev.electrolysis.powerOn,
                      },
                    }));
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  {experimentState.electrolysis.powerOn
                    ? "Power Off"
                    : "Power On"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(440);
                    setExperimentState((prev) => ({
                      ...prev,
                      electrolysis: {
                        ...prev.electrolysis,
                        h2VolumeMl: 0,
                        o2VolumeMl: 0,
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E4E2] bg-white px-3 py-2 text-xs font-medium text-[#231B16] hover:bg-[#F4F1EC] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* 06: Photosynthesis Controls */}
          {activeStation === "photosynthesis" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Light Intensity
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.photosynthesis.lightIntensityPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={experimentState.photosynthesis.lightIntensityPct}
                    onChange={(e) => {
                      const lightIntensityPct = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        photosynthesis: {
                          ...prev.photosynthesis,
                          lightIntensityPct,
                          bubblesPerMin: calculatePhotosynthesisRate(
                            prev.photosynthesis.lampOn,
                            lightIntensityPct,
                            prev.photosynthesis.co2LevelGl,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Dissolved CO₂
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.photosynthesis.co2LevelGl.toFixed(1)} g/L
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.0}
                    step={0.1}
                    value={experimentState.photosynthesis.co2LevelGl}
                    onChange={(e) => {
                      const co2LevelGl = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        photosynthesis: {
                          ...prev.photosynthesis,
                          co2LevelGl,
                          bubblesPerMin: calculatePhotosynthesisRate(
                            prev.photosynthesis.lampOn,
                            prev.photosynthesis.lightIntensityPct,
                            co2LevelGl,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="px-1 text-xs font-mono tabular-nums text-[#5C5149] whitespace-nowrap">
                  {experimentState.photosynthesis.bubblesPerMin} O₂/min
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(580);
                    setExperimentState((prev) => {
                      const lampOn = !prev.photosynthesis.lampOn;
                      return {
                        ...prev,
                        photosynthesis: {
                          ...prev.photosynthesis,
                          lampOn,
                          bubblesPerMin: calculatePhotosynthesisRate(
                            lampOn,
                            prev.photosynthesis.lightIntensityPct,
                            prev.photosynthesis.co2LevelGl,
                          ),
                        },
                      };
                    });
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  {experimentState.photosynthesis.lampOn
                    ? "Lamp Off"
                    : "Lamp On"}
                </button>
              </div>
            </div>
          ) : null}

          {/* 07: Microscope Controls */}
          {activeStation === "microscope" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="inline-flex items-center gap-1 rounded-lg border border-[#E5E4E2] bg-white p-1">
                  {([4, 10, 40] as const).map((mag) => {
                    const active = experimentState.microscope.magnification === mag;
                    return (
                      <button
                        key={mag}
                        type="button"
                        onClick={() => {
                          labAudio.playClick(540);
                          setExperimentState((prev) => ({
                            ...prev,
                            microscope: {
                              ...prev.microscope,
                              magnification: mag,
                            },
                          }));
                        }}
                        className={[
                          "px-2.5 py-1 rounded text-xs font-mono cursor-pointer",
                          active
                            ? "bg-[#6F4E37] text-white"
                            : "text-[#5C5149] hover:bg-[#F4F1EC]",
                        ].join(" ")}
                      >
                        {mag}x
                      </button>
                    );
                  })}
                </div>

                <div className="inline-flex items-center gap-1 rounded-lg border border-[#E5E4E2] bg-white p-1">
                  {(
                    [
                      { id: "onion", label: "Onion" },
                      { id: "stomata", label: "Stomata" },
                      { id: "cheek", label: "Cheek" },
                    ] as const
                  ).map((spec) => {
                    const active = experimentState.microscope.specimen === spec.id;
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => {
                          labAudio.playClick(520);
                          setExperimentState((prev) => ({
                            ...prev,
                            microscope: {
                              ...prev.microscope,
                              specimen: spec.id as MicroscopeSpecimen,
                            },
                          }));
                        }}
                        className={[
                          "px-2 py-1 rounded text-xs cursor-pointer",
                          active
                            ? "bg-[#E6E0F0] text-[#42335C] font-medium"
                            : "text-[#5C5149] hover:bg-[#F4F1EC]",
                        ].join(" ")}
                      >
                        {spec.label}
                      </button>
                    );
                  })}
                </div>

                <label className="space-y-1 text-xs min-w-[160px] flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Fine Focus
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.microscope.focusValue} (50 = Sharp)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={experimentState.microscope.focusValue}
                    onChange={(e) => {
                      const focusValue = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        microscope: { ...prev.microscope, focusValue },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  labAudio.playClick(560);
                  setExperimentState((prev) => ({
                    ...prev,
                    microscope: {
                      ...prev.microscope,
                      illuminatorOn: !prev.microscope.illuminatorOn,
                    },
                  }));
                }}
                className="rounded-lg bg-[#6F4E37] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shrink-0"
              >
                {experimentState.microscope.illuminatorOn
                  ? "Stage Lamp Off"
                  : "Stage Lamp On"}
              </button>
            </div>
          ) : null}

          {/* 08: Projectile Motion Controls */}
          {activeStation === "projectile" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Launch Angle (θ)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.projectile.angleDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={75}
                    step={1}
                    value={experimentState.projectile.angleDeg}
                    onChange={(e) => {
                      const angleDeg = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        projectile: {
                          ...prev.projectile,
                          angleDeg,
                          rangeM: calculateProjectileRange(
                            angleDeg,
                            prev.projectile.speedMs,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Launch Speed (v₀)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.projectile.speedMs.toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={5.0}
                    step={0.1}
                    value={experimentState.projectile.speedMs}
                    onChange={(e) => {
                      const speedMs = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        projectile: {
                          ...prev.projectile,
                          speedMs,
                          rangeM: calculateProjectileRange(
                            prev.projectile.angleDeg,
                            speedMs,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="px-1 text-xs font-mono tabular-nums text-[#5C5149] whitespace-nowrap">
                  R = {experimentState.projectile.rangeM.toFixed(2)} m
                  {experimentState.projectile.lastLandedRangeM !== null
                    ? ` · Hit ${experimentState.projectile.lastLandedRangeM.toFixed(2)} m`
                    : ""}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(720);
                    setExperimentState((prev) => ({
                      ...prev,
                      projectile: {
                        ...prev.projectile,
                        launchPulse: prev.projectile.launchPulse + 1,
                      },
                    }));
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  Fire Projectile
                </button>
              </div>
            </div>
          ) : null}

          {/* 09: Boyle's Law Controls */}
          {activeStation === "boyles" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <label className="space-y-1 text-xs flex-1">
                <div className="flex justify-between">
                  <span className="font-medium text-[#231B16]">
                    Syringe Chamber Volume (V)
                  </span>
                  <span className="font-mono tabular-nums text-[#6F4E37]">
                    {experimentState.boyles.volumeMl.toFixed(1)} mL
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={1}
                  value={experimentState.boyles.volumeMl}
                  onChange={(e) => {
                    const volumeMl = Number(e.target.value);
                    setExperimentState((prev) => ({
                      ...prev,
                      boyles: {
                        volumeMl,
                        pressureKpa: calculateBoylesPressure(volumeMl),
                      },
                    }));
                  }}
                  className="w-full lab-slider"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="rounded-lg border border-[#DCD3EB] bg-[#F3EFF9] px-3 py-1.5 text-xs font-mono tabular-nums text-[#42335C] font-medium">
                  P = {experimentState.boyles.pressureKpa.toFixed(1)} kPa · P×V ={" "}
                  {Math.round(
                    experimentState.boyles.pressureKpa *
                      experimentState.boyles.volumeMl,
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(460);
                    setExperimentState((prev) => ({
                      ...prev,
                      boyles: {
                        volumeMl: 40,
                        pressureKpa: calculateBoylesPressure(40),
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E4E2] bg-white px-3 py-2 text-xs font-medium text-[#231B16] hover:bg-[#F4F1EC] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset 40 mL</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* 10: Standing Wave Controls */}
          {activeStation === "wave" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      Oscillator Frequency (f)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.wave.frequencyHz} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={2}
                    value={experimentState.wave.frequencyHz}
                    onChange={(e) => {
                      const frequencyHz = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        wave: {
                          ...prev.wave,
                          frequencyHz,
                          harmonicNumber: calculateWaveHarmonic(
                            frequencyHz,
                            prev.wave.tensionN,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#231B16]">
                      String Tension (T)
                    </span>
                    <span className="font-mono tabular-nums text-[#6F4E37]">
                      {experimentState.wave.tensionN} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={40}
                    step={1}
                    value={experimentState.wave.tensionN}
                    onChange={(e) => {
                      const tensionN = Number(e.target.value);
                      setExperimentState((prev) => ({
                        ...prev,
                        wave: {
                          ...prev.wave,
                          tensionN,
                          harmonicNumber: calculateWaveHarmonic(
                            prev.wave.frequencyHz,
                            tensionN,
                          ),
                        },
                      }));
                    }}
                    className="w-full lab-slider"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="px-1 text-xs font-mono tabular-nums text-[#5C5149] whitespace-nowrap">
                  Harmonic n = {experimentState.wave.harmonicNumber.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(610);
                    setExperimentState((prev) => ({
                      ...prev,
                      wave: { ...prev.wave, running: !prev.wave.running },
                    }));
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  {experimentState.wave.running ? "Stop Wave" : "Start Wave"}
                </button>
              </div>
            </div>
          ) : null}

          {/* 11: DNA Double Helix Pairing Controls */}
          {activeStation === "dna" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {experimentState.dna.templateStrand.map((tmpl, idx) => {
                  const current = experimentState.dna.pairedStrand[idx];
                  const isMatch = current === getComplementaryBase(tmpl);
                  const order: DnaBase[] = ["A", "T", "C", "G"];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        labAudio.playClick(isMatch ? 700 : 540);
                        setExperimentState((prev) => {
                          const prevVal = prev.dna.pairedStrand[idx];
                          const nextVal =
                            prevVal === null
                              ? "A"
                              : order[(order.indexOf(prevVal) + 1) % order.length];
                          const nextPaired = [...prev.dna.pairedStrand];
                          nextPaired[idx] = nextVal;
                          return {
                            ...prev,
                            dna: { ...prev.dna, pairedStrand: nextPaired },
                          };
                        });
                      }}
                      className={[
                        "rounded-lg border px-2.5 py-1.5 text-xs font-mono cursor-pointer transition-colors",
                        isMatch
                          ? "border-[#2D6A4F] bg-[#ECF5F0] text-[#2D6A4F]"
                          : "border-[#E5E4E2] bg-white text-[#231B16] hover:bg-[#F3EFF9]",
                      ].join(" ")}
                    >
                      {tmpl} ↔ {current ?? "?"}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="rounded-lg border border-[#E5E4E2] bg-white px-3 py-1.5 text-xs font-mono tabular-nums text-[#231B16]">
                  {evaluateDnaMatches(
                    experimentState.dna.templateStrand,
                    experimentState.dna.pairedStrand,
                  )}
                  /6 Paired
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(620);
                    setExperimentState((prev) => ({
                      ...prev,
                      dna: { ...prev.dna, rotating: !prev.dna.rotating },
                    }));
                  }}
                  className="rounded-lg bg-[#6F4E37] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer"
                >
                  {experimentState.dna.rotating ? "Pause Spin" : "Spin Helix"}
                </button>
              </div>
            </div>
          ) : null}

          {/* 12: Trigonometric Unit Circle Controls */}
          {activeStation === "trig" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <label className="space-y-1 text-xs flex-1">
                <div className="flex justify-between">
                  <span className="font-medium text-[#231B16]">
                    Phasor Angle (θ)
                  </span>
                  <span className="font-mono tabular-nums text-[#6F4E37]">
                    {experimentState.trig.angleDeg}° ({(trigRad / Math.PI).toFixed(2)}π rad)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={experimentState.trig.angleDeg}
                  onChange={(e) => {
                    const angleDeg = Number(e.target.value);
                    setExperimentState((prev) => ({
                      ...prev,
                      trig: { ...prev.trig, sweeping: false, angleDeg },
                    }));
                  }}
                  className="w-full lab-slider"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="text-xs font-mono tabular-nums text-[#5C5149] px-1">
                  cos={trigCos.toFixed(3)} · sin={trigSin.toFixed(3)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    labAudio.playClick(600);
                    setExperimentState((prev) => ({
                      ...prev,
                      trig: { ...prev.trig, sweeping: !prev.trig.sweeping },
                    }));
                  }}
                  className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-medium text-white hover:bg-[#5A3E2B] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                >
                  {experimentState.trig.sweeping ? "Stop Sweep" : "Auto-Sweep"}
                </button>
              </div>
            </div>
          ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
