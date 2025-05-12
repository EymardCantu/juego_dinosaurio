// Configuración básica de Three.js
const scene = new THREE.Scene();

// Cambiar a cámara de perspectiva para ver la profundidad
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Temporizador y estado del juego
let gameTime = 60; // Tiempo en segundos
let gameActive = false;
let meteoriteLightIntensity = 0.1; // Intensidad inicial
const maxLightIntensity = 9.0; // Intensidad máxima cuando el meteorito está cerca de impactar
let score = 0;

// Crear elementos de UI
// Ajuste del contenedor de UI para centrarlo en pantalla
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


// Elemento para mostrar el tiempo
const timerDisplay = document.createElement('div');
timerDisplay.style.fontSize = '24px';
timerDisplay.style.fontWeight = 'bold';
timerDisplay.style.marginBottom = '10px';
timerDisplay.textContent = `Tiempo: ${gameTime}s`;
uiContainer.appendChild(timerDisplay);

// Elemento para mostrar el score
const scoreDisplay = document.createElement('div');
scoreDisplay.style.fontSize = '20px';
scoreDisplay.textContent = `Carne: ${score}`;
uiContainer.appendChild(scoreDisplay);

// Botón para iniciar/reiniciar el juego
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

// Mensaje de game over
const gameOverMessage = document.createElement('div');
gameOverMessage.style.fontSize = '24px';
gameOverMessage.style.fontWeight = 'bold';
gameOverMessage.style.color = 'red';
gameOverMessage.style.marginTop = '10px';
gameOverMessage.textContent = '¡El meteorito ha impactado!';
gameOverMessage.style.display = 'none';
uiContainer.appendChild(gameOverMessage);

// Agregar luz para que se aprecie mejor el 3D
const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, meteoriteLightIntensity);
directionalLight.position.set(0, 15, 0);
scene.add(directionalLight);

// Cargar texturas
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('pasto.jpg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10); // Repetir la textura para mejor apariencia
});

const meatTexture = textureLoader.load('carne.jpg');

// Crear el suelo con textura
const floorGeometry = new THREE.PlaneGeometry(40, 40);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    map: grassTexture,
    side: THREE.DoubleSide 
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / 2; // Rotar para que sea horizontal
floor.position.y = -0.15; // Ajustar para que el modelo esté sobre el suelo
scene.add(floor);

// Crear bordes para el suelo
const borderHeight = 100;
const borderWidth = 0.5;

const borderMaterial = new THREE.MeshStandardMaterial({ 
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide, 
    depthWrite: false,      
    color: 0xffffff
}); 

// Borde norte
const northBorderGeometry = new THREE.BoxGeometry(40 + borderWidth * 2, borderHeight, borderWidth);
const northBorder = new THREE.Mesh(northBorderGeometry, borderMaterial);
northBorder.position.set(0, borderHeight / 2 - 0.25, -20 - borderWidth / 2);
scene.add(northBorder);

// Borde sur
const southBorderGeometry = new THREE.BoxGeometry(40 + borderWidth * 2, borderHeight, borderWidth);
const southBorder = new THREE.Mesh(southBorderGeometry, borderMaterial);
southBorder.position.set(0, borderHeight / 2 - 0.25, 20 + borderWidth / 2);
scene.add(southBorder);

// Borde este
const eastBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, 40 + borderWidth * 2);
const eastBorder = new THREE.Mesh(eastBorderGeometry, borderMaterial);
eastBorder.position.set(-20 - borderWidth / 2, borderHeight / 2 - 0.25, 0);
scene.add(eastBorder);

// Borde oeste
const westBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, 40 + borderWidth * 2);
const westBorder = new THREE.Mesh(westBorderGeometry, borderMaterial);
westBorder.position.set(20 + borderWidth / 2, borderHeight / 2 - 0.25, 0);
scene.add(westBorder);

// Variables globales para el modelo
let model;
let isModelLoaded = false;

// Variables para animación
let mixer;
let animations = [];
let currentAnimation = 0;
let isMoving = false;
let wasMoving = false;
const clock = new THREE.Clock();

const background = new THREE.TextureLoader();
const texture = background.load(
  'fondo.jpg',
  () => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
  });

// Variables de control de cámara y movimiento
const cameraOffset = new THREE.Vector3(0, 2, -2); // Offset de la cámara
const moveSpeed = 0.05;
const rotationSpeed = 0.02;
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Array para almacenar los puntos
const points = [];
const pointsToRemove = [];
const maxPoints = 50; // Cantidad máxima de puntos

function createPoint() {
    const pointGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const pointMaterial = new THREE.MeshStandardMaterial({ 
        map: meatTexture
    });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    
    // Posiciones aleatorias dentro de un rango seguro (dentro de los bordes)
    point.position.x = (Math.random() - 0.5) * 36; // Dejamos un margen de 2 unidades desde el borde
    point.position.y = 0; // Misma altura que el suelo
    point.position.z = (Math.random() - 0.5) * 36; // Dejamos un margen de 2 unidades desde el borde
    
    scene.add(point);
    points.push(point);
}

// Inicializar puntos
function initializePoints() {
    // Limpiar puntos existentes
    points.forEach(point => {
        scene.remove(point);
    });
    points.length = 0;
    
    // Crear nuevos puntos
    for (let i = 0; i < maxPoints; i++) {
        createPoint();
    }
}

// Función para iniciar el juego
function startGame() {
    gameTime = 60;
    gameActive = true;
    meteoriteLightIntensity = 0.2;
    directionalLight.intensity = meteoriteLightIntensity;
    score = 0;
    
    // Actualizar UI
    timerDisplay.textContent = `Tiempo: ${gameTime}s`;
    scoreDisplay.textContent = `Carne: ${score}`;
    gameOverMessage.style.display = 'none';
    startButton.style.display = 'none';
    
    // Reiniciar posición del modelo
    if (isModelLoaded) {
        model.position.set(0, 0, 0);
        updateCameraPosition();
    }
    
    // Inicializar puntos
    initializePoints();
    
    // Iniciar contador de tiempo
    startTimer();
    
    // Iniciar música si existe
    if (runwayMusic) {
        runwayMusic.currentTime = 0;
        runwayMusic.play();
    }
}

// Función para el temporizador
let timerInterval;
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameActive) {
            gameTime--;
            timerDisplay.textContent = `Tiempo: ${gameTime}s`;
            
            // Incrementar intensidad de luz conforme se acerca el fin
            const progress = 1 - gameTime / 60; // 0 al inicio, 1 al final
            meteoriteLightIntensity = 0.1 + (maxLightIntensity - 0.2) * progress;
            directionalLight.intensity = meteoriteLightIntensity;
            
            // Cambiar color de la luz a más rojo conforme avanza el tiempo
            const redFactor = Math.min(1.5, progress * 2); // 0 al inicio, 1 a la mitad del tiempo
            directionalLight.color.setRGB(1, 1 - redFactor * 0.7, 1 - redFactor * 0.9);
            
            // Verificar si el tiempo terminó
            if (gameTime <= 0) {
                endGame();
            }
        }
    }, 1000);
}

// Función para terminar el juego
function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    
    // Mostrar mensaje de game over
    gameOverMessage.style.display = 'block';
    startButton.textContent = 'Jugar de nuevo';
    startButton.style.display = 'block';
    
    // Detener música si existe
    if (runwayMusic) {
        runwayMusic.pause();
    }
}

// Cargar modelo GLB con animaciones
const loader = new THREE.GLTFLoader();
loader.load(
    'T-Rex.glb', // Reemplaza con la ruta a tu modelo GLB
    (gltf) => {
        model = gltf.scene;
        
        // Ajustar escala y posición del modelo
        model.scale.set(0.3, 0.3, 0.3); // Ajusta según sea necesario
        model.position.set(0, 0, 0);
        
        scene.add(model);
        
        // Configurar animaciones si existen
        if (gltf.animations && gltf.animations.length > 0) {
            animations = gltf.animations;
            mixer = new THREE.AnimationMixer(model);
            
            // Iniciar con animación idle si existe, o la primera disponible
            const idleAnimation = animations.find(anim => 
                anim.name.toLowerCase().includes('idle') || 
                anim.name.toLowerCase().includes('reposo')
            ) || animations[0];
            
            const action = mixer.clipAction(idleAnimation);
            action.play();
        }
        
        // Configurar cámara inicial
        updateCameraPosition();
        
        isModelLoaded = true;
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% cargado');
    },
    (error) => {
        console.error('Error al cargar el modelo', error);
    }
);

// Función para cambiar a la siguiente animación
function nextAnimation() {
    if (!mixer || animations.length === 0) return;
    
    // Detener la animación actual
    mixer.stopAllAction();
    
    // Cambiar a la siguiente animación
    currentAnimation = (currentAnimation + 1) % animations.length;
    
    // Reproducir la nueva animación
    const action = mixer.clipAction(animations[currentAnimation]);
    action.play();
    
    //console.log(`Reproduciendo animación: ${animations[currentAnimation].name}`);
}

// Función para seleccionar una animación específica por tipo
function playAnimation(type) {
    if (!mixer || animations.length === 0) return;
    
    // Buscar una animación que coincida con el tipo solicitado
    const animationMatch = animations.find(anim => 
        anim.name.toLowerCase().includes(type.toLowerCase())
    );
    
    // Si no se encuentra, usar la primera animación
    if (!animationMatch) return;
    
    // Detener animaciones actuales
    mixer.stopAllAction();
    
    // Reproducir la animación solicitada
    const action = mixer.clipAction(animationMatch);
    action.play();
}

// Event listeners para teclas
window.addEventListener('keydown', (e) => {
    if (gameActive && keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// Función para verificar colisiones con los bordes
function checkBorderCollisions() {
    if (!isModelLoaded) return;
    
    // Límites del área de juego (dejando un pequeño margen)
    const maxX = 19.5;
    const maxZ = 19.5;
    
    // Restricciones de posición
    if (model.position.x > maxX) model.position.x = maxX;
    if (model.position.x < -maxX) model.position.x = -maxX;
    if (model.position.z > maxZ) model.position.z = maxZ;
    if (model.position.z < -maxZ) model.position.z = -maxZ;
}

// Función para actualizar la posición y rotación del modelo
function updateModelMovement() {
    if (!isModelLoaded || !gameActive) return;

    // Variable para detectar si el modelo está en movimiento
    isMoving = keys.ArrowUp || keys.ArrowDown;

    // Guardar la dirección actual del modelo
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(model.quaternion);

    // Rotación
    if (keys.ArrowLeft) {
        model.rotateY(rotationSpeed);
    }
    if (keys.ArrowRight) {
        model.rotateY(-rotationSpeed);
    }

    // Guardar la posición anterior para poder revertir en caso de colisión
    const previousPosition = model.position.clone();

    // Movimiento basado en la orientación del modelo
    if (keys.ArrowUp) {
        // Mover hacia adelante en la dirección que el modelo está mirando
        model.position.add(forward.multiplyScalar(moveSpeed));
    }
    if (keys.ArrowDown) {
        // Mover hacia atrás en la dirección opuesta
        model.position.add(forward.multiplyScalar(-moveSpeed));
    }
    
    // Verificar colisiones con los bordes y ajustar posición si es necesario
    checkBorderCollisions();
    
    // Cambiar animación basada en el movimiento
    if (isMoving !== wasMoving && mixer && animations.length > 0) {
        if (isMoving) {
            // Si comenzamos a movernos, buscar animación de caminar/correr
            const walkAnimation = animations[0]
            
            if (walkAnimation) {
                mixer.stopAllAction();
                const action = mixer.clipAction(walkAnimation);
                action.play();
            }
        } else {
            // Si dejamos de movernos, buscar animación de idle
            const idleAnimation = animations[4]
            
            if (idleAnimation) {
                mixer.stopAllAction();
                const action = mixer.clipAction(idleAnimation);
                action.play();
            }
        }
    }
    
    // Guardar el estado actual para la próxima comparación
    wasMoving = isMoving;
    
    // Actualizar posición de la cámara
    updateCameraPosition();
    
    // Verificar colisiones con los puntos
    checkPointCollisions();
}

// Crear un elemento de audio
let runwayMusic;
// Función para precargar y configurar el audio
function setupAudio() {
  runwayMusic = new Audio();
  
  // Evento para manejar cuando el audio está listo
  runwayMusic.addEventListener('canplaythrough', () => {
  });
  
  // Evento para manejar errores de audio
  runwayMusic.addEventListener('error', (e) => {
    console.error('Error al cargar el audio:', e);
  });
  
  runwayMusic.src = 'musica.mp3';
  runwayMusic.loop = true;
  runwayMusic.volume = 0.5;
  
  // Precarga el audio
  runwayMusic.load();
}

// Llamar a la función para configurar el audio
setupAudio();

// Función para actualizar la posición de la cámara
function updateCameraPosition() {
    if (!isModelLoaded) return;

    // Calcular la posición de la cámara con el offset
    const cameraDirection = cameraOffset.clone();
    cameraDirection.applyQuaternion(model.quaternion);
    
    // Establecer la posición de la cámara
    camera.position.copy(model.position).add(cameraDirection);
    
    // Hacer que la cámara mire al modelo
    camera.lookAt(model.position);
}

// Función para verificar colisiones con los puntos
function checkPointCollisions() {
    if (!isModelLoaded || !gameActive) return;

    // Distancia mínima para considerar una colisión
    const collisionDistance = 0.4;
    
    // Verificar cada punto
    points.forEach(point => {
        const distance = point.position.distanceTo(model.position);
        
        // Si el modelo está lo suficientemente cerca del punto
        if (distance < collisionDistance) {
            // Marcar para eliminación
            pointsToRemove.push(point);
            
            // Incrementar score
            score++;
            scoreDisplay.textContent = `Carne: ${score}`;
        }
    });
    
    // Eliminar los puntos marcados
    pointsToRemove.forEach(point => {
        const index = points.indexOf(point);
        if (index > -1) {
            points.splice(index, 1);
            scene.remove(point);
            
            // Crear un nuevo punto para mantener siempre la misma cantidad
            createPoint();
        }
    });
    
    // Limpiar array de puntos a eliminar
    pointsToRemove.length = 0;
}

// Agregar evento al botón de inicio
startButton.addEventListener('click', startGame);

// Animación
function animate() {
    requestAnimationFrame(animate);
    
    // Actualizar el mixer de animaciones si existe
    if (mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }
    
    // Actualizar movimiento basado en teclas presionadas
    updateModelMovement();
    
    // Efecto de meteorito: temblor de cámara cuando queda poco tiempo
    if (gameActive && gameTime < 15) {
        // Calcular intensidad del temblor basado en tiempo restante
        const shakeIntensity = 0.05 * (1 - gameTime / 15);
        
        // Aplicar un pequeño temblor a la cámara
        if (isModelLoaded) {
            camera.position.x += (Math.random() - 0.7) * shakeIntensity;
            camera.position.y += (Math.random() - 0.7) * shakeIntensity;
            camera.position.z += (Math.random() - 0.7) * shakeIntensity;
        }
    }
    
    renderer.render(scene, camera);
}

// Ajustar el tamaño del renderizador cuando cambia la ventana
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
});

// Iniciar animación
animate();

// Iniciar con el botón de inicio visible
startButton.style.display = 'block';