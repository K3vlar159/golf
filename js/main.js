let camera, scene, renderer, controls;
let ground, ball, terrain, hole, boosterr, bumperr
const ballRadius = 0.25;
let isDragging = false;
let pullOrigin = new THREE.Vector3(); // Dynamic pull origin set during drag start
const launchStrength = 0.2; // Increased for more powerful launches

let guideLine; // To represent the pull direction and strength

import { createTerrainMesh, terrainPoints } from './terrain.js';
import { applyPhysics, velocity} from './physics.js';

export { terrain, ball, ballRadius, isDragging };

let waterPoints = [];
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
    requestAnimationFrame( render );
    renderer.render( scene, camera );
    //camera.lookAt(ball.position);
    //camera.position.set(ball.position.x, ball.position.y, 10);
    applyPhysics();
    birdie();
    addWater(waterPoints);
    booster();
    bumper();
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

    // golf hole
    const holeGeometry = new THREE.CircleGeometry(0.25, 32);
    const holeMaterial = new THREE.MeshBasicMaterial({color: 0x666699 });
    hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(terrainPoints[25].x, terrainPoints[25].y, 0);
    scene.add(hole);
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
        // Calculate mouse position relative to the scene
        let mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Get the mouse position in 3D space
        const mousePos = new THREE.Vector3();
        raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), mousePos);

        // Calculate the pull vector from the ball's initial position to the mouse position
        const pullVector = new THREE.Vector3().subVectors(mousePos, pullOrigin);

        // Calculate the end point of the guide line in the opposite direction of the pull vector
        const lineEnd = pullOrigin.clone().add(pullVector.clone().multiplyScalar(-1)); // Inverting the pull vector for the opposite direction

        // Update the guide line from the pull origin to the calculated end point
        const points = [pullOrigin.clone(), lineEnd];
        guideLine.geometry.setFromPoints(points);
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
        const pullVector = new THREE.Vector3().subVectors(mousePos, pullOrigin);

        // Launch velocity is the opposite of the pull vector
        velocity.set(-pullVector.x * launchStrength, -pullVector.y * launchStrength);

        guideLine.visible = false;
        isDragging = false;
    }
}

function birdie() {
    const ballPosition = ball.position;
    const holePosition = hole.position;

    const distance = ballPosition.distanceTo(holePosition);

    if (distance <= hole.geometry.parameters.radius + ball.geometry.parameters.radius) {
        scene.remove(ball);

        ball.geometry.dispose();
        ball.material.dispose();

        console.log("Birdie!");
    }
}

function addWater(waterPoints) {
    const shape = new THREE.Shape();

    waterPoints[0] = new THREE.Vector2(terrainPoints[5].x, terrainPoints[5].y)
    waterPoints[1] = new THREE.Vector2(terrainPoints[10].x, terrainPoints[10].y);
    waterPoints[2] = new THREE.Vector2(terrainPoints[10].x - 2, terrainPoints[10].y - 3);
    waterPoints[3] = new THREE.Vector2(terrainPoints[5].x + 2, terrainPoints[5].y - 3);

    shape.moveTo(waterPoints[0].x, waterPoints[0].y);
    waterPoints.forEach(point => shape.lineTo(point.x, point.y));
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });

    const waterMesh = new THREE.Mesh(geometry, material);
    scene.add(waterMesh);

    const ballPosition = ball.position;
    const waterPosition = waterMesh.position;

    const distance = ballPosition.distanceTo(waterPosition);

    if (distance <= waterMesh.geometry.parameters.radius + ball.geometry.parameters.radius) {
        scene.remove(ball);

        ball.geometry.dispose();
        ball.material.dispose();

        console.log("SPLASH!");
    }
}

function booster() {
    const booster = new THREE.Shape();
    booster.moveTo(0.8, 0.2);
    booster.lineTo(0.8, -0.2);
    booster.lineTo(-0.8, -0.2);
    booster.lineTo(-0.8, 0.2);

    const boosterGeometry = new THREE.ShapeGeometry(booster);
    const boosterMaterial = new THREE.MeshBasicMaterial({color: 0x801ec4 });
    boosterr = new THREE.Mesh(boosterGeometry, boosterMaterial);
    boosterr.position.set(terrainPoints[20].x, terrainPoints[20].y + 0.2, 0);
    scene.add(boosterr);

    const ballPosition = ball.position;
    const boosterPosition = boosterr.position;

    const withinX = ballPosition.x >= boosterPosition.x - 0.8 && ballPosition.x <= boosterPosition.x + 0.8;
    const withinY = ballPosition.y >= boosterPosition.y - 0.2 && ballPosition.y <= boosterPosition.y + 0.2;

    if (withinX && withinY) {
        velocity.x += 0.08;
        console.log("Speed boost!");
    }

}

function bumper() {
    const bumperShape = new THREE.Shape();
    bumperShape.moveTo(0.8, 0.2);
    bumperShape.lineTo(0.8, -0.2);
    bumperShape.lineTo(-0.8, -0.2);
    bumperShape.lineTo(-0.8, 0.2);
    bumperShape.closePath();

    const bumperGeometry = new THREE.ShapeGeometry(bumperShape);
    const bumperMaterial = new THREE.MeshBasicMaterial({ color: 0x4fa7ea });
    const bumperMesh = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumperMesh.position.set(terrainPoints[13].x, terrainPoints[13].y + 0.2, 0);
    scene.add(bumperMesh);

    const ballPosition = ball.position;
    const bumperPosition = bumperMesh.position;

    const withinX = ballPosition.x >= bumperPosition.x - 1 && ballPosition.x <= bumperPosition.x + 1;
    const withinY = ballPosition.y >= bumperPosition.y - 1 && ballPosition.y <= bumperPosition.y + 0.8;

    if (withinX && withinY) {
        velocity.x *= -1.5;
        velocity.y *= -1.5;
        //console.log("Bounce!");
    }

}
