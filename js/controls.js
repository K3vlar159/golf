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

export {onMouseWheel, onWindowResize, onMouseDown, onMouseMove, onMouseUp, isDragging, onMouseClick};
import {camera, guideLine, ball, createBumper,createBooster, terrain} from './main.js';
import {velocity} from './physics.js';



// Add keyboard event listener to switch modes with the 'Q' key
window.addEventListener('keydown', (event) => {
    if (event.key === 'q' || event.key === 'Q') {
        switchModeQ();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'w' || event.key === 'W') {
        switchModeW();
    }
});

// Function to switch the mode
function switchModeQ() {
    if (currentMode === MODE_CONTROLLING_BALL) {
        currentMode = MODE_ADDING_BUMPER;
        console.log('Switched to bumper adding mode');
    } else {
        currentMode = MODE_CONTROLLING_BALL;
        console.log('Switched to ball control mode');
    }
}

function switchModeW() {
    if (currentMode === MODE_CONTROLLING_BALL) {
        currentMode = MODE_ADDING_BOOSTER;
        console.log('Switched to booster adding mode');
    } else {
        currentMode = MODE_CONTROLLING_BALL;
        console.log('Switched to ball control mode');
    }
}


function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;

    // Adjust camera frustum based on current zoom
    const zoomFactor = currentZoom / 10;
    camera.left = -10 * aspect * zoomFactor;
    camera.right = 10 * aspect * zoomFactor;
    camera.top = 10 * zoomFactor;
    camera.bottom = -10 * zoomFactor;

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseWheel(event) {
    // Prevent default scroll behavior
    event.preventDefault();

    // Adjust zoom based on scroll direction
    // Smaller delta for smoother zooming
    const zoomSpeed = 0.8;
    currentZoom += event.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // Clamp zoom between min and max values
    currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));

    // Get the current aspect ratio
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
        let mouse = new THREE.Vector2(
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
        let mouse = new THREE.Vector2(
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
        let pullVector = new THREE.Vector3().subVectors(mousePos, ballWorldPos);

        if (pullVector.length() > maxPullLength) {
            pullVector.setLength(maxPullLength);
        }

        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0).sub(pullVector)
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
        let pullVector = new THREE.Vector3().subVectors(mousePos, ballWorldPos);

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
    let mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the ground or other objects based on the mode
    if (currentMode === MODE_ADDING_BUMPER) {
        const intersects = raycaster.intersectObject(terrain); // Assuming terrain is your ground object
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            // Create a bumper at the intersection point
            createBumper(new THREE.Vector3(intersectPoint.x, intersectPoint.y, 0));
        }
    } else if (currentMode === MODE_ADDING_BOOSTER) {
        const intersects = raycaster.intersectObject(terrain); // Assuming terrain is your ground object
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            // Create a bumper at the intersection point
            createBooster(new THREE.Vector3(intersectPoint.x, intersectPoint.y, 0));
        }

    }
}