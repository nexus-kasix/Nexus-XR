import * as THREE from 'three';

let camera, scene, renderer;
let currentAnimationFrame = null;

init();
animate();

function init() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Create the scene
    scene = new THREE.Scene();

    // Set up the camera
    camera = new THREE.PerspectiveCamera(75, screenWidth / screenHeight, 0.1, 1000);
    camera.position.z = 5;

    // Set up the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(screenWidth, screenHeight);
    document.body.appendChild(renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Handle Start button click to load the next scene
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', loadSystemScene);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    currentAnimationFrame = requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function cleanupCurrentScene() {
    // Остановить текущую анимацию
    if (currentAnimationFrame !== null) {
        cancelAnimationFrame(currentAnimationFrame);
        currentAnimationFrame = null;
    }

    // Очистить сцену
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }

    // Удалить обработчики событий
    window.removeEventListener('resize', onWindowResize);
}

async function loadSystemScene() {
    // Удалить кнопку старта
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.remove();
    }

    try {
        // Очистить текущую сцену
        cleanupCurrentScene();

        // Импортировать и инициализировать system.js
        const systemModule = await import('./src/System/scenes/system.js');
        
        // Передать текущий рендерер в system.js
        if (typeof systemModule.initSystem === 'function') {
            systemModule.initSystem(renderer);
        } else {
            console.error('system.js does not export initSystem function');
        }
    } catch (error) {
        console.error('Failed to load system.js:', error);
    }
}

console.log(import.meta.env.VITE_API_KEY);
console.log(import.meta.env.VITE_APP_TITLE);

// Экспортируем для использования в других модулях
export { renderer, camera, scene };
