import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import style from "./header.component.scss";
import { TailwindElement } from "../shared/tailwind.element";
import { Document, WebIO, Material, Texture } from "@gltf-transform/core";
import { KHRDracoMeshCompression, KHRMaterialsClearcoat, KHRMaterialsTransmission } from "@gltf-transform/extensions";
import { DRACOModuleLoader } from "./draco-loader";
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader';


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
  
  // gltf-transform
  io: WebIO;
  documentIo: Document;

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
    this.io = new WebIO()
    .registerExtensions([KHRDracoMeshCompression, KHRMaterialsClearcoat, KHRMaterialsTransmission])
    .registerDependencies({
        'draco3d.decoder': this.dracoModules.decoder,
        'draco3d.encoder': this.dracoModules.encoder,
    });
    // GLTF Transform Model Handling
    this.documentIo = await this.io.read("../assets/Box_Draco.glb");

    this.loadModelInScene(this.documentIo);
  }

  // Three.js related methods
  async loadModelInScene(documentIo: Document) {
    const glbNonCompress = await this.io.writeBinary(documentIo);
    console.log("without draco size: ", glbNonCompress.buffer.byteLength)

    // comrpess with draco
    documentIo.createExtension(KHRDracoMeshCompression)
      .setRequired(true)
      .setEncoderOptions({
          method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
          encodeSpeed: 5,
          decodeSpeed: 5,
      });

    const clearcoatExtension = documentIo.createExtension(KHRMaterialsClearcoat);
    // Create Clearcoat property.
    const clearcoat = clearcoatExtension.createClearcoat()
    .setClearcoatFactor(1.0);

    // Create an Extension attached to the Document.
    const transmissionExtension = documentIo.createExtension(KHRMaterialsTransmission);

    // Create a Transmission property.
    const transmission = transmissionExtension.createTransmission()
        .setTransmissionFactor(1.0);

    const materials = documentIo.getRoot().listMaterials();
    for (let index = 0; index < materials.length; index++) {
      const element = materials[index];
      console.log(element);
      element.setExtension('KHR_materials_clearcoat', clearcoat);
      element.setExtension('KHR_materials_transmission', transmission);
    }
    const glb = await this.io.writeBinary(documentIo);
    console.log("with draco size: ", glb.buffer.byteLength)

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./');
    loader.setDRACOLoader(dracoLoader);
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
    await draco.loadDracoEncoder();
    this.dracoModules.decoder = draco.decoderModule;
    this.dracoModules.encoder = draco.encoderModule;

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

    this.renderer.setAnimationLoop(() => this.webglRender());

    new HDRCubeTextureLoader()
					.setPath( './pisaHDR/' )
					.load( [ 'px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr' ],
						( texture ) => {
              console.log(texture)

              this.scene.background = texture;
							this.scene.environment = texture;
            });

    window.addEventListener(
      "resize",
      () => {
        // this.renderer!.setSize(Number(width), Number(height));
      },
      true
    );
  }
}
