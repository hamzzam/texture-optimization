import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import style from "./header.component.scss";
import { TailwindElement } from "../shared/tailwind.element";
import { Document, WebIO, Material } from "@gltf-transform/core";
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

  meshArray = [];
  model?: THREE.Group;

  render() {
    return html`<main>
      <div
        id="imageHolder"
        class="flex overflow-hidden py-16 flex-row w-screen items-center justify-evenly bg-gray-400"
      >
        <div>
          <div class="sticky self-center flex flex-col items-center">
            <h5
              class="mb-2 text-2xl  font-mono w-fit tracking-tight text-gray-900  dark:text-white"
            >
              Materials
            </h5>
          </div>
          <div
            id="materialButton"
            class=" flex  h-96 overflow-auto  flex-col border bg-gray-600 p-6 rounded-lg shadow-lg"
          ></div>
        </div>

        <div>
          <div class="sticky self-center flex flex-col items-center">
            <h5
              class="mb-2 text-2xl  font-mono w-fit tracking-tight text-gray-900  dark:text-white"
            >
              Textures
            </h5>
          </div>
          <div
            id="textureButtons"
            class=" flex  h-96 overflow-auto  flex-col border bg-gray-600 p-6 rounded-lg shadow-lg"
          ></div>
        </div>

        <div
          class="flex flex-row w-3/4 p-5 items-center justify-evenly bg-gray-600 rounded-lg shadow-lg"
        >
          <div
            class="max-w-sm bg-white border-gray-200  shadow dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="p-5 self-center flex flex-col items-center">
              <h5
                class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900  dark:text-white"
              >
                Original Texture
              </h5>
            </div>
            <a href="#">
              <img id="textureImg" alt="textureImg" />
            </a>
          </div>

          <div
            class="flex flex-col w-min content-center justify-center bg-gray-400 rounded-lg shadow-lg"
          >
            <button
              id="compressButton"
              class="px-8 py-4 text-lg m-4 font-mono  text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:border-gray-600 dark:text-black dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
            >
              Compress
            </button>
            <button
              id="resizeButton"
              class="px-8 py-4 text-lg m-4 font-mono  text-gray-900 border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700  dark:border-gray-600 dark:text-black dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
            >
              Resize
            </button>
          </div>

          <div
            class="max-w-sm  bg-white border-gray-200  shadow dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="p-5 self-center flex flex-col items-center">
              <h5
                class="mb-2 text-2xl font-mono w-fit tracking-tight text-gray-900  dark:text-white"
              >
                Compressed Texture
              </h5>
            </div>
            <a href="#">
              <img id="compressImg" alt="compressImg" />
            </a>
          </div>
        </div>
      </div>

      <div class="border bg-gray-400 py-4">
        <canvas class="h-96 w-screen"></canvas>
      </div>
    </main>`;
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

    let documentIo: Document;

    documentIo = await io.read("../assets/m9_bayonet_default.glb");

    const glb = await io.writeBinary(documentIo);

    const materials = documentIo.getRoot().listMaterials();

    const mArray = [];

    var regexp: RegExp;

    var currentTexture: { getImage: () => any };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("../assets/draco/");

    // Load model to add in scene
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.parse(glb.buffer, "", (gltf) => {
      let id: number;
      let model = gltf.scene;
      model.position.set(0, -1, 0);
      this.scene.add(model);

      model.traverse(function (obj) {
        if (obj instanceof Mesh) {
          if (obj.material.uuid !== id) {
            id = obj.material.uuid;
            mArray.push(obj.material);
          }
        }
      });
    });


    const resize = this.root?.getElementById("resizeButton");
    const compressImg = this.root?.getElementById("compressImg");

    // Append materials and their respective textures in required div
    if (materials.length > 0) {
      const img = this.root?.getElementById("textureImg");

      for (let i = 0; i < materials.length; i += 1) {
        const node = this.root?.getElementById("materialButton");
        const materialButton = document.createElement("button");

        // Function call to get textures of each material present
        // Materials with no texture will be ignored and not returned here
        const matTextures = this.getTexturesFromMaterials(materials[i]);

        if (materialButton && matTextures) {
          const tnode = this.root?.getElementById("textureButtons");
          materialButton.innerText = materials[i].getName().toUpperCase();
          materialButton.id = i.toString();
          materialButton.className =
            "px-8 py-4 text-sm m-4 font-mono text-gray-900  border-gray-200 hover:bg-gray-500 dark:bg-gray-700 dark:border-gray-400 dark:text-white dark:hover:text-black dark:hover:bg-gray-400 ";

          // onClick functionality for Materials
          materialButton.onclick = function (e) {
            let i = Number(e.target?.id);
            tnode.innerHTML = "";

            const textures = matTextures;
            for (let i = 0; i < mArray.length; i += 1) {
              if (i === Number(e.target?.id)) {
                mArray[i].color.set(0xff0000);
              } else {
                mArray[i].color.set(0xffffff);
              }
            }

            // Appending available Texture into respective buttons onto div
            for (let i = 0; i < textures.length; i += 1) {
              const textureButton = document.createElement("button");
              if (textureButton) {
                textureButton.innerText = textures[i].getName();
                textureButton.id = i.toString();
                textureButton.className =
                  "px-8 py-4 text-sm m-4 font-mono text-gray-900  border-gray-200 hover:bg-gray-500 dark:bg-gray-700 dark:border-gray-400 dark:text-white dark:hover:text-black dark:hover:bg-gray-400 ";

                // onClick functionality fot Textures

                textureButton.onclick = function (e) {
                  let i = Number(e.target?.id);
                  let content = textures[i].getImage();
                  currentTexture = textures[i].clone();
                  regexp = new RegExp(textures[i].getURI());

                  img.src = URL.createObjectURL(
                    new Blob([content.buffer], { type: "image/png" } /* (1) */)
                  );
                };
                tnode?.appendChild(textureButton);
              }
            }
          };
        }
        node?.appendChild(materialButton);
      }
    }

    // resize texture or image
    resize.onclick = async function () {
      await documentIo.transform(
        textureResize({
          size: [256, 256],
          pattern: regexp,
        })
      );

      let textureImg = currentTexture.getImage();
      compressImg.src = URL.createObjectURL(
        new Blob([textureImg.buffer], { type: "image/png" } /* (1) */)
      );
    };
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

    if (materialTextures.length > 0) {
      return materialTextures;
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
      false
    );
  }
}
