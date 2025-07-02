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
                'm-right': 'ArrowRight',
                'm-jump': 'Space'
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

        // Texturas para rocas
        const rock1Texture = textureLoader.load('roca1.jpg');
        const rock2Texture = textureLoader.load('roca2.png');

        //Texturas para las carnes
        const meatTexture = textureLoader.load('carne.jpg');
        const badMeatTexture = textureLoader.load('carneP.png');
        const goodMeatTexture = textureLoader.load('carneB.png');

        // Suelo con relieve
        const floorGeometry = new THREE.PlaneGeometry(40, 40, 32, 32);
        
        // Crear relieve más pronunciado en el suelo
        const vertices = floorGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] = Math.random() * 1.2; // Altura aleatoria
        }
        floorGeometry.attributes.position.needsUpdate = true;
        floorGeometry.computeVertexNormals();
        
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            map: grassTexture,
            side: THREE.DoubleSide 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = Math.PI / 2;
        floor.position.y = -0.15;
        scene.add(floor);

        //Función para obtener altura del terreno mejorada
        function getTerrainHeight(x, z) {
            const terrainX = (x + 20) / 40 * 32;
            const terrainZ = (z + 20) / 40 * 32;
            
            const xi = Math.floor(terrainX);
            const zi = Math.floor(terrainZ);
            
            if (xi < 0 || xi >= 31 || zi < 0 || zi >= 31) return -0.15;
            
            const getVertexHeight = (x, z) => {
                const index = (z * 33 + x) * 3 + 2;
                return vertices[index] || 0;
            };
            
            const h00 = getVertexHeight(xi, zi);
            const h10 = getVertexHeight(xi + 1, zi);
            const h01 = getVertexHeight(xi, zi + 1);
            const h11 = getVertexHeight(xi + 1, zi + 1);
            
            const fx = terrainX - xi;
            const fz = terrainZ - zi;
            
            const h0 = h00 * (1 - fx) + h10 * fx;
            const h1 = h01 * (1 - fx) + h11 * fx;
            
            return h0 * (1 - fz) + h1 * fz - 0.15;
        }

        //Rocas decorativas
        const rocks = [];
        function createRocks() {
            const rockCount = 15;
            for(let i = 0; i < rockCount; i++) {
                // Crear geometría de roca más irregular usando esfera deformada
                const rockGeometry = new THREE.SphereGeometry(
                    Math.random() * 0.8 + 0.4,
                    8 + Math.floor(Math.random() * 8),
                    6 + Math.floor(Math.random() * 6)
                );
                
                // Deformar la esfera para hacerla irregular
                const positions = rockGeometry.attributes.position;
                for (let j = 0; j < positions.count; j++) {
                    const vertex = new THREE.Vector3();
                    vertex.fromBufferAttribute(positions, j);
                    
                    const noise = Math.random() * 0.3 + 0.7;
                    vertex.multiplyScalar(noise);
                    
                    positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
                }
                positions.needsUpdate = true;
                rockGeometry.computeVertexNormals();
                
                const rockMaterial = new THREE.MeshStandardMaterial({
                    map: Math.random() > 0.5 ? rock1Texture : rock2Texture
                });
                
                const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                
                const posX = (Math.random() - 0.5) * 35;
                const posZ = (Math.random() - 0.5) * 35;
                const terrainHeight = getTerrainHeight(posX, posZ);
                
                // Calcular el radio de la roca y ajustar posición
                const rockRadius = rock.geometry.boundingSphere ? rock.geometry.boundingSphere.radius : 0.5;
                const scale = Math.random() * 0.8 + 0.6;
                rock.scale.set(scale, scale, scale);
                
                // Adherir completamente al suelo
                rock.position.set(posX, terrainHeight + (rockRadius * scale * 0.3), posZ);
                rock.rotation.y = Math.random() * Math.PI * 2;
                
                scene.add(rock);
                rocks.push(rock);
            }
        }
        createRocks();

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
        let isJumping = false, jumpVelocity = 0, jumpHeight = 0;
        const gravity = -0.01, jumpPower = 0.3;
        
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

        //Sistema de puntos mejorado con 3 tipos de carne y efectos de brillo
        const points = [], pointsToRemove = [], maxPoints = 50;
        const specialPoints = [], specialPointsToRemove = [];
        let lastSpecialSpawn = 0;

        const MEAT_TYPES = {
            NORMAL: 'normal',
            BAD: 'bad',
            GOOD: 'good'
        };

        function createPoint(type = MEAT_TYPES.NORMAL) {
            let texture, material, isSpecial = false;
            
            switch(type) {
                case MEAT_TYPES.BAD:
                    texture = badMeatTexture;
                    material = new THREE.MeshStandardMaterial({ 
                        map: texture,
                        emissive: 0xff0000,  // Brillo rojo más intenso
                        emissiveIntensity: 0.20,  //Intensidad mayor
                        transparent: true,
                        opacity: 0.9
                    });
                    isSpecial = true;
                    break;
                case MEAT_TYPES.GOOD:
                    texture = goodMeatTexture;
                    material = new THREE.MeshStandardMaterial({ 
                        map: texture,
                        emissive: 0x00ff00,  // Brillo verde más intenso
                        emissiveIntensity: 0.20,  // Intensidad mayor
                        transparent: true,
                        opacity: 0.9
                    });
                    isSpecial = true;
                    break;
                default:
                    texture = meatTexture;
                    material = new THREE.MeshStandardMaterial({ map: texture });
            }
            
            const point = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.1, 0.5),
                material
            );
            
            const posX = (Math.random() - 0.5) * 36;
            const posZ = (Math.random() - 0.5) * 36;
            const terrainHeight = getTerrainHeight(posX, posZ);
            
            //Adherir completamente al suelo
            point.position.set(posX, terrainHeight + 0.05, posZ);
            point.userData = { type: type, isSpecial: isSpecial };
            
            if (isSpecial) {
                point.userData.spawnTime = Date.now();
                point.userData.lifetime = 8000 + Math.random() * 7000;
                point.userData.originalEmissiveIntensity = material.emissiveIntensity;
                specialPoints.push(point);
            } else {
                points.push(point);
            }
            
            scene.add(point);
            return point;
        }

        function initializePoints() {
            [...points, ...specialPoints].forEach(p => scene.remove(p));
            points.length = 0;
            specialPoints.length = 0;
            for(let i = 0; i < maxPoints; i++) createPoint();
        }

        // Puntos especiales con efectos de brillo pulsante
        function updateSpecialPoints() {
            const currentTime = Date.now();
            
            //Spawn de carnes especiales
            if (currentTime - lastSpecialSpawn > 3000 + Math.random() * 5000) {
                if (Math.random() < 0.6) { // Probabilidad de spawn
                    const type = Math.random() < 0.5 ? MEAT_TYPES.BAD : MEAT_TYPES.GOOD;
                    createPoint(type);
                    lastSpecialSpawn = currentTime;
                }
            }
            
            specialPoints.forEach(point => {
                // Efecto de brillo pulsante
                const pulseSpeed = 0.010;
                const pulseIntensity = Math.sin(currentTime * pulseSpeed) * 0.3 + 0.7;
                point.material.emissiveIntensity = point.userData.originalEmissiveIntensity * pulseIntensity;
                
                if (currentTime - point.userData.spawnTime > point.userData.lifetime) {
                    specialPointsToRemove.push(point);
                } else {
                    const timeLeft = point.userData.lifetime - (currentTime - point.userData.spawnTime);
                    if (timeLeft < 3000) {
                        // Parpadeo más visible cuando está por desaparecer
                        const blinkSpeed = 0.02;
                        const opacity = Math.sin(currentTime * blinkSpeed) * 0.4 + 0.6;
                        point.material.opacity = opacity;
                        point.material.transparent = true;
                    }
                }
            });
            
            specialPointsToRemove.forEach(point => {
                scene.remove(point);
                specialPoints.splice(specialPoints.indexOf(point), 1);
            });
            specialPointsToRemove.length = 0;
        }

        // Controles 
        const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };
        window.addEventListener('keydown', (e) => {
            if (keys.hasOwnProperty(e.code)) {
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

        //Movimiento del modelo para seguir el terreno
        function updateModelMovement() {
            if(!isModelLoaded || !gameActive) return;

            // Salto
            if(keys.Space && !isJumping) {
                isJumping = true;
                jumpVelocity = jumpPower;
            }

            if(isJumping) {
                jumpHeight += jumpVelocity;
                jumpVelocity += gravity;
                
                const terrainHeight = getTerrainHeight(model.position.x, model.position.z);
                if(jumpHeight <= 0) {
                    jumpHeight = 0;
                    isJumping = false;
                    jumpVelocity = 0;
                }
                model.position.y = terrainHeight + jumpHeight;
            } else {
                const terrainHeight = getTerrainHeight(model.position.x, model.position.z);
                model.position.y = terrainHeight;
            }

            isMoving = keys.ArrowUp || keys.ArrowDown;
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion);

            // Guardar posición anterior para detectar colisiones
            const prevPosition = model.position.clone();

            if(keys.ArrowLeft) model.rotateY(rotationSpeed);
            if(keys.ArrowRight) model.rotateY(-rotationSpeed);
            if(keys.ArrowUp) model.position.add(forward.multiplyScalar(moveSpeed));
            if(keys.ArrowDown) model.position.add(forward.multiplyScalar(-moveSpeed));

            // Verificar colisiones con rocas
            let collision = false;
            rocks.forEach(rock => {
                const distance = rock.position.distanceTo(model.position);
                if(distance < 1.5) { // Radio de colisión
                    collision = true;
                }
            });

            // Si hay colisión, volver a la posición anterior
            if(collision) {
                model.position.copy(prevPosition);
            } else if (!isJumping) {
                const terrainHeight = getTerrainHeight(model.position.x, model.position.z);
                model.position.y = terrainHeight;
            }

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

        //Detección de colisiones con efectos de tiempo
        function checkPointCollisions() {
            if(!isModelLoaded || !gameActive) return;

            points.forEach(point => {
                if(point.position.distanceTo(model.position) < 0.6) {
                    pointsToRemove.push(point);
                    score++;
                    scoreDisplay.textContent = `Carne: ${score}`;
                }
            });

            specialPoints.forEach(point => {
                if(point.position.distanceTo(model.position) < 0.6) {
                    specialPointsToRemove.push(point);
                    
                    switch(point.userData.type) {
                        case MEAT_TYPES.BAD:
                            gameTime = Math.max(0, gameTime - 5);
                            timerDisplay.style.color = 'red';
                            setTimeout(() => timerDisplay.style.color = 'white', 1000);
                            break;
                        case MEAT_TYPES.GOOD:
                            gameTime = Math.min(60, gameTime + 8);
                            timerDisplay.style.color = 'green';
                            setTimeout(() => timerDisplay.style.color = 'white', 1000);
                            break;
                    }
                    timerDisplay.textContent = `Tiempo: ${gameTime}s`;
                }
            });

            pointsToRemove.forEach(point => {
                scene.remove(point);
                points.splice(points.indexOf(point), 1);
                createPoint();
            });
            pointsToRemove.length = 0;
            
            specialPointsToRemove.forEach(point => {
                scene.remove(point);
                specialPoints.splice(specialPoints.indexOf(point), 1);
            });
            specialPointsToRemove.length = 0;
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
            lastSpecialSpawn = Date.now(); 
            
            timerDisplay.textContent = `Tiempo: ${gameTime}s`;
            timerDisplay.style.color = 'white'; 
            scoreDisplay.textContent = `Carne: ${score}`;
            gameOverMessage.style.display = 'none';
            startButton.style.display = 'none';
            
            if(isModelLoaded) {
                model.position.set(0, getTerrainHeight(0, 0), 0);
                jumpHeight = 0;
                isJumping = false;
                jumpVelocity = 0;
            }
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

        //Animación con actualización de puntos especiales
        function animate() {
            requestAnimationFrame(animate);
            
            if(mixer) mixer.update(clock.getDelta());
            updateModelMovement();
            
            if(gameActive) {
                updateSpecialPoints(); 
                
                if(gameTime < 15 && isModelLoaded) {
                    const shake = 0.05 * (1 - gameTime / 15);
                    camera.position.x += (Math.random() - 0.7) * shake;
                    camera.position.y += (Math.random() - 0.7) * shake;
                    camera.position.z += (Math.random() - 0.7) * shake;
                }
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