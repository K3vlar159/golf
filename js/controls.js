// ZOOM PARAMETERS
const minZoom = 5;  // Closest zoom level
const maxZoom = 17; // Furthest zoom level
let currentZoom = 10; // Initial zoom level

// MOUSE PULL
let pullOrigin = new THREE.Vector3(); // Dynamic pull origin set during drag start
const maxPullLength = 1.4;
const launchStrength = 0.5; // Increased for more powerful launches
let isDragging = false;

const MODE_ADDING_BUMPER = 'addingBumper';
const MODE_CONTROLLING_BALL = 'controllingBall';
const MODE_ADDING_BOOSTER = 'addingBooster';

let currentMode = MODE_CONTROLLING_BALL; // Start with ball control mode

export { onMouseWheel, onMouseDown, onMouseMove, onMouseUp, isDragging, onMouseClick, currentZoom };
import { camera, guideLine, ball, createBumper, createBooster, terrain } from './main.js';
import { velocity, getTerrainHeightAt } from './physics.js';

// Mode control buttons
document.getElementById('modeAddBumper').addEventListener('click', () => {
    toggleMode(MODE_ADDING_BUMPER, 'modeAddBumper');
});

document.getElementById('modeAddBooster').addEventListener('click', () => {
    toggleMode(MODE_ADDING_BOOSTER, 'modeAddBooster');
});

function toggleMode(mode, buttonId) {
    const button = document.getElementById(buttonId);

    if (currentMode === mode) {
        // Deselect the current mode and switch back to ball control
        currentMode = MODE_CONTROLLING_BALL;
        button.classList.remove('active');
        console.log('Switched to ball control mode');
    } else {
        // Set the new mode and highlight the button
        currentMode = mode;
        document.querySelectorAll('#modeControls button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        console.log(`Switched to ${mode === MODE_ADDING_BUMPER ? 'bumper adding' : 'booster adding'} mode`);
    }
}

function onMouseWheel(event) {
    // Prevent default scroll behavior
    event.preventDefault();

    const zoomSpeed = 0.8;
    currentZoom += event.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // Clamp zoom between min and max values
    currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));

    const aspect = window.innerWidth / window.innerHeight;

    // Update camera frustum
    const zoomFactor = currentZoom / 10;
    camera.left = -10 * aspect * zoomFactor;
    camera.right = 10 * aspect * zoomFactor;
    camera.top = 10 * zoomFactor;
    camera.bottom = -10 * zoomFactor;

    // Update the projection matrix
    camera.updateProjectionMatrix();
}

function onMouseDown(event) {
    if (currentMode === MODE_CONTROLLING_BALL) {
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(ball);

        if (intersects.length > 0) {
            isDragging = true;
            velocity.set(0, 0);
            pullOrigin.copy(ball.getWorldPosition(new THREE.Vector3()));
            guideLine.visible = true;
        }
    }
}

function onMouseMove(event) {
    if (isDragging && currentMode === MODE_CONTROLLING_BALL) {
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const mousePos = new THREE.Vector3();
        const intersected = raycaster.ray.intersectPlane(
            new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
            mousePos
        );

        if (!intersected) return;

        const ballWorldPos = ball.getWorldPosition(new THREE.Vector3());
        const pullVector = new THREE.Vector3().subVectors(mousePos, ballWorldPos);

        if (pullVector.length() > maxPullLength) {
            pullVector.setLength(maxPullLength);
        }

        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0).sub(pullVector),
        ];

        guideLine.geometry.setFromPoints(points);
        guideLine.visible = pullVector.length() > 0.01;
    }
}

function onMouseUp(event) {
    if (isDragging && currentMode === MODE_CONTROLLING_BALL) {
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const mousePos = new THREE.Vector3();
        raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), mousePos);

        const ballWorldPos = ball.getWorldPosition(new THREE.Vector3());
        const pullVector = new THREE.Vector3().subVectors(mousePos, ballWorldPos);

        if (pullVector.length() > maxPullLength) {
            pullVector.setLength(maxPullLength);
        }

        velocity.set(
            -pullVector.x * launchStrength,
            -pullVector.y * launchStrength
        );

        guideLine.visible = false;
        isDragging = false;
    }
}

function onMouseClick(event) {
    // Check if the click is on a button or any UI element
    if (event.target.tagName === 'BUTTON' || event.target.closest('.ui')) {
        return; // Do nothing if the click is on a button or UI
    }

    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    if (currentMode === MODE_ADDING_BUMPER || currentMode === MODE_ADDING_BOOSTER) {
        const intersects = raycaster.intersectObject(terrain);
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;

            const terrainHeight = getTerrainHeightAt(intersectPoint.x);
            const placementPosition = new THREE.Vector3(intersectPoint.x, terrainHeight, intersectPoint.z);

            if (currentMode === MODE_ADDING_BUMPER) {
                createBumper(placementPosition);
            } else if (currentMode === MODE_ADDING_BOOSTER) {
                createBooster(placementPosition);
            }
        }
    }
}

