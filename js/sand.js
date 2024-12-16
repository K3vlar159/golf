// Assumes `terrainPoints` is an array of { x, y } objects representing the 2D terrain.
// Assumes a `scene` variable exists for Three.js.
export { generateSand, sandPoints};
const SAND_MIN = 5;
const SAND_MAX = 10;
let sandPoints= [];

function generateSand(terrainPoints) {
    if (terrainPoints.length < 2) {
        console.error("Insufficient terrain points to generate water.");
        return null;
    }

        const startIndex = Math.floor(Math.random() * (terrainPoints.length - 10 - SAND_MAX)) ;
        const startPoint = terrainPoints[startIndex];
        const endIndex = Math.floor(Math.random() * (SAND_MAX-SAND_MIN)) + SAND_MIN + startIndex;
        const endPoint = terrainPoints[endIndex];
        const midPoints = terrainPoints.slice(startIndex + 1, endIndex);
        // If we have enough points in the valley, use them
        if (midPoints.length > 1) {
            console.log("Sand mid points found:", midPoints);  // Debugging line
            return createSandShape(startPoint, endPoint, [startPoint, ...midPoints, endPoint]);
        }

}

function createSandShape(startPoint, endPoint, midPoints) {
    console.log("Sand shape creation started with mid points:", midPoints); // Debugging line

    if (midPoints.length < 1) {
        console.error("Not enough mid points to form a valid sand shape.");
        return null;
    }

    let points = [];
    points.push(startPoint, ...midPoints, endPoint);

    sandPoints.push(points);

    const sandShape = new THREE.Shape();

    // Create the initial line from start to end
    sandShape.moveTo(startPoint.x, startPoint.y);
    for (let i = 0; i < midPoints.length; i++) {
        // Only add points if they create a valid polygon
        sandShape.lineTo(midPoints[i].x, midPoints[i].y);
    }

    sandShape.lineTo(endPoint.x, endPoint.y);

    let slope = 0.4;

    for (let i = midPoints.length - 2; i >= 1; i--) {
        // Only add points if they create a valid polygon
        sandShape.lineTo(midPoints[i].x, midPoints[i].y-slope);
        if(i < midPoints.length/2){
            slope -= 0.3;
        }
        else{
            slope += 0.3;
        }
    }

    // Close the shape by linking the end back to the start
    sandShape.lineTo(startPoint.x, startPoint.y);  // Close the shape



    // Create geometry from the shape
    const geometry = new THREE.ShapeGeometry(sandShape);

    // Check if the geometry has valid faces (if not, it's an invalid shape)
    if (geometry.faces.length === 0) {
        console.error("Generated geometry has no faces.");
        return null;
    }

    // Material for water mesh
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
        fragmentShader:  `
        uniform float time;
        uniform vec3 sandColor1;
        uniform vec3 sandColor2;
        varying vec2 vUv;

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            float grain = random(vUv * 100.0); 
            vec3 color = mix(sandColor1, sandColor2, grain);
            float wave = sin(vUv.y * 10.0 + time * 2.0) * 0.01;
            vec3 finalColor = color + wave;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
        uniforms: {
            time: { value: 0.0 },
            sandColor1: { value: new THREE.Color(0xf4e7b5) }, // Svetlá piesková farba
            sandColor2: { value: new THREE.Color(0xe5c07b) }  // Tmavšia piesková farba
        },
        side: THREE.DoubleSide,
    });

    const sandMesh = new THREE.Mesh(geometry, shaderMaterial);

    return sandMesh;
}

