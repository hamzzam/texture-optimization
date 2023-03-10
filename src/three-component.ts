import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import style from "./header.component.scss";
import { TailwindElement } from "../shared/tailwind.element";
import { Document, WebIO, Material, Texture } from "@gltf-transform/core";
import { textureResize } from "@gltf-transform/functions";
import { Mesh } from "three";

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
  io = new WebIO({ credentials: "include" });
  selectedMaterialIndex = -1;
  selectedTextureIndex = -1;

  // TODO: css-templating
  render() {
    return html`
      <div class="relative flex flex-col h-screen border-black">
        <div class="flex static z-10 top-0 left-0 items-center justify-center bg-gray-400">
          <!-- <div class="relative flex flex-col h-screen border-black"> -->
          <div class="flex w-full">
            <div
              id="imageHolder"
              class="flex static z-10 w-1/2 top-0 left-0 items-center justify-center bg-gray-400">
              <div class="flex static border-r-2 flex-col w-screen h-screen md:w-screen items-center justify-center">
                <div class="static mb-4 flex bg-gray-600 p-6 rounded-lg shadow-lg">
                  <div
                    class=""
                    id="materialButtonHolder">
                    <div class="flex flex-col items-center">
                      <h5 class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white">Materials</h5>
                    </div>
                    <div
                      id="materialButton"
                      class="flex h-max overflow-auto flex-col"></div>
                  </div>

                  <div
                    id="textureButtonHolder"
                    class="hidden md:block"
                    style="display:none">
                    <button
                      id="backButton"
                      class="bg-slate-700 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded mb-20">
                      Back
                    </button>
                    <div class="sticky self-center flex flex-col items-center">
                      <h5 class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white">Textures</h5>
                    </div>
                    <div
                      id="textureButtons"
                      class="flex h-max overflow-auto flex-col"></div>
                  </div>
                </div>

                <div class="flex flex-row w-full md:w-full items-center justify-evenly">
                  <div class="max-w-sm  bg-white border-gray-200 shadow dark:bg-gray-800 dark:border-gray-700">
                    <div class="p-2 self-center flex flex-col items-center">
                      <h5 class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white">Original Texture</h5>
                    </div>
                    <div class="w-80 h-80 bg-gray-500 mx-auto my-auto">
                      <img id="textureImg" />
                    </div>
                  </div>

                  <div class="flex flex-col w-min content-center justify-center bg-gray-600 shadow-lg">
                    <!-- <button
                id="compressButton"
                class="px-8 py-4 text-lg m-4 font-mono text-gray-100  border-gray-200 hover:bg-gray-800 md:w-auto md:m-0"
              >
                Compress
              </button> -->
                    <button
                      id="resizeButton"
                      class="px-2 py-4 text-sm m-4 font-mono text-gray-100  hover:bg-gray-800 md:w-auto md:m-0">
                      Resize
                    </button>
                  </div>

                  <div class="max-w-sm bg-white border-gray-200 shadow dark:bg-gray-800 dark:border-gray-700">
                    <div class="p-2 self-center flex flex-col items-center">
                      <h5 class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white">Compressed Texture</h5>
                    </div>
                    <div class="w-64 h-64 bg-gray-500">
                      <img
                        id="compressedTextureImg"
                        class="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-1/2 justify-center items-center">
              <canvas class="w-full h-full"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // general function and gltf-transform related methods
  async loadModel() {
    // GLTF Transform Model Handling
    this.documentIo = await this.io.read("../assets/steampunk_glasses.glb");
    this.documentClone = await this.io.read("../assets/steampunk_glasses.glb");

    this.materials = this.documentIo.getRoot().listMaterials();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("../assets/draco/");

    this.loadModelInScene(this.documentIo);

    const resize = this.root?.getElementById("resizeButton");

    const backButton = this.root?.getElementById("backButton");

    backButton.onclick = this.returnButtonOnClick.bind(this);

    // Append materials and their respective textures in required div
    if (this.materials.length > 0) {
      for (let i = 0; i < this.materials.length; i += 1) {
        const node = this.root?.getElementById("materialButton");
        const materialButton = document.createElement("button");

        const matTextures = this.getTexturesFromMaterials(this.materials[i]);

        // Function call to get textures of each material present
        // Materials with no texture will be ignored and not returned here
        if (materialButton && matTextures) {
          materialButton.innerText = this.materials[i].getName().toUpperCase();
          materialButton.id = i.toString();
          materialButton.className = "px-4 py-2 text-xs m-2 font-mono text-gray-900  border-gray-200 hover:bg-gray-500 dark:bg-gray-700 dark:border-gray-400 dark:text-white dark:hover:text-black dark:hover:bg-gray-400 ";
          // onClick functionality for Materials
          materialButton.onclick = this.materialButtonOnClick.bind(this);
        }
        node?.appendChild(materialButton);
      }
    }

    // resize texture or image
    resize.onclick = this.resizeOnClick.bind(this);
  }

  getTexturesFromMaterials(material: Material) {
    const materialTextures = [];

    const normalTexture = material.getNormalTexture();
    const emissiveTexture = material.getEmissiveTexture();
    const baseColorTetxture = material.getBaseColorTexture();
    const occlusionTexture = material.getOcclusionTexture();
    const metallicRoughnessTexture = material.getMetallicRoughnessTexture();

    if (normalTexture) {
      normalTexture.setName("Normal Texture");
      materialTextures.push(normalTexture);
    }
    if (emissiveTexture) {
      emissiveTexture.setName("Emissive Texture");
      materialTextures.push(emissiveTexture);
    }
    if (baseColorTetxture) {
      baseColorTetxture.setName("Base Color Texture");
      materialTextures.push(baseColorTetxture);
    }
    if (occlusionTexture) {
      occlusionTexture.setName("Occlusion Texture");
      materialTextures.push(occlusionTexture);
    }
    if (metallicRoughnessTexture) {
      metallicRoughnessTexture.setName("Metallic Roughness Texture");
      materialTextures.push(metallicRoughnessTexture);
    }

    const matTextures = [...new Set(materialTextures)];
    console.log(matTextures);

    if (matTextures.length > 0) {
      return matTextures;
    }
  }

  // button click callbacks
  returnButtonOnClick() {
    let textureButtonHolder = this.root?.getElementById("textureButtonHolder");
    let materialButtonHolder = this.root?.getElementById("materialButtonHolder");

    materialButtonHolder.style.display = "block";
    textureButtonHolder.style.display = "none";
  }

  materialButtonOnClick(e) {
    const tnode = this.root?.getElementById("textureButtons");
    let textureButtonHolder = this.root?.getElementById("textureButtonHolder");
    let materialButtonHolder = this.root?.getElementById("materialButtonHolder");

    // restore color of highlighted material
    if (this.highlightedMaterialIndex !== -1) this.inSceneMaterials[this.highlightedMaterialIndex].emissive = new THREE.Color(this.inSceneMaterials[this.highlightedMaterialIndex].userData.originalColor);
    
    this.selectedMaterialIndex = Number(e.target?.id);
    this.highlightedMaterialIndex = this.selectedMaterialIndex;
    const matTextures = this.getTexturesFromMaterials(this.materials[this.selectedMaterialIndex]);
    
    tnode.innerHTML = "";
    materialButtonHolder.style.display = "none";
    textureButtonHolder.style.display = "block";

    // Highlight selected material
    this.inSceneMaterials[this.highlightedMaterialIndex].userData.originalColor = this.inSceneMaterials[this.highlightedMaterialIndex].emissive .getHex()
    this.inSceneMaterials[this.highlightedMaterialIndex].emissive .set(0xff0000);
   
    // Appending available Texture into respective buttons onto div
    for (let i = 0; i < matTextures.length; i += 1) {
      const textureButton = document.createElement("button");
      if (textureButton) {
        textureButton.innerText = matTextures[i].getName();
        textureButton.id = i.toString();
        // console.log(textureButton.id);

        textureButton.className = "px-4 py-2 text-xs m-2 font-mono text-gray-900  border-gray-200 hover:bg-gray-500 dark:bg-gray-700 dark:border-gray-400 dark:text-white dark:hover:text-black dark:hover:bg-gray-400 ";
        // onClick functionality fot Textures
        textureButton.onclick = this.textureButtonOnClick.bind(this);
        tnode?.appendChild(textureButton);
      }
    }
  }

  textureButtonOnClick(e) {
    const img = this.root?.getElementById("textureImg");
    const originalMaterials = this.documentClone.getRoot().listMaterials();
    const currentMaterialTextures = this.getTexturesFromMaterials(originalMaterials[this.selectedMaterialIndex]);

    let i = Number(e.target?.id);
    this.selectedTextureIndex = i;
    let cloneTexture = currentMaterialTextures[i];
    let content = cloneTexture.getImage();

    img.src = URL.createObjectURL(new Blob([content.buffer], { type: "image/png" } /* (1) */));
  }

  async resizeOnClick(e) {
    const currentMaterialTextures = this.getTexturesFromMaterials(this.materials[this.selectedMaterialIndex]);

    let currentTexture = currentMaterialTextures[this.selectedTextureIndex];
    let regexp: RegExp;

    const compressedTextureImg = this.root?.getElementById("compressedTextureImg");

    if (currentTexture.getURI()) {
      regexp = new RegExp(currentTexture.getURI());
    } else {
      regexp = new RegExp(currentTexture.getName());
    }

    console.log(regexp)
    await this.documentIo.transform(
      textureResize({
        size: [32, 32],
        pattern: regexp,
      })
    );

    const imageData = currentTexture.getImage();
    let image = URL.createObjectURL(new Blob([imageData.buffer], { type: "image/png" } /* (1) */));
    compressedTextureImg.src = image;

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
      let matArray: THREE.Material[] = [];

      model.traverse(function (obj) {
        if (obj instanceof Mesh) {
          if (obj.material.uuid !== id) {
            id = obj.material.uuid;
            matArray.push(obj.material);
          }
        }
      });

      this.highlightedMaterialIndex = -1;
      this.inSceneMaterials = matArray;
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
  firstUpdated() {
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
