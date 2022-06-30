import GUI from "lil-gui";
import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export type DualObject = { object: THREE.Object3D; body: CANNON.Body };

export class Animation {
  constructor(
    public canvas: HTMLCanvasElement,
    private readonly animationLoop: (clock: THREE.Clock) => void
  ) {}

  screenSize: { width: number; height: number };
  world = getWorld();
  scene = getScene();
  camera = getCamera();
  renderer = getRenderer(this.canvas);
  controls = getControls(this.camera, this.canvas);
  debugControls = getDebugControls(this.scene);
  clock = new THREE.Clock(false);

  initialize() {
    window.addEventListener(
      "resize",
      () => (this.screenSize = updateViewportSize(this.camera, this.renderer))
    );

    this.screenSize = updateViewportSize(this.camera, this.renderer);

    this.camera.position.set(3, 3, 3);
    this.scene.add(this.camera);

    this.clock.start();
    this.loop();
  }

  private loop() {
    this.animationLoop(this.clock);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    window.requestAnimationFrame(() => this.loop());
  }
}

function getWorld() {
  const world = new CANNON.World();
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.gravity.set(0, -9.82, 0);
  return world;
}

function getScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  return scene;
}

function getCamera() {
  return new THREE.PerspectiveCamera(75, 1, 0.01, 1000);
}

function getRenderer(canvas: HTMLCanvasElement) {
  return new THREE.WebGLRenderer({ canvas });
}

function getControls(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement
) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;
  controls.screenSpacePanning = false;
  controls.listenToKeyEvents(window);
  return controls;
}

function getDebugControls(scene: THREE.Scene) {
  const axesHelper = new THREE.AxesHelper(2);
  scene.add(axesHelper);
  const debugControls = new GUI({ width: 400 });
  debugControls.add(
    {
      toggleAxesHelper: () => {
        if (scene.getObjectById(axesHelper.id)) {
          scene.remove(axesHelper);
        } else {
          scene.add(axesHelper);
        }
      },
    },
    "toggleAxesHelper"
  );

  return debugControls;
}

function updateViewportSize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) {
  const screenSize = { width: window.innerWidth, height: window.innerHeight };

  camera.aspect = screenSize.width / screenSize.height;
  camera.updateProjectionMatrix();
  renderer.setSize(screenSize.width, screenSize.height);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

  return screenSize;
}
