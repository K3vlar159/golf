var camera, scene, renderer, controls;
var ground, ball
let velocity = new THREE.Vector2();
const gravity = -0.05;
const ballRadius = 0.5;
let isDragging = false;
let pullOrigin = new THREE.Vector3(); // Dynamic pull origin set during drag start
const launchStrength = 0.4; // Increased for more powerful launches
const bounceDamping = 0.6; // Controls bounce height
const friction = 0.98; // Friction to reduce sliding
let guideLine; // To represent the pull direction and strength

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

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
}

function render() {
    requestAnimationFrame( render );
    renderer.render( scene, camera );
    camera.lookAt(scene.position);
    applyPhysics();
}

function addObjects(){
    const groundGeometry = new THREE.PlaneGeometry(20, 1);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(0, -2, 0);
    scene.add(ground);

    const ballGeometry = new THREE.CircleGeometry(ballRadius, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0,5,0);
    scene.add(ball);

    // Create a line to represent the pull direction
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red color for the line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    guideLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(guideLine);
    guideLine.visible = false; // Initially hidden
}

function applyPhysics() {
    if (!isDragging) {
        // Apply gravity
        velocity.y += gravity;
        ball.position.x += velocity.x;
        ball.position.y += velocity.y;

        // Ground collision detection
        if (ball.position.y - ballRadius <= ground.position.y + 0.5) {
            ball.position.y = ground.position.y + 0.5 + ballRadius; // Adjust position above ground

            // Bounce effect: reverse and dampen vertical velocity
            velocity.y = -velocity.y * bounceDamping;

            // Apply friction to horizontal movement on bounce
            velocity.x *= friction;

            // If horizontal speed is very low, stop the ball
            if (Math.abs(velocity.x) < 0.01) {
                velocity.x = 0;
            }
        }

        // Prevent the ball from sinking into the ground
        if (ball.position.y < ground.position.y + 0.5 + ballRadius) {
            ball.position.y = ground.position.y + 0.5 + ballRadius; // Correct position
        }
    }
}

function onMouseDown(event) {
    const mouse = new THREE.Vector2(
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
        const mouse = new THREE.Vector2(
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