// Assumes `terrainPoints` is an array of { x, y } objects representing the 2D terrain.
// Assumes a `scene` variable exists for Three.js.
export { generateWater };
const WATER_RANGE = 5; // Maximum range to look for the valley
const yThreshold = 0.1; // Allowable height difference between start and end points

function generateWater(terrainPoints) {
    if (terrainPoints.length < 2) {
        console.error("Insufficient terrain points to generate water.");
        return null;
    }

    let attempts = 0;
    const maxAttempts = 10;  // Maximum number of attempts to find a suitable valley

    while (attempts < maxAttempts) {
        // Ensure the random index is not within the first 10 or last 10 points
        const startIndex = Math.floor(Math.random() * (terrainPoints.length - 20)) + 10;
        const startPoint = terrainPoints[startIndex];

        for (let i = startIndex + 1; i < terrainPoints.length; i++) {
            const endPoint = terrainPoints[i];

            // Adjust the condition to consider terrain variation instead of strictly being lower
            if (Math.abs(startPoint.x - endPoint.x) <= WATER_RANGE && Math.abs(startPoint.y - endPoint.y) <= yThreshold) {
                // Get the subarray of points between startIndex + 1 and i
                const valleyPoints = terrainPoints.slice(startIndex + 1, i);

                // Check if any point in the subarray has a y value greater than startPoint.y
                if (valleyPoints.some(p => p.y > startPoint.y)) {
                    // If there is a point higher than startPoint.y, skip the current iteration
                    continue;
                }

                // If we have enough points in the valley, use them
                if (valleyPoints.length > 2) {
                    console.log("Valley points found:", valleyPoints);  // Debugging line
                    return createWaterShape(startPoint, endPoint, [startPoint, ...valleyPoints, endPoint]);
                }
            }
        }

        // If no suitable valley is found, increase attempts and try again
        attempts++;
        console.log(`Attempt ${attempts} failed to find a suitable valley.`);
    }

    console.warn("No suitable valley found after 10 attempts.");
    return null;
}



function createWaterShape(startPoint, endPoint, valleyPoints) {
    console.log("Water shape creation started with valley points:", valleyPoints); // Debugging line

    if (valleyPoints.length < 3) {
        console.error("Not enough valley points to form a valid shape.");
        return null;
    }

    const waterShape = new THREE.Shape();

    // Create the initial line from start to end
    waterShape.moveTo(startPoint.x, startPoint.y);
    waterShape.lineTo(endPoint.x, endPoint.y);

    // Add points from valley to form the bottom part
    for (let i = valleyPoints.length - 1; i >= 0; i--) {
        // Only add points if they create a valid polygon
        waterShape.lineTo(valleyPoints[i].x, valleyPoints[i].y);
    }

    // Close the shape by linking the end back to the start
    waterShape.lineTo(startPoint.x, startPoint.y);  // Close the shape

    // Create geometry from the shape
    const geometry = new THREE.ShapeGeometry(waterShape);

    // Check if the geometry has valid faces (if not, it's an invalid shape)
    if (geometry.faces.length === 0) {
        console.error("Generated geometry has no faces.");
        return null;
    }

    // Material for water mesh
    const material = new THREE.MeshBasicMaterial({ color: 0x3399ff, transparent: true, opacity: 0.7 });
    const waterMesh = new THREE.Mesh(geometry, material);

    return waterMesh;
}

