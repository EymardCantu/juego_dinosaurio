import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';

const scene = new THREE.Scene();
// Cámara 
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraOffset = new THREE.Vector3(0, 1.75, -2.5); 

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// fondo
const bgLoader = new THREE.TextureLoader();
bgLoader.load('assets/fondo.jpg', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
}, undefined, (err) => console.error("Error carga fondo:", err));

// deteccion movil 
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const mobileControls = document.getElementById('mobile-controls');

// controles moviles 
if(isMobile()) {
    cameraOffset.set(0, 3, -1.5); // Ajuste cámara móvil
    mobileControls.style.display = 'block'; 
    
    // Mapeo correcto de los IDs de botones a teclas
    const buttonToKey = {
        'm-up': 'ArrowUp',
        'm-down': 'ArrowDown',
        'm-left': 'ArrowLeft',
        'm-right': 'ArrowRight'
    };
    
    // Agregar eventos touch a cada botón
    Object.keys(buttonToKey).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            // Evento para cuando se presiona
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); 
                keys[buttonToKey[btnId]] = true;
            });
            
            // Evento para cuando se suelta
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                keys[buttonToKey[btnId]] = false;
            });
            
            // Evitar que el evento se propague fuera del botón
            btn.addEventListener('touchmove', (e) => {
                e.preventDefault();
            });
        }
    });
}

// juego
let gameTime = 60, gameActive = false, score = 0;
let meteoriteLightIntensity = 0.1, maxLightIntensity = 9.0;

// UI 
const uiContainer = document.createElement('div');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '60%';
uiContainer.style.left = '15%';
uiContainer.style.transform = 'translate(-50%, -50%)';
uiContainer.style.color = 'white';
uiContainer.style.background = 'rgba(0, 0, 0, 0.7)';
uiContainer.style.padding = '10px';
uiContainer.style.borderRadius = '5px';
uiContainer.style.zIndex = '100';
document.body.appendChild(uiContainer);

// Elementos UI 
const timerDisplay = document.createElement('div');
timerDisplay.style.fontSize = '24px';
timerDisplay.style.fontWeight = 'bold';
timerDisplay.style.marginBottom = '10px';
timerDisplay.textContent = `Tiempo: ${gameTime}s`;
uiContainer.appendChild(timerDisplay);

const scoreDisplay = document.createElement('div');
scoreDisplay.style.fontSize = '20px';
scoreDisplay.textContent = `Carne: ${score}`;
uiContainer.appendChild(scoreDisplay);

const startButton = document.createElement('button');
startButton.textContent = 'Iniciar juego';
startButton.style.padding = '10px 20px';
startButton.style.fontSize = '18px';
startButton.style.borderRadius = '5px';
startButton.style.cursor = 'pointer';
startButton.style.backgroundColor = '#4CAF50';
startButton.style.border = 'none';
startButton.style.color = 'white';
startButton.style.marginTop = '10px';
startButton.style.display = 'block';
uiContainer.appendChild(startButton);

const gameOverMessage = document.createElement('div');
gameOverMessage.style.fontSize = '24px';
gameOverMessage.style.fontWeight = 'bold';
gameOverMessage.style.color = 'red';
gameOverMessage.style.marginTop = '10px';
gameOverMessage.textContent = '¡El meteorito ha impactado!';
gameOverMessage.style.display = 'none';
uiContainer.appendChild(gameOverMessage);

// Luces 
const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, meteoriteLightIntensity);
directionalLight.position.set(0, 15, 0);
scene.add(directionalLight);

// Texturas
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('assets/pasto.jpg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
});

const meatTexture = textureLoader.load('assets/carne.jpg');

// Suelo 
const simplex = new SimplexNoise();
const floorGeometry = new THREE.PlaneGeometry(150,150,10,10);
const pos = floorGeometry.attributes.position;

for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    const frequency = 0.1;
    const amplitude = 3;
    const z = simplex.noise(x*frequency, y*frequency) * amplitude;
    pos.setZ(i, z);
}
pos.needsUpdate = true;
floorGeometry.computeVertexNormals();

const floor = new THREE.Mesh(
    floorGeometry,
    new THREE.MeshStandardMaterial({
        map:grassTexture,
        side: THREE.DoubleSide
    })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.15;
scene.add(floor);


// Nuevas dimensiones del área de juego (el doble de grande)
const AREA_WIDTH = 80;  // Anteriormente 40
const AREA_DEPTH = 80;  // Anteriormente 40
const BORDER_HEIGHT = 1;
const BORDER_WIDTH = 0.5;

const borderMaterial = new THREE.MeshStandardMaterial({ 
    transparent: false, 
    opacity: 0, 
    side: THREE.DoubleSide, 
    depthWrite: false
});

const borders = [
    // Norte y Sur (bordes horizontales)
    new THREE.Mesh(
        new THREE.BoxGeometry(AREA_WIDTH + BORDER_WIDTH * 2, BORDER_HEIGHT, BORDER_WIDTH), 
        borderMaterial
    ),
    new THREE.Mesh(
        new THREE.BoxGeometry(AREA_WIDTH + BORDER_WIDTH * 2, BORDER_HEIGHT, BORDER_WIDTH), 
        borderMaterial
    ),
    // Este y Oeste (bordes verticales)
    new THREE.Mesh(
        new THREE.BoxGeometry(BORDER_WIDTH, BORDER_HEIGHT, AREA_DEPTH + BORDER_WIDTH * 2), 
        borderMaterial
    ),
    new THREE.Mesh(
        new THREE.BoxGeometry(BORDER_WIDTH, BORDER_HEIGHT, AREA_DEPTH + BORDER_WIDTH * 2), 
        borderMaterial
    )
];

// Posicionamiento de los bordes
const halfWidth = AREA_WIDTH / 2;
const halfDepth = AREA_DEPTH / 2;

borders[0].position.set(0, BORDER_HEIGHT/2 - 0.25, -halfDepth - BORDER_WIDTH/2); // Norte
borders[1].position.set(0, BORDER_HEIGHT/2 - 0.25, halfDepth + BORDER_WIDTH/2);  // Sur
borders[2].position.set(-halfWidth - BORDER_WIDTH/2, BORDER_HEIGHT/2 - 0.25, 0); // Este
borders[3].position.set(halfWidth + BORDER_WIDTH/2, BORDER_HEIGHT/2 - 0.25, 0);  // Oeste

// Añadir bordes a la escena
//borders.forEach(b => scene.add(b));

// Modelo 
let model, mixer, animations, isModelLoaded = false;
const loader = new GLTFLoader();
loader.load('assets/T-Rex.glb', (gltf) => {
    model = gltf.scene;
    model.scale.set(0.3, 0.3, 0.3);
    scene.add(model);

    if(gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(model);
        animations = gltf.animations;
        const idleAnim = animations.find(a => a.name.toLowerCase().includes('idle')) || animations[0];
        mixer.clipAction(idleAnim).play();
    }

    updateCameraPosition();
    isModelLoaded = true;
}, undefined, (err) => console.error("Error carga modelo:", err));

// Puntos 
const points = [], pointsToRemove = [], maxPoints = 50;
function createPoint() {
    const point = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.3, 0.5),
        new THREE.MeshStandardMaterial({ map: meatTexture })
    );
    
    // Posición X y Z aleatoria
    const x = (Math.random() - 0.5) * 70;
    const z = (Math.random() - 0.5) * 70;
    
    // Calcular altura del terreno en esta posición
    const rayOrigin = new THREE.Vector3(x, 100, z); // Empezamos muy arriba
    raycaster.set(rayOrigin, down);
    const intersects = raycaster.intersectObject(floor);
    
    if (intersects.length > 0) {
        // Posicionar el punto ligeramente sobre el terreno
        point.position.set(x, intersects[0].point.y + 0.2, z);
        scene.add(point);
        points.push(point);
    } else {
        console.warn("No se pudo colocar el punto en esta posición");
    }
}

function initializePoints() {
    points.forEach(p => scene.remove(p));
    points.length = 0;
    for(let i = 0; i < maxPoints; i++) createPoint();
}

// Textura para escombros (deberías tener una textura apropiada)
const debrisTexture = new THREE.TextureLoader().load('assets/debris.jpg');
const debrisMaterial = new THREE.MeshStandardMaterial({ 
    map: debrisTexture,
    roughness: 0.8,
    metalness: 0.2
});

// Geometrías variadas para los escombros
const debrisGeometries = [
    new THREE.BoxGeometry(1.2, 0.8, 1.2),
    new THREE.ConeGeometry(1, 1.5, 5),
    new THREE.CylinderGeometry(0.8, 0.8, 1.2, 6),
    new THREE.DodecahedronGeometry(0.9)
];

// Array para almacenar los escombros
const debrisObstacles = [];
const MAX_DEBRIS = 30; // Cantidad de escombros

function createDebris() {
    const geometry = debrisGeometries[
        Math.floor(Math.random() * debrisGeometries.length)
    ];
    
    const debris = new THREE.Mesh(geometry, debrisMaterial);
    
    // Posición aleatoria (similar a los puntos pero con más margen)
    const x = (Math.random() - 0.5) * 60; // Área ligeramente menor que los puntos
    const z = (Math.random() - 0.5) * 60;
    
    // Calcular altura del terreno
    const rayOrigin = new THREE.Vector3(x, 100, z);
    raycaster.set(rayOrigin, down);
    const intersects = raycaster.intersectObject(floor);
    
    if (intersects.length > 0) {
        // Posicionar el escombro sobre el terreno
        debris.position.set(x, intersects[0].point.y, z);
        
        // Rotación aleatoria para mayor realismo
        debris.rotation.set(
            Math.random() * Math.PI * 0.2,
            Math.random() * Math.PI,
            Math.random() * Math.PI * 0.2
        );
        
        // Escala aleatoria
        const scale = 0.8 + Math.random() * 0.7;
        debris.scale.set(scale, scale, scale);
        
        // Ajustar posición Y según la geometría
        adjustDebrisHeight(debris);
        
        scene.add(debris);
        debrisObstacles.push(debris);
        
        return debris;
    } else {
        console.warn("No se pudo colocar escombro en esta posición");
        return null;
    }
}

function adjustDebrisHeight(debris) {
    // Ajustar la posición Y según el tipo de geometría
    if (debris.geometry instanceof THREE.BoxGeometry) {
        debris.position.y += debris.scale.y * 0.5;
    } else if (debris.geometry instanceof THREE.ConeGeometry) {
        debris.position.y += debris.scale.y * 0.3;
    } else {
        // Para otras geometrías, ajuste genérico
        debris.position.y += debris.scale.y * 0.5;
    }
}

function initializeDebris() {
    let attempts = 0
    // Limpiar escombros existentes
    debrisObstacles.forEach(d => scene.remove(d));
    debrisObstacles.length = 0;
    
    // Crear nuevos escombros
    let created = 0;
    while (created < MAX_DEBRIS) {
        const debris = createDebris();
        if (debris !== null) {
            created++;
        }
        
        // Prevenir bucles infinitos
        if (created < MAX_DEBRIS && attempts > 100) {
            console.warn("No se pudieron crear todos los escombros");
            break;
        }
    }
}

function checkDebrisCollision() {
    if (!model) return false;
    
    // Crear bounding box del jugador
    const playerBox = new THREE.Box3().setFromObject(model);
    
    // Verificar colisión con cada escombro
    for (const debris of debrisObstacles) {
        const debrisBox = new THREE.Box3().setFromObject(debris);
        
        if (playerBox.intersectsBox(debrisBox)) {
            return true; // Hay colisión
        }
    }
    
    return false; // No hay colisiones
}

// Controles 
const keys = { ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false };

window.addEventListener('keydown', (e) => {
    if (gameActive && keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
    if (e.code === 'Space' || e.key === ' ') {
        keys.Space = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
    if (e.code === 'Space' || e.key === ' ') {
        keys.Space = false;
    }
});

// Movimiento 
let isMoving = false, wasMoving = false;
const clock = new THREE.Clock();
let moveSpeed = 0.05, rotationSpeed = 0.02;

//velocidad para móviles
if (isMobile()) {
    moveSpeed = 0.07;
}

let isJumping = false;
let jumpVelocity = 0;
const jumpForce = 0.10; // Fuerza inicial del salto
const gravity = 0.002; // Gravedad más realista

const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const rayOriginOffset = new THREE.Vector3(0, 10, 0); // Origen del rayo por encima del modelo
const tempVec = new THREE.Vector3();
const playerHeightOffset = 1; // Ajusta a la altura de tu modelo

function updateModelMovement() {
    if(!isModelLoaded || !gameActive) return;
    const previousPosition = model.position.clone();
    if (checkDebrisCollision()) {
        // Revertir movimiento si colisiona
        model.position.copy(previousPosition);
    }

    isMoving = keys.ArrowUp || keys.ArrowDown;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion);

    if(keys.ArrowLeft) model.rotateY(rotationSpeed);
    if(keys.ArrowRight) model.rotateY(-rotationSpeed);
    if(keys.ArrowUp) model.position.add(forward.multiplyScalar(moveSpeed));
    if(keys.ArrowDown) model.position.add(forward.multiplyScalar(-moveSpeed));
    
    tempVec.copy(model.position).add(rayOriginOffset);
    raycaster.set(tempVec, down);
    const intersects = raycaster.intersectObject(floor); // Asegúrate de que sea la misma malla del terreno
    
    let terrainY = 0;
    if (intersects.length > 0) {
        terrainY = intersects[0].point.y;
    }
    // Lógica de salto mejorada
    const grounded = Math.abs(model.position.y - (terrainY + playerHeightOffset)) < 0.1;
    if (keys.Space && !isJumping && grounded) {
        isJumping = true;
        jumpVelocity = jumpForce; // Aplicamos fuerza inicial
    }
    
    if (isJumping || model.position.y > terrainY) {
        model.position.y += jumpVelocity;
        jumpVelocity -= gravity; // Aplicar gravedad
        
        // Verificar si tocó el suelo
        if (model.position.y <= terrainY + playerHeightOffset) {
            model.position.y = terrainY + playerHeightOffset;
            isJumping = false;
            
        }
    }

    // Límites
    const maxPos = 60;
    model.position.x = Math.max(-maxPos, Math.min(maxPos, model.position.x));
    model.position.z = Math.max(-maxPos, Math.min(maxPos, model.position.z));

    // Animaciones
    if(isMoving !== wasMoving && mixer) {
        mixer.stopAllAction();
        const anim = isMoving ? animations[0] : (animations[4] || animations[0]);
        if(anim) mixer.clipAction(anim).play();
    }
    wasMoving = isMoving;

    updateCameraPosition();
    checkPointCollisions();

    // Actualiza altura según el terreno
    if (intersects.length > 0) {
    const terrainY = intersects[0].point.y;
    
    // Si no está saltando, pegamos al suelo
    if (!isJumping) {
        model.position.y = terrainY + playerHeightOffset;
        } else if (model.position.y < terrainY + playerHeightOffset) {
            // Durante el salto, prevenir que atraviese el suelo en terrenos elevados
            model.position.y = terrainY + playerHeightOffset;
            isJumping = false;
            jumpVelocity = 0;
        }
    }
}

function checkPointCollisions() {
    if(!isModelLoaded || !gameActive) return;

    points.forEach(point => {
        if(point.position.distanceTo(model.position) < 0.9) {
            pointsToRemove.push(point);
            score++;
            scoreDisplay.textContent = `Carne: ${score}`;
        }
    });

    pointsToRemove.forEach(point => {
        scene.remove(point);
        points.splice(points.indexOf(point), 1);
        createPoint();
    });
    pointsToRemove.length = 0;
}

function updateCameraPosition() {
    if(!isModelLoaded) return;
    camera.position.copy(model.position).add(cameraOffset.clone().applyQuaternion(model.quaternion));
    camera.lookAt(model.position);
}

// Temporizador 
let timerInterval;
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if(!gameActive) return;
        
        gameTime--;
        timerDisplay.textContent = `Tiempo: ${gameTime}s`;
        
        const progress = 1 - gameTime / 60;
        meteoriteLightIntensity = 0.1 + (maxLightIntensity - 0.2) * progress;
        directionalLight.intensity = meteoriteLightIntensity;
        directionalLight.color.setRGB(1, 1 - progress * 0.7, 1 - progress * 0.9);
        
        if(gameTime <= 0) endGame();
    }, 1000);
}

// Audio 
let runwayMusic = new Audio('assets/musica.mp3');
runwayMusic.loop = true;
runwayMusic.volume = 0.5;

// reproducir audio en interacción móvil
document.addEventListener('touchstart', () => {
    if (runwayMusic && !runwayMusic.playing) {
        runwayMusic.play().catch(e => console.log('Error reproduciendo audio: ', e));
    }
}, { once: true });

// Game flow 
function startGame() {
    gameTime = 60;
    gameActive = true;
    score = 0;
    meteoriteLightIntensity = 0.2;
    directionalLight.intensity = meteoriteLightIntensity;
    
    timerDisplay.textContent = `Tiempo: ${gameTime}s`;
    scoreDisplay.textContent = `Carne: ${score}`;
    gameOverMessage.style.display = 'none';
    startButton.style.display = 'none';
    
    if(isModelLoaded) model.position.set(0, 0, 0);
    initializePoints();
    startTimer();
    initializeDebris(); // Para los escombros
    runwayMusic.currentTime = 0;
    runwayMusic.play().catch(e => console.log('Error reproduciendo audio: ', e));
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    gameOverMessage.style.display = 'block';
    startButton.textContent = 'Jugar de nuevo';
    startButton.style.display = 'block';
    runwayMusic.pause();
}

startButton.addEventListener('click', startGame);

startButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startGame();
});

// Animación
function animate() {
    requestAnimationFrame(animate);
    
    if(mixer) mixer.update(clock.getDelta());
    updateModelMovement();
    
    if(gameActive && gameTime < 15 && isModelLoaded) {
        const shake = 0.05 * (1 - gameTime / 15);
        camera.position.x += (Math.random() - 0.7) * shake;
        camera.position.y += (Math.random() - 0.7) * shake;
        camera.position.z += (Math.random() - 0.7) * shake;
    }
    renderer.render(scene, camera);
}

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

//  UI para dispositivos móviles
if (isMobile()) {
    uiContainer.style.top = '30%'; 
    uiContainer.style.left = '50%'; 
    
    
    if (window.innerHeight < 600) {
        uiContainer.style.transform = 'scale(0.8) translate(-60%, -60%)';
    }
}

// Iniciar
animate();
startButton.style.display = 'block';