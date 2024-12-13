let camera, scene, renderer, controls;
let ground, ball, terrain, hole, water, booster, bumper, portal, sandpit;
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

    createHole(ball, hole);
    checkWaterCollision(ball, water);
    checkBoosterCollision(ball, booster, velocity);
    checkBumperCollision(ball, bumper, velocity);
    checkPortalCollision(ball, portal);
    checkSandCollision(ball,sandpit,velocity);
}

function addObjects(){

    //ball
    const ballGeometry = new THREE.CircleGeometry(ballRadius, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const wireframeGeometry = new THREE.EdgesGeometry(ballGeometry);

    ball = new THREE.Mesh(ballGeometry, ballMaterial); // full ball
    //ball = new THREE.LineSegments(wireframeGeometry, ballMaterial); // wireframe ball
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

    createHole(ball, hole);
    booster = createBooster(terrainPoints[20]);
    water = createWater(terrainPoints);
    bumper = createBumper(terrainPoints[13]);
    portal = createPortal(terrainPoints[23], terrainPoints[10]);
    sandpit = createSand(terrainPoints[17],3,1.5);

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

// POWER-UPS

function createHole(ball, hole) {
    const ballRadius = ball.geometry.parameters.radius;
    const holeRadius = hole.geometry.parameters.radius;
    const distance = ball.position.distanceTo(hole.position);

    if (distance <= ballRadius + holeRadius) {
        scene.remove(ball);
        ball.geometry.dispose();
        ball.material.dispose();
        console.log("Birdie!");
    }
}

function createWater(terrainPoints) {
    const waterPoints = [
        new THREE.Vector2(terrainPoints[5].x, terrainPoints[5].y),
        new THREE.Vector2(terrainPoints[10].x, terrainPoints[10].y),
        new THREE.Vector2(terrainPoints[10].x - 2, terrainPoints[10].y - 3),
        new THREE.Vector2(terrainPoints[5].x + 2, terrainPoints[5].y - 3),
    ];

    const shape = new THREE.Shape();
    shape.moveTo(waterPoints[0].x, waterPoints[0].y);
    waterPoints.forEach(point => shape.lineTo(point.x, point.y));
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });

    const waterMesh = new THREE.Mesh(geometry, material);
    scene.add(waterMesh);

    return waterMesh;
}

function checkWaterCollision(ball, waterMesh) {
    const ballPos = ball.position;
    const waterPos = waterMesh.position;

    const withinX = ballPos.x >= waterPos.x - 2 && ballPos.x <= waterPos.x + 2;
    const withinY = ballPos.y >= waterPos.y - 3 && ballPos.y <= waterPos.y;

    if (withinX && withinY) {
        scene.remove(ball);
        ball.geometry.dispose();
        ball.material.dispose();
        console.log("SPLASH!");
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

function createSand(position, width, height) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        color: 0xdeb887, // Sand color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
    });

    const sand = new THREE.Mesh(geometry, material);
    sand.position.set(position.x, position.y, 0);
    scene.add(sand);

    return sand;
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

