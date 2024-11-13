// Terrain settings
const terrainWidth = 40;
const maxTerrainHeight = 10;
const minTerrainHeight = -8;
const detailLevel = 500; // Number of points for more smoothness
let terrainPoints; // Store terrain points for external access


// Midpoint displacement function to create terrain
function generateTerrain(width, maxH, minH, detail) {
    const points = [];
    points.push(new THREE.Vector2(-width / 2, minH)); // Start point
    points.push(new THREE.Vector2(width / 2, minH));  // End point

    // Modify the midpoint function to include the `detail` parameter
    function midpoint(start, end, range, detailLevel) {
        if (range < 1 || detailLevel <= 0) return; // Stop recursion based on `detailLevel`

        var midX = (start.x + end.x) / 2;
        var midY = (start.y + end.y) / 2 + (Math.random() - 0.5) * range;
        while (midY < minTerrainHeight) {
            midY = (start.y + end.y) / 2 + (Math.random() - 0.5) * range;
        }

        const mid = new THREE.Vector2(midX, midY);
        points.splice(points.indexOf(end), 0, mid); // Insert midpoint before `end`

        // Recursive calls with reduced `range` and `detailLevel`
        midpoint(start, mid, range / 2, detailLevel - 1); // Left half
        midpoint(mid, end, range / 2, detailLevel - 1);   // Right half
    }

    midpoint(points[0], points[1], maxH - minH, detail); // Start recursion
    return points;
}


function createTerrainMesh() {
    const shape = new THREE.Shape();
    shape.moveTo(-terrainWidth / 2, minTerrainHeight);

    // Generate terrain points using midpoint displacement (as before)
    const terrainVertices = generateTerrain(terrainWidth, maxTerrainHeight, minTerrainHeight, detailLevel);
    terrainVertices.forEach(point => {
        shape.lineTo(point.x, point.y);
    });
    shape.lineTo(terrainWidth / 2, minTerrainHeight);
    shape.lineTo(-terrainWidth / 2, minTerrainHeight);

    // Get points for collision detection
    terrainPoints = shape.getPoints(detailLevel); // Store points

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color: 0x228B22, side: THREE.DoubleSide });
    return new THREE.Mesh(geometry, material);
}



// Export the function so main.js can access it
export { createTerrainMesh, terrainPoints };
