import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import style from "./header.component.scss";
import { TailwindElement } from "../shared/tailwind.element";
import { Document, WebIO, Material, Texture } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { DRACOModuleLoader } from "./draco-loader";

@customElement("three-component")
export class ThreeComponent extends TailwindElement(style) {
  @query("canvas") canvas!: HTMLCanvasElement;

  get root() {
    return this.shadowRoot;
  }

  // three.js
  raycaster = new THREE.Raycaster();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight);
  renderer?: THREE.WebGLRenderer;
  controls?: OrbitControls;

  // material highlighting
  highlightedMaterialIndex: number;
  inSceneMaterials: THREE.Material[];

  // gltf-transform
  documentIo: Document;
  documentClone: Document;
  materials: Material[];
  selectedMaterialIndex = -1;
  selectedTextureIndex = -1;

  dracoModules = {
    decoder: null,
    encoder: null
  }


  render() {
    return html`
      <div class="relative flex flex-col h-screen border-black">
            <div class="justify-center items-center">
              <canvas class="w-full h-full"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // general function and gltf-transform related methods
  async loadModel() {
    const io = new WebIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
        'draco3d.decoder': this.dracoModules.decoder, // Optional.
        'draco3d.encoder': this.dracoModules.encoder, // Optional.
    });
    // GLTF Transform Model Handling
    this.documentIo = await io.read("../assets/web_asset_fbx2gltf_v2.glb");

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("../assets/draco/");

    this.loadModelInScene(this.documentIo);

  }

  // Three.js related methods
  async loadModelInScene(documentIo: Document) {
    const glb = await this.io.writeBinary(documentIo);
    const loader = new GLTFLoader();
    loader.parse(glb.buffer, "", (gltf) => {
      let id: number;
      let model = gltf.scene;

      this.scene.add(model);

      this.fitCameraToObject(this.camera, model, 3, this.controls);
    });
  }

  // Reference: https://discourse.threejs.org/t/camera-zoom-to-fit-object/936/3
  fitCameraToObject( camera, object, offset, controls ) {

    offset = offset || 1.25;

    const boundingBox = new THREE.Box3();

    // get bounding box of object - this will be used to setup controls and camera
    boundingBox.setFromObject( object );

    const center = boundingBox.getCenter(new THREE.Vector3());

    const size = boundingBox.getSize(new THREE.Vector3());

    // get the max side of the bounding box (fits to width OR height as needed )
    const maxDim = Math.max( size.x, size.y, size.z );
    const fov = camera.fov * ( Math.PI / 180 );
    let cameraZ = Math.abs( maxDim / 4 * Math.tan( fov * 2 ) );

    cameraZ *= offset; // zoom out a little so that objects don't fill the screen

    camera.position.z = cameraZ;

    const minZ = boundingBox.min.z;
    const cameraToFarEdge = ( minZ < 0 ) ? -minZ + cameraZ : cameraZ - minZ;

    camera.far = cameraToFarEdge * 3;
    camera.updateProjectionMatrix();

    if ( controls ) {

      // set camera to rotate around center of loaded object
      controls.target = center;

      // prevent camera from zooming out far enough to create far plane cutoff
      controls.maxDistance = cameraToFarEdge * 2;

      controls.saveState();

    } else {
        camera.lookAt( center )
   }
  }

  webglRender() {
    this.renderer!.render(this.scene, this.camera);
    // console.log(this.decoderModule)
  }

  // Entry point
  async firstUpdated() {
    // Camera, Scene setup
    this.camera.position.set(0, 0, 1);

    // Lights
    let light = new THREE.AmbientLight(0x404040);
    this.scene.add(light);

    let pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(1.5, 8, 0.5);
    pointLight.intensity = 2;
    this.scene.add(pointLight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: true,
    });

    const draco = new DRACOModuleLoader();
    await draco.loadDracoDecoder();
    // await draco.loadDracoEncoder();
    console.log(draco.decoderModule)
    this.dracoModules.decoder = draco.decoderModule;
    // this.dracoModules.encoder = draco.encoderModule;
    this.loadModel();

    // Initializing Orbit Controls for Model
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls!.update();

    const canvas = this.renderer.domElement;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    console.log(width, height);

    // Renderer setup
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // this.renderer!.setSize(Number(width), Number(height));
    // this.resizeCanvasToDisplaySize();

    this.renderer.setAnimationLoop(() => this.webglRender());

    window.addEventListener(
      "resize",
      () => {
        // this.renderer!.setSize(Number(width), Number(height));
      },
      true
    );
  }
}
