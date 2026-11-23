export type Sim3DPrimitiveShape =
  | "box"
  | "sphere"
  | "cylinder"
  | "cone"
  | "torus"
  | "ring"
  | "arrow"
  | "beam"
  | "helix"
  | "wave"
  | "particles"
  | "orbit";

export type Sim3DAnimationType =
  | "none"
  | "spin_y"
  | "spin_x"
  | "orbit"
  | "bob"
  | "oscillate_x"
  | "oscillate_y"
  | "pulse"
  | "flow"
  | "swing"
  | "wave";

export type Sim3DParamProperty =
  | "none"
  | "scale_y"
  | "scale_all"
  | "move_x"
  | "move_y"
  | "rotate_z"
  | "rotate_y"
  | "speed"
  | "amplitude"
  | "bend_angle"
  | "emissive";

export type Sim3DReadoutFormula =
  | "direct"
  | "ratio"
  | "product"
  | "sum"
  | "snell_deg"
  | "inverse"
  | "pendulum_t";

export interface Sim3DParameter {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface Sim3DObjectSpec {
  name: string;
  shape: Sim3DPrimitiveShape;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
  metalness: number;
  roughness: number;
  label: string;
  animation: Sim3DAnimationType;
  animSpeed: number;
  animAmplitude: number;
  orbitRadius: number;
  paramIndex: number;
  paramProperty: Sim3DParamProperty;
  paramFactor: number;
}

export interface Sim3DReadoutSpec {
  label: string;
  unit: string;
  formulaType: Sim3DReadoutFormula;
  paramA: number;
  paramB: number;
  scale: number;
  offset: number;
}

export interface GeneratedScene3DSpec {
  title: string;
  subtitle: string;
  backgroundHex: string;
  cameraDistance: number;
  parameters: Sim3DParameter[];
  objects: Sim3DObjectSpec[];
  readouts: Sim3DReadoutSpec[];
}

export interface TutorConceptResponse {
  title: string;
  ncertTag: string;
  summary: string;
  explanation: string;
  formula: string;
  observations: string[];
  realWorldApplication: string;
  matchingLabStation: string;
  scene3d: GeneratedScene3DSpec;
  model: string;
}
