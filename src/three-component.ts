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

  raycaster = new THREE.Raycaster();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight
  );
  renderer?: THREE.WebGLRenderer;
  controls?: OrbitControls;
  documentIo: Document;
  meshArray = [];
  model?: THREE.Group;
  clonedMaterials: Material[];
  materials: Material[];

  materialSelectedIndex: number;
  textureSelectedIndex: number;
  mArray: THREE.Material[];

  render() {
    return html`<div
      class="absolute max-w-screen max-h-screen w-full h-full overflow-hidden"
    >
      <div
        id="imageHolder"
        class="flex top-0 left-0 w-full h-1/2 flex-row items-center justify-center bg-gray-400"
      >
        <div class="flex bg-gray-600 p-6 rounded-lg shadow-lg">
          <div class="relative" id="materialButtonHolder">
            <div class="flex flex-col items-center">
              <h5
                class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white"
              >
                Materials
              </h5>
            </div>
            <div
              id="materialButton"
              class="flex h-max overflow-auto flex-col"
            ></div>
          </div>

          <div
            id="textureButtonHolder"
            class="hidden md:block"
            style="display:none"
          >
            <button
              id="backButton"
              class="bg-slate-700 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded mb-20"
            >
              Back
            </button>
            <div class="sticky self-center flex flex-col items-center">
              <h5
                class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white"
              >
                Textures
              </h5>
            </div>
            <div
              id="textureButtons"
              class="flex h-max overflow-auto flex-col"
            ></div>
          </div>
        </div>

        <div class="flex flex-row w-max md:w-max items-center justify-center">
          <div
            class="max-w-sm  bg-white border-gray-200 shadow dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="p-2 self-center flex flex-col items-center">
              <h5
                class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white"
              >
                Original Texture
              </h5>
            </div>
            <div class="w-96 h-96 bg-gray-500 mx-auto my-auto">
              <img id="textureImg" />
            </div>
          </div>

          <div
            class="flex flex-col w-min content-center justify-center bg-gray-600 shadow-lg"
          >
            <button
              id="compressButton"
              class="px-8 py-4 text-lg m-4 font-mono text-gray-100  border-gray-200 hover:bg-gray-800 md:w-auto md:m-0"
            >
              Compress
            </button>
            <button
              id="resizeButton"
              class="px-8 py-4 text-lg m-4 font-mono text-gray-100  hover:bg-gray-800 md:w-auto md:m-0"
            >
              Resize
            </button>
          </div>

          <div
            class="max-w-sm bg-white border-gray-200 shadow dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="p-2 self-center flex flex-col items-center">
              <h5
                class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900 dark:text-white"
              >
                Compressed Texture
              </h5>
            </div>
            <div class="w-full h-64 bg-gray-500">
              <img id="compressImg" class="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div class="border relative w-screen h-screen">
        <canvas class="fixed bottom-0 left-0 w-full h-1/2"></canvas>
      </div>
    </div>`;
  }

  resizeCanvasToDisplaySize() {
    const canvas = this.renderer.domElement;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  async loadModel() {
    // Lights
    let light = new THREE.AmbientLight(0x404040);
    this.scene.add(light);

    let pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(1.5, 8, 0.5);
    pointLight.intensity = 2;
    this.scene.add(pointLight);

    // GLTF Transform Model Handling
    const io = new WebIO({ credentials: "include" });

    this.documentIo = await io.read("../assets/m9_bayonet_default.glb");

    const documentClone = await io.read("../assets/m9_bayonet_default.glb");

    const glb = await io.writeBinary(this.documentIo);

    this.materials = this.documentIo.getRoot().listMaterials();
    this.clonedMaterials = documentClone.getRoot().listMaterials();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("../assets/draco/");

    // Load model to add in scene
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.parse(glb.buffer, "", (gltf) => {
      let id: number;
      let model = gltf.scene;
      // model.position.set(0, -1, 0);

      //only for this model
      model.rotation.set(1, 0, 1);
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

      this.mArray = matArray;
    });

    const resize = this.root?.getElementById("resizeButton");

    const backButton = this.root?.getElementById("backButton");

    backButton.onclick = this.returnButtonOnClick.bind(this);

    // Append materials and their respective textures in required div
    if (this.materials.length > 0) {
      for (let i = 0; i < this.materials.length; i += 1) {
        const node = this.root?.getElementById("materialButton");
        const materialButton = document.createElement("button");

        const matTextures = this.getTexturesFromMaterials(
          this.clonedMaterials[i]
        );

        // Function call to get textures of each material present
        // Materials with no texture will be ignored and not returned here
        if (materialButton && matTextures) {
          materialButton.innerText = this.materials[i].getName().toUpperCase();
          materialButton.id = i.toString();
          materialButton.className =
            "px-4 py-2 text-xs m-2 font-mono text-gray-900  border-gray-200 hover:bg-gray-500 dark:bg-gray-700 dark:border-gray-400 dark:text-white dark:hover:text-black dark:hover:bg-gray-400 ";
          // onClick functionality for Materials
          materialButton.onclick = this.materialButtonOnClick.bind(this);
        }
        node?.appendChild(materialButton);
      }
    }

    // resize texture or image
    resize.onclick = this.resizeOnClick.bind(this);
  }

  returnButtonOnClick() {
    let textureButtonHolder = this.root?.getElementById("textureButtonHolder");
    let materialButtonHolder = this.root?.getElementById(
      "materialButtonHolder"
    );

    materialButtonHolder.style.display = "block";
    textureButtonHolder.style.display = "none";
  }

  materialButtonOnClick(e) {
    const tnode = this.root?.getElementById("textureButtons");
    let textureButtonHolder = this.root?.getElementById("textureButtonHolder");
    let materialButtonHolder = this.root?.getElementById(
      "materialButtonHolder"
    );

    let i = Number(e.target?.id);

    const matTextures = this.getTexturesFromMaterials(this.clonedMaterials[i]);

    this.materialSelectedIndex = Number(e.target?.id);
    tnode.innerHTML = "";

    materialButtonHolder.style.display = "none";
    textureButtonHolder.style.display = "block";

    // Highlight selected material
    for (let i = 0; i < this.mArray.length; i += 1) {
      if (i === Number(e.target?.id)) {
        this.mArray[i].color.set(0xff0000);
      } else {
        this.mArray[i].color.set(0xffffff);
      }
    }

    // Appending available Texture into respective buttons onto div
    for (let i = 0; i < matTextures.length; i += 1) {
      const textureButton = document.createElement("button");
      if (textureButton) {
        textureButton.innerText = matTextures[i].getName();
        textureButton.id = i.toString();
        // console.log(textureButton.id);

        textureButton.className =
          "px-4 py-2 text-xs m-2 font-mono text-gray-900  border-gray-200 hover:bg-gray-500 dark:bg-gray-700 dark:border-gray-400 dark:text-white dark:hover:text-black dark:hover:bg-gray-400 ";
        // onClick functionality fot Textures
        textureButton.onclick = this.textureButtonOnClick.bind(this);
        tnode?.appendChild(textureButton);
      }
    }
  }

  textureButtonOnClick(e) {
    const img = this.root?.getElementById("textureImg");
    const matTextures = this.getTexturesFromMaterials(
      this.clonedMaterials[this.materialSelectedIndex]
    );

    let i = Number(e.target?.id);
    this.textureSelectedIndex = i;
    let cloneTexture = matTextures[i];
    let content = cloneTexture.getImage();

    img.src = URL.createObjectURL(
      new Blob([content.buffer], { type: "image/png" } /* (1) */)
    );
  }

  async resizeOnClick(e) {
    console.log(this.clonedMaterials);
    const clonedMatTextures = this.getTexturesFromMaterials(
      this.materials[this.materialSelectedIndex]
    );

    let currentTexture = clonedMatTextures[this.textureSelectedIndex];
    var regexp: RegExp;

    const compressImg = this.root?.getElementById("compressImg");

    if (currentTexture.getURI()) {
      regexp = new RegExp(currentTexture.getURI());
    } else {
      regexp = new RegExp(currentTexture.getName());
    }

    await this.documentIo.transform(
      textureResize({
        size: [256, 256],
        pattern: regexp,
      })
    );

    const imageData = currentTexture.getImage();
    let image = URL.createObjectURL(
      new Blob([imageData.buffer], { type: "image/png" } /* (1) */)
    );
    compressImg.src = image;
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

  renderModel() {
    this.renderer!.render(this.scene, this.camera);
    this.resizeCanvasToDisplaySize();
  }

  // Function Start Here
  firstUpdated() {
    // Camera, Scene setup
    this.camera.position.set(0, 0, 1);
    this.scene.background = new THREE.Color(0x9ca3af);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: true,
    });

    this.loadModel();

    // Initializing Orbit Controls for Model
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls!.update();

    let width = getComputedStyle(this.canvas).getPropertyValue("width");
    width = width.substring(0, width.length - 2);
    let height = getComputedStyle(this.canvas).getPropertyValue("height");
    height = height.substring(0, height.length - 2);

    // Renderer setup
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer!.setSize(Number(width), Number(height));
    this.renderer.setAnimationLoop(() => this.renderModel());

    window.addEventListener(
      "resize",
      () => {
        this.renderer!.setSize(Number(width), Number(height));
      },
      true
    );
  }
}
