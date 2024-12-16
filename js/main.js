let camera, scene, renderer, ball, terrain, guideLine, hole, water, sand;
let score = 0; // Initialize the score
let scoreCanvas, scoreContext, scoreTexture, scorePlane;
let multi = 1;
const ballRadius = 0.25;
const numberOfWaters = 5;
const numberOfSands = 5;
const cameraSpeed = 0.05;
const startCoords = { x: -terrainWidth/2 + 5, y: 10, z: 0 };
const WATER_RESET = true;
// object arrays
const bumpers = [];
const boosters = [];

const softColorShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
    fragmentShader: `
            varying vec2 vUv;

            uniform vec3 baseColor;
            uniform vec3 lightDirection;
            uniform float lightIntensity;

            void main() {
            // Simple lighting model
            float dotProduct = dot(normalize(lightDirection), normalize(vec3(vUv, 0.0)));
            float diffuse = max(dotProduct, 0.0);

            // Pastel color with lighting
            vec3 finalColor = baseColor * (1.0 + diffuse * lightIntensity);

            gl_FragColor = vec4(finalColor, 1.0);
            }
            `,
    uniforms: {
        baseColor: { value: new THREE.Color(0xCAF481) },
        lightDirection: { value: new THREE.Vector3(9, 4, 5) },
        lightIntensity: { value: 0.3 }
    },
    side: THREE.DoubleSide,
});

import { createTerrainMesh, terrainPoints, terrainWidth,minTerrainHeight } from './terrain.js';
import { applyPhysics, velocity} from './physics.js';
import { generateWater} from './water.js';
import { uniforms } from './water.js';
import { generateSand,sandPoints} from './sand.js';
import { onMouseWheel, onWindowResize, onMouseDown, onMouseMove, onMouseUp, onMouseClick} from './controls.js';

export { terrain, ball, ballRadius, camera, guideLine};

init();
render();

function init() {
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(-10 * aspect, 10 * aspect, 10, -10, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    addObjects();

    // Event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onMouseWheel);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick);

    createScoreDisplay();
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);

    followBall();
    applyPhysics();

    holeCollision();
    checkCollisionsWithWater();
    uniforms.time.value += 0.07;

    checkBoosterCollision(ball, velocity);
    checkBumperCollision(ball, velocity);
    //checkPortalCollision(ball, portal);
    //checkSandCollision(ball,sandpit,velocity);
}

function addObjects(){
    // Ball
    const ballGeometry = new THREE.CircleGeometry(ballRadius, 32);
    const ballMaterial = softColorShaderMaterial.clone();
    ballMaterial.uniforms.baseColor.value = new THREE.Color(0xfcb0bb);
    ball = new THREE.Mesh(ballGeometry, ballMaterial); // full ball
    ball.position.set(startCoords.x, startCoords.y,startCoords.z);
    scene.add(ball);

    // Line to represent the pull direction
    const lineMaterial = new THREE.LineBasicMaterial({ color: 'rgb(255,0,0)' }); // Red color for the line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0)
    ]);
    guideLine = new THREE.Line(lineGeometry, lineMaterial);
    // Make the guideline a child of the ball so it moves with the ball
    ball.add(guideLine);
    guideLine.visible = false; // Initially hidden

    // Procedurally generated terrain
    terrain = createTerrainMesh(window.innerHeight);
    scene.add(terrain);

    // Golf hole
    const holeGeometry = new THREE.CircleGeometry(ballRadius*2, 32);
    const holeMaterial = new THREE.MeshBasicMaterial({color: 'rgb(0,0,0)' });
    hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(terrainPoints[terrainPoints.length-10].x, terrainPoints[terrainPoints.length-10].y, 0);
    scene.add(hole);

    // Generate water on the terrain
    water = createWaterShapes(terrainPoints, numberOfWaters);

    // Generate sand on the terrain
    sand = createSandShapes(terrainPoints, numberOfSands);

    //booster = createBooster(terrainPoints[20]);
    //bumper = createBumper(terrainPoints[13]);
   // portal = createPortal(terrainPoints[23], terrainPoints[10]);

}

function holeCollision() {
    const holeRadius = hole.geometry.parameters.radius;
    const distance = ball.position.distanceTo(hole.position);

    // Check if the center of the ball is within the hole's radius
    if (distance <= holeRadius) {
        // Move the ball inside the hole (you can adjust Y position if needed)
        ball.position.set(hole.position.x, hole.position.y-holeRadius/2, 0.001);

        //scene.remove(ball);
        //ball.geometry.dispose();
        //ball.material.dispose();

        console.log("Birdie!");
        // Increment score and update the canvas texture
        score = score + (100 * multi);
        drawScore();
    }
}

// Function to check collisions with all water shapes
function checkCollisionsWithWater() {
    for (const waterMesh of water) {
        // Calculate the bounding box of the water
        const waterBoundingBox = new THREE.Box3().setFromObject(waterMesh);

        // Get the ball's position
        const ballPosition = ball.position;
        // Check if the ball's y-position is below the water's y-position
        if (waterBoundingBox.containsPoint(ballPosition)) {
            if(WATER_RESET){
                ball.position.set(startCoords.x, startCoords.y, startCoords.z);
                velocity.x = 0;
                velocity.y = 0;
            }
            console.log("SPLASH!");
        }
    }
}


export function createBooster(position) {
    const boosterShape = new THREE.Shape();
    boosterShape.moveTo(0.8, 0.2);
    boosterShape.lineTo(0.8, -0.2);
    boosterShape.lineTo(-0.8, -0.2);
    boosterShape.lineTo(-0.8, 0.2);

    const geometry = new THREE.ShapeGeometry(boosterShape);
    const material = softColorShaderMaterial.clone();
    material.uniforms.baseColor.value = new THREE.Color(0x8b32b8);
    const booster = new THREE.Mesh(geometry, material);
    booster.position.set(position.x, position.y, 0);
    scene.add(booster);

    boosters.push(booster);

    return booster;
}

function checkBoosterCollision(ball, velocity) {
    const ballPos = ball.position;
    for (const booster of boosters) {
        const boosterPos = booster.position;

        const withinX = ballPos.x >= boosterPos.x - 0.8 && ballPos.x <= boosterPos.x + 0.8;
        const withinY = ballPos.y >= boosterPos.y - 0.2 && ballPos.y <= boosterPos.y + 0.2;

        if (withinX && withinY) {
            velocity.x += 0.08;
            console.log("Speed boost!");
            multi += 1;
            drawScore();
        }
    }
}

export function createBumper(position) {
    const shape = new THREE.Shape();
    shape.moveTo(0.8, 0.2);
    shape.lineTo(0.8, -0.2);
    shape.lineTo(-0.8, -0.2);
    shape.lineTo(-0.8, 0.2);
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = softColorShaderMaterial.clone();
    material.uniforms.baseColor.value = new THREE.Color(0x4fa7ea);
    const bumper = new THREE.Mesh(geometry, material);
    bumper.position.set(position.x, position.y, 0);
    scene.add(bumper);

    bumpers.push(bumper);

    return bumper;
}

function checkBumperCollision(ball, velocity) {
    const ballPos = ball.position;
    for (const bumper of bumpers) {
        const bumperPos = bumper.position;

        const withinX = ballPos.x >= bumperPos.x - 1 && ballPos.x <= bumperPos.x + 1;
        const withinY = ballPos.y >= bumperPos.y - 1 && ballPos.y <= bumperPos.y + 0.8;

        if (withinX && withinY) {
            velocity.x *= -1.5;
            velocity.y *= -1.5;
            console.log("Bounce!");
            break;
        }
    }
}

function createPortal(entryPosition, exitPosition) {
    const createCircle = (color) => {
        const geometry = new THREE.CircleGeometry(0.5, 32);
        const material = new THREE.MeshBasicMaterial({ color });
        return new THREE.Mesh(geometry, material);
    };

    const entry = createCircle(0xf77036);
    entry.position.set(entryPosition.x, entryPosition.y, 0);
    scene.add(entry);

    const exit = createCircle(0x01b48c);
    exit.position.set(exitPosition.x, exitPosition.y, 0);
    scene.add(exit);

    return { entry, exit };
}

function checkPortalCollision(ball, portal) {
    const distance = ball.position.distanceTo(portal.entry.position);

    if (distance <= ball.geometry.parameters.radius + portal.entry.geometry.parameters.radius) {
        ball.position.set(portal.exit.position.x, portal.exit.position.y, 0);
        console.log("Port!");
    }
}


function checkSandCollision(ball, sand, velocity) {
    const ballPos = ball.position;
    const sandPos = sand.position;

    const halfWidth = sand.geometry.parameters.width / 2;
    const halfHeight = sand.geometry.parameters.height / 2;

    const withinX = ballPos.x >= sandPos.x - halfWidth && ballPos.x <= sandPos.x + halfWidth;
    const withinY = ballPos.y >= sandPos.y - halfHeight && ballPos.y <= sandPos.y + halfHeight;

    if (withinX && withinY) {
        velocity.x *= 0.7;
        velocity.y *= 0.5;
        //console.log("Slowed down in the sand!");
    }
}

function createWaterShapes(terrainPoints, count) {
    const waterShapes = [];

    for (let i = 0; i < count; i++) {
        const waterShape = generateWater(terrainPoints);
        if (waterShape) {
            waterShapes.push(waterShape);  // Store the generated water shape in the array
            scene.add(waterShape);         // Add the water shape to the scene
        }
    }

    return waterShapes;  // Return the array of water shapes
}

function createSandShapes(terrainPoints, count) {
    const sandShapes = [];

    for (let i = 0; i < count; i++) {
        const sandShape = generateSand(terrainPoints);
        if (sandShape) {
            sandShapes.push(sandShape);  // Store the generated water shape in the array
            scene.add(sandShape);         // Add the water shape to the scene
        }
    }

    console.log("SAND POINTS:", sandPoints);

    return sandShapes;  // Return the array of water shapes
}

function followBall() {
    const targetX = ball.position.x;
    const targetY = ball.position.y;

    // Smoothly interpolate the camera position
    camera.position.x += (targetX - camera.position.x) * cameraSpeed;
    camera.position.y += (targetY - camera.position.y) * cameraSpeed;

    // Calculate the visible half-width and half-height of the camera view
    const halfViewWidth = (camera.right - camera.left) / 2;
    const halfViewHeight = (camera.top - camera.bottom) / 2;

    // Clamp the camera position so its edges don't go past the terrain borders
    const minX = -terrainWidth / 2 + halfViewWidth; // Left terrain border
    const maxX = terrainWidth / 2 - halfViewWidth;  // Right terrain border
    const minY = minTerrainHeight + halfViewHeight; // Bottom terrain border

    camera.position.x = Math.max(minX, Math.min(camera.position.x, maxX));
    camera.position.y = Math.max(minY,camera.position.y);

    // Keep the camera looking straight down at the XY plane
    camera.position.z = 10; // Fixed height
    camera.lookAt(camera.position.x, camera.position.y, 0);
}

function createScoreDisplay() {
    // Create a canvas for the score
    scoreCanvas = document.createElement('canvas');
    scoreCanvas.width = 512; // Adjust resolution
    scoreCanvas.height = 256;
    scoreContext = scoreCanvas.getContext('2d');

    // Create a texture from the canvas
    scoreTexture = new THREE.CanvasTexture(scoreCanvas);

    // Create a plane geometry to display the texture
    const planeGeometry = new THREE.PlaneGeometry(5, 2); // Adjust size
    const planeMaterial = new THREE.MeshBasicMaterial({ map: scoreTexture, transparent: true });
    scorePlane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Position and add to the scene
    scorePlane.position.set(startCoords.x, startCoords.y, 0); // Adjust position to fit your scene
    scene.add(scorePlane);

    // Draw the initial score AFTER initializing the texture
    drawScore();
}


function drawScore() {
    // Clear the canvas
    scoreContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);

    // Draw background
    scoreContext.fillStyle = '#000000'; // Black background
    scoreContext.fillRect(0, 0, scoreCanvas.width, scoreCanvas.height);

    // Draw text
    scoreContext.fillStyle = '#FFFFFF'; // White text
    scoreContext.font = '48px Arial'; // Font style and size
    scoreContext.fillText(`Score: ${score}`, 50, 100); // Position the text
    scoreContext.fillText(`Multiplier: ${multi}`, 50,200);

    // Update texture
    scoreTexture.needsUpdate = true;
}

