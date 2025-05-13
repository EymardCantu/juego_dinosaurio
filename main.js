const scene = new THREE.Scene();

// Cámara 
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraOffset = new THREE.Vector3(0, 2, -2); 

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// fondo
const bgLoader = new THREE.TextureLoader();
bgLoader.load('fondo.jpg', (texture) => {
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
const grassTexture = textureLoader.load('pasto.jpg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
});

const meatTexture = textureLoader.load('carne.jpg');

// Suelo 
const floorGeometry = new THREE.PlaneGeometry(40, 40);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    map: grassTexture,
    side: THREE.DoubleSide 
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / 2;
floor.position.y = -0.15;
scene.add(floor);

// Bordes 
const borderHeight = 100, borderWidth = 0.5;
const borderMaterial = new THREE.MeshStandardMaterial({ 
    transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
});

const borders = [
    new THREE.Mesh(new THREE.BoxGeometry(40 + borderWidth * 2, borderHeight, borderWidth), borderMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(40 + borderWidth * 2, borderHeight, borderWidth), borderMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(borderWidth, borderHeight, 40 + borderWidth * 2), borderMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(borderWidth, borderHeight, 40 + borderWidth * 2), borderMaterial)
];
borders[0].position.set(0, borderHeight/2 - 0.25, -20 - borderWidth/2); // Norte
borders[1].position.set(0, borderHeight/2 - 0.25, 20 + borderWidth/2);  // Sur
borders[2].position.set(-20 - borderWidth/2, borderHeight/2 - 0.25, 0); // Este
borders[3].position.set(20 + borderWidth/2, borderHeight/2 - 0.25, 0);  // Oeste
borders.forEach(b => scene.add(b));

// Modelo 
let model, mixer, animations, isModelLoaded = false;
const loader = new THREE.GLTFLoader();
loader.load('T-Rex.glb', (gltf) => {
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
        new THREE.BoxGeometry(0.5, 0.1, 0.5),
        new THREE.MeshStandardMaterial({ map: meatTexture })
    );
    point.position.set(
        (Math.random() - 0.5) * 36,
        0,
        (Math.random() - 0.5) * 36
    );
    scene.add(point);
    points.push(point);
}

function initializePoints() {
    points.forEach(p => scene.remove(p));
    points.length = 0;
    for(let i = 0; i < maxPoints; i++) createPoint();
}

// Controles 
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', (e) => {
    if (gameActive && keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
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

function updateModelMovement() {
    if(!isModelLoaded || !gameActive) return;

    isMoving = keys.ArrowUp || keys.ArrowDown;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion);

    if(keys.ArrowLeft) model.rotateY(rotationSpeed);
    if(keys.ArrowRight) model.rotateY(-rotationSpeed);
    if(keys.ArrowUp) model.position.add(forward.multiplyScalar(moveSpeed));
    if(keys.ArrowDown) model.position.add(forward.multiplyScalar(-moveSpeed));

    // Límites
    const maxPos = 19.5;
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
}

function checkPointCollisions() {
    if(!isModelLoaded || !gameActive) return;

    points.forEach(point => {
        if(point.position.distanceTo(model.position) < 0.4) {
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
let runwayMusic = new Audio('musica.mp3');
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