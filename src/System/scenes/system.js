import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import ThreeMeshUI from "three-mesh-ui";
import WebXRPolyfill from 'webxr-polyfill';

const polyfill = new WebXRPolyfill(); // Initialize the polyfill

let camera, scene, renderer, controls, dragControls;
let listener, sound;
let controller1, controller2;
let draggableObjects = [];
let video, videoTexture, videoMaterial, videoPlane;
let uiContainer;
let isInitialized = false;

// Экспортируем функцию инициализации для вызова из Main.js
export async function initSystem(existingRenderer) {
  if (isInitialized) return;
  
  renderer = existingRenderer;
  renderer.xr.enabled = true; // Enable XR on the renderer

  setupScene();
  setupCamera();
  setupLighting();
  setupControls();
  setupUI();
  
  setupVRButton(); // Call this unconditionally
  setupControllers();
  
  setupDragControls();
  loadSound();
  setupToggleVideoBackgroundButton();
  setupWebcamBackground();
  setupBackgroundColorButton();
  setupUploadButton();

  window.addEventListener("resize", onWindowResize);

  isInitialized = true;
  animate();
}

// Function to setup UI
async function setupUI() {
  // Create container block
  uiContainer = new ThreeMeshUI.Block({
    width: 2,
    height: 1,
    padding: 0.2,
    fontFamily: "https://unpkg.com/three-mesh-ui/examples/assets/Roboto-msdf.json",
    fontTexture: "https://unpkg.com/three-mesh-ui/examples/assets/Roboto-msdf.png",
    backgroundColor: new THREE.Color(0x333333),
    backgroundOpacity: 0.8
  });

  // Position the container
  uiContainer.position.set(0, 1.6, -2);
  uiContainer.rotation.x = -0.15;

  // Create text
  const text = new ThreeMeshUI.Text({
    content: "Hello, MRWeb!",
    fontSize: 0.1,
    fontColor: new THREE.Color(0xffffff),
  });

  // Add text to container
  uiContainer.add(text);

  // Add container to scene
  scene.add(uiContainer);
}

// Определяем функцию render
function render() {
  if (controls) controls.update();
  if (videoTexture) videoTexture.needsUpdate = true;
  ThreeMeshUI.update();
  renderer.render(scene, camera);
}

// ��нимационный цикл
function animate() {
  renderer.setAnimationLoop(render);
}

// Инициализация сцены
function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdddddd);
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 1.6, 3);
}

function setupLighting() {
  // Simple lighting setup
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
}

function setupControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.6, 0);
  controls.update();
  controls.enableDamping = true;

  let gyroEnabled = false;

  // Добавляем поддержку гироскопа для мобильных устройств
  if (window.DeviceOrientationEvent) {
    const handleGyroscope = (event) => {
      if (!gyroEnabled || renderer.xr.isPresenting) return;

      if (event.beta !== null && event.gamma !== null) {
        const x = THREE.MathUtils.degToRad(event.beta);
        const y = THREE.MathUtils.degToRad(event.gamma);

        // Плавно поворачиваем камеру
        const dampingFactor = 0.1;
        camera.rotation.x += (x - camera.rotation.x) * dampingFactor;
        camera.rotation.y += (y - camera.rotation.y) * dampingFactor;
      }
    };

    window.addEventListener('deviceorientation', handleGyroscope);

    // Для iOS нужно запросить разрешение
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // Создаем кнопку для запроса разрешения гироскопа
      const gyroButton = document.createElement('button');
      gyroButton.style.position = 'fixed';
      gyroButton.style.top = '20px';
      gyroButton.style.left = '50%';
      gyroButton.style.transform = 'translateX(-50%)';
      gyroButton.style.padding = '12px 24px';
      gyroButton.style.background = '#4CAF50';
      gyroButton.style.color = 'white';
      gyroButton.style.border = 'none';
      gyroButton.style.borderRadius = '8px';
      gyroButton.style.fontSize = '16px';
      gyroButton.style.fontWeight = 'bold';
      gyroButton.style.cursor = 'pointer';
      gyroButton.style.zIndex = '100';
      gyroButton.textContent = 'Включить гироскоп';

      gyroButton.addEventListener('click', async () => {
        try {
          const response = await DeviceOrientationEvent.requestPermission();
          if (response === 'granted') {
            gyroEnabled = true;
            gyroButton.style.display = 'none';
            console.log('Gyroscope enabled');
          }
        } catch (error) {
          console.error('Error requesting gyroscope permission:', error);
          alert('Не удалось получить доступ к гироскопу');
        }
      });

      document.body.appendChild(gyroButton);
    } else {
      gyroEnabled = true;
    }
  }
}

function setupVRButton() {
  document.body.appendChild(VRButton.createButton(renderer)); // Use the standard VRButton
}

function setupControllers() {
  controller1 = renderer.xr.getController(0);
  scene.add(controller1);
  controller2 = renderer.xr.getController(1);
  scene.add(controller2);
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 2,
  });
  const line = new THREE.Line(geometry, lineMaterial);
  line.name = "line";
  line.scale.z = 5;
  controller1.add(line.clone());
  controller2.add(line.clone());
  const controllerModelFactory = new XRControllerModelFactory();
  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1),
  );
  scene.add(controllerGrip1);
  const controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2),
  );
  scene.add(controllerGrip2);
}

function setupDragControls() {
  dragControls = new DragControls(
    draggableObjects,
    camera,
    renderer.domElement,
  );
  dragControls.addEventListener("dragstart", () => {
    controls.enabled = false;
  });
  dragControls.addEventListener("dragend", () => {
    controls.enabled = true;
  });
}

function loadSound() {
  listener = new THREE.AudioListener();
  camera.add(listener);

  sound = new THREE.Audio(listener);
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(
    "./src/System/audio/sound.wav",
    (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(false);
      sound.setVolume(0.5);
      sound.play();
    },
    undefined,
    (err) => {
      console.error("Error loading sound:", err);
    },
  );
}

function setupUploadButton() {
  const uploadButton = document.getElementById("upload-button");
  const fileInput = document.getElementById("file-input");

  if (!uploadButton || !fileInput) {
    console.error(
      "Не удалось найти элементы upload-button или file-input в DOM.",
    );
    return;
  }

  uploadButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      loadGLTFModel(file);
    } else {
      console.log("Файл не выбран.");
    }
  });
}

function loadGLTFModel(file) {
  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      draggableObjects.push(model);
      setupDragControls();
      URL.revokeObjectURL(url);
    },
    undefined,
    (error) => {
      console.error("Ошибка при загрузке GLTF модели:", error);
    },
  );
}

function setupWebcamBackground() {
  video = document.createElement("video");
  video.style.display = "none";
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  document.body.appendChild(video);

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      return video.play();
    })
    .then(() => {
      videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBFormat;

      videoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });

      const geometry = new THREE.PlaneGeometry(16, 9);
      videoPlane = new THREE.Mesh(geometry, videoMaterial);
      videoPlane.position.z = -10;
      scene.add(videoPlane);
      videoPlane.visible = false;
      updateVideoPlane();
    })
    .catch((error) => {
      console.warn("Ошибка доступа к веб-камере:", error);
      // Можно установить фоновый цвет или изображение по умолчанию
    });
}

function updateVideoPlane() {
  if (videoPlane) {
    const aspect = window.innerWidth / window.innerHeight;
    const videoAspect = 16 / 9;
    if (aspect > videoAspect) {
      videoPlane.scale.set(aspect / videoAspect, 1, 1);
    } else {
      videoPlane.scale.set(1, videoAspect / aspect, 1);
    }
  }
}

function setupToggleVideoBackgroundButton() {
  const toggleVideoBackgroundButton = document.getElementById(
    "toggle-video-background-button",
  );

  if (!toggleVideoBackgroundButton) {
    console.error(
      "Не удалось найти элемент toggle-video-background-button в DOM.",
    );
    return;
  }

  toggleVideoBackgroundButton.addEventListener("click", () => {
    if (videoPlane) {
      videoPlane.visible = !videoPlane.visible;
      window.videoPlaneVisible = videoPlane.visible;

      // Обновляем текст кнопки на основе языка
      const key = videoPlane.visible ? "disableWebcam" : "enableWebcam";
      toggleVideoBackgroundButton.textContent =
        translations[currentLanguage][key];
    } else {
      alert("Видео фон недоступен.");
    }
  });
}

function setupBackgroundColorButton() {
  const backgroundColorButton = document.getElementById(
    "background-color-button",
  );
  const colorPicker = document.getElementById("color-picker");

  if (!backgroundColorButton || !colorPicker) {
    console.error(
      "Не удалось найти элементы background-color-button или color-picker в DOM.",
    );
    return;
  }

  backgroundColorButton.addEventListener("click", () => {
    colorPicker.click();
  });

  colorPicker.addEventListener("input", (event) => {
    const selectedColor = event.target.value;
    document.body.style.backgroundColor = selectedColor;
    if (window.setSceneBackgroundColor) {
      window.setSceneBackgroundColor(selectedColor);
    }
  });
}

window.setSceneBackgroundColor = function (color) {
  if (scene) scene.background = new THREE.Color(color);
};

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateVideoPlane();
}
