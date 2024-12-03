var camera, scene, renderer, controls;
var ground, ball, terrain
const ballRadius = 0.25; //0.25 default
let isDragging = false;
let pullOrigin = new THREE.Vector3(); // Dynamic pull origin set during drag start
const launchStrength = 0.4; // Increased for more powerful launches
const maxPullLength = 2.5;
//const lineLength = 2;
const cameraSpeed = 0.05;

let guideLine; // To represent the pull direction and strength

import { createTerrainMesh, terrainPoints } from './terrain.js';
import { applyPhysics, velocity} from './physics.js';

export { terrain, ball, ballRadius, isDragging };

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

   // controls = new THREE.OrbitControls( camera, renderer.domElement );

    scene = new THREE.Scene();
    addObjects();
    console.log("Terrain Points:", terrainPoints);


    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
}

function render() {
    requestAnimationFrame(render);

    // Smoothly interpolate the camera position to follow the ball
     // Adjust this for smoother or snappier camera movement
    const targetX = ball.position.x;
    const targetY = ball.position.y;

    // Update the camera position smoothly, but lock the Z-axis and prevent rotation
    camera.position.x += (targetX - camera.position.x) * cameraSpeed;
    camera.position.y += (targetY - camera.position.y) * cameraSpeed;

    // Lock the Z position of the camera
    camera.position.z = 10; // Keep a fixed distance above the scene

    // Keep the camera looking straight down on the XY plane
    camera.lookAt(camera.position.x, camera.position.y, 0);

    renderer.render(scene, camera);
    applyPhysics();
}


function addObjects(){

    //ball
    const ballGeometry = new THREE.CircleGeometry(ballRadius, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0,5,0);
    scene.add(ball);

    //line to represent the pull direction
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red color for the line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    guideLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(guideLine);
    guideLine.visible = false; // Initially hidden

    //procedurally generated terrain
    terrain = createTerrainMesh(window.innerHeight);
    scene.add(terrain);
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
        isDragging = true;
        velocity.set(0, 0); // Reset velocity while pulling

        // Set pull origin to the current ball position
        pullOrigin.copy(ball.position);
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

        // Calculate the pull vector from the ball's initial position to the mouse position
        let pullVector = new THREE.Vector3().subVectors(mousePos, pullOrigin);

        // Clamp the pull vector length to the maximum pull length
        if (pullVector.length() > maxPullLength) {
            pullVector.setLength(maxPullLength);
        }

        // Calculate the end point of the guide line in the opposite direction of the pull vector
        const lineEnd = pullOrigin.clone().add(pullVector.clone().multiplyScalar(-1));

        // Ensure points are valid and update guide line geometry
        if (pullOrigin.distanceTo(lineEnd) > 0.01) { // Prevent near-zero line lengths
            const points = [pullOrigin.clone(), lineEnd];
            guideLine.geometry.setFromPoints(points);
            guideLine.visible = true;
        } else {
            guideLine.visible = false; // Hide if line is too small
        }
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

        // Calculate the pull vector from the ball's initial position to the mouse position
        let pullVector = new THREE.Vector3().subVectors(mousePos, pullOrigin);

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
