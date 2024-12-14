// Zoom parameters
const minZoom = 5;  // Closest zoom level
const maxZoom = 17; // Furthest zoom level
let currentZoom = 10; // Initial zoom level

const maxPullLength = 1.4;
const launchStrength = 0.5; // Increased for more powerful launches

let isDragging = false;

export {onMouseWheel, onWindowResize, onMouseDown, onMouseMove, onMouseUp, isDragging};
import { camera, pullOrigin, guideLine, ball} from './main.js';
import {velocity} from './physics.js';

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
    let mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ball);

    if (intersects.length > 0) {
        isDragging = true ;
        velocity.set(0, 0); // Reset velocity while pulling

        // Set pull origin to the current ball position in world coordinates
        pullOrigin.copy(ball.getWorldPosition(new THREE.Vector3()));
        guideLine.visible = true; // Show the guide line
    }
}

function onMouseMove(event) {
    if (isDragging) {
        let mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Get the mouse position in 3D space
        const mousePos = new THREE.Vector3();
        const intersected = raycaster.ray.intersectPlane(
            new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
            mousePos
        );

        if (!intersected) {
            // If no intersection, keep the line visible at the last valid point
            return;
        }

        // Calculate the pull vector from the ball's world position to the mouse position
        const ballWorldPos = ball.getWorldPosition(new THREE.Vector3());
        let pullVector = new THREE.Vector3().subVectors(mousePos, ballWorldPos);

        // Clamp the pull vector length to the maximum pull length
        if (pullVector.length() > maxPullLength) {
            pullVector.setLength(maxPullLength);
        }

        // Update the guideline geometry
        const points = [
            new THREE.Vector3(0, 0, 0),  // Start at ball's local origin
            new THREE.Vector3(0, 0, 0).sub(pullVector)  // End point in local coordinates
        ];

        guideLine.geometry.setFromPoints(points);
        guideLine.visible = pullVector.length() > 0.01;
    }
}

function onMouseUp(event) {
    if (isDragging) {
        // Calculate mouse position relative to the scene
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Get the mouse position in 3D space, specifically at a fixed Z position (ground level)
        const mousePos = new THREE.Vector3();
        raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), mousePos);

        // Calculate the pull vector from the ball's world position to the mouse position
        const ballWorldPos = ball.getWorldPosition(new THREE.Vector3());
        let pullVector = new THREE.Vector3().subVectors(mousePos, ballWorldPos);

        // Clamp the pull vector length to the maximum pull length
        if (pullVector.length() > maxPullLength) {
            pullVector.setLength(maxPullLength);
        }

        // Launch velocity is the opposite of the pull vector
        velocity.set(
            -pullVector.x * launchStrength,
            -pullVector.y * launchStrength
        );

        guideLine.visible = false;
        isDragging = false;
    }
}