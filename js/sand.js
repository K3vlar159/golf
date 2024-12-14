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
    const material = new THREE.MeshBasicMaterial({ color: 'rgb(227,205,74)', transparent: false, opacity: 1 });
    const sandMesh = new THREE.Mesh(geometry, material);

    return sandMesh;
}

