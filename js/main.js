let camera, scene, renderer, ball, terrain, guideLine, hole, water, sand;
let ground, booster, bumper, portal, sandpit;
const ballRadius = 0.25;
const numberOfWaters = 5;
const numberOfSands = 5;
const cameraSpeed = 0.05;
const startCoords = { x: -terrainWidth/2 + 5, y: 10, z: 0 };
const WATER_RESET = true;

import { createTerrainMesh, terrainPoints, terrainWidth } from './terrain.js';
import { applyPhysics, velocity} from './physics.js';
import { generateWater} from './water.js';
import { generateSand,sandPoints} from './sand.js';
import { onMouseWheel, onWindowResize, onMouseDown, onMouseMove, onMouseUp} from './controls.js';

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
    addObjects();

    // Event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onMouseWheel);
    window.addEventListener('resize', onWindowResize);
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);

    followBall();
    applyPhysics();

    holeCollision();
    checkCollisionsWithWater();

    //checkBoosterCollision(ball, booster, velocity);
    //checkBumperCollision(ball, bumper, velocity);
    //checkPortalCollision(ball, portal);
    //checkSandCollision(ball,sandpit,velocity);
}

function addObjects(){
    // Ball
    const ballGeometry = new THREE.CircleGeometry(ballRadius, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: 'rgb(255,255,255)' });
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


function createBooster(position) {
    const boosterShape = new THREE.Shape();
    boosterShape.moveTo(0.8, 0.2);
    boosterShape.lineTo(0.8, -0.2);
    boosterShape.lineTo(-0.8, -0.2);
    boosterShape.lineTo(-0.8, 0.2);

    const geometry = new THREE.ShapeGeometry(boosterShape);
    const material = new THREE.MeshBasicMaterial({ color: 0x801ec4 });
    const booster = new THREE.Mesh(geometry, material);
    booster.position.set(position.x, position.y, 0);
    scene.add(booster);

    return booster;
}

function checkBoosterCollision(ball, booster, velocity) {
    const ballPos = ball.position;
    const boosterPos = booster.position;

    const withinX = ballPos.x >= boosterPos.x - 0.8 && ballPos.x <= boosterPos.x + 0.8;
    const withinY = ballPos.y >= boosterPos.y - 0.2 && ballPos.y <= boosterPos.y + 0.2;

    if (withinX && withinY) {
        velocity.x += 0.08;
        console.log("Speed boost!");
    }
}

function createBumper(position) {
    const shape = new THREE.Shape();
    shape.moveTo(0.8, 0.2);
    shape.lineTo(0.8, -0.2);
    shape.lineTo(-0.8, -0.2);
    shape.lineTo(-0.8, 0.2);
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color: 0x4fa7ea });
    const bumper = new THREE.Mesh(geometry, material);
    bumper.position.set(position.x, position.y, 0);
    scene.add(bumper);

    return bumper;
}

function checkBumperCollision(ball, bumper, velocity) {
    const ballPos = ball.position;
    const bumperPos = bumper.position;

    const withinX = ballPos.x >= bumperPos.x - 1 && ballPos.x <= bumperPos.x + 1;
    const withinY = ballPos.y >= bumperPos.y - 1 && ballPos.y <= bumperPos.y + 0.8;

    if (withinX && withinY) {
        velocity.x *= -1.5;
        velocity.y *= -1.5;
        console.log("Bounce!");
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

    camera.position.x = Math.max(minX, Math.min(camera.position.x, maxX));

    // Keep the camera looking straight down at the XY plane
    camera.position.z = 10; // Fixed height
    camera.lookAt(camera.position.x, camera.position.y, 0);
}

