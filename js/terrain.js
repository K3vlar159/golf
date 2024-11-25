// Terrain settings
const terrainWidth = 40;
const maxTerrainHeight = 10;
const minTerrainHeight = -8;
const detailLevel = 5; // Number of iterations (use smaller numbers for less detail)
const roughness = 0.6; // Controls how jagged the terrain is (0.1 to 1.0)
let terrainPoints;

function generateTerrain(width, maxH, minH, detail, roughness) {
    const points = [];
    points.push(new THREE.Vector2(-width / 2, (maxH + minH) / 2)); // Start at middle height
    points.push(new THREE.Vector2(width / 2, (maxH + minH) / 2));  // End at middle height

    function midpoint(start, end, displacement, iteration) {
        if (iteration <= 0) return;

        const midX = (start.x + end.x) / 2;

        // Calculate displacement that decreases with each iteration
        const range = displacement * Math.pow(roughness, iteration);
        const midY = (start.y + end.y) / 2 + (Math.random() * 2 - 1) * range;

        // Clamp the height between min and max
        const clampedY = Math.max(minH, Math.min(maxH, midY));
        const mid = new THREE.Vector2(midX, clampedY);

        const insertIndex = points.indexOf(end);
        points.splice(insertIndex, 0, mid);

        // Reduce displacement for next iteration
        midpoint(start, mid, displacement, iteration - 1);
        midpoint(mid, end, displacement, iteration - 1);
    }

    // Initial displacement is based on height range
    const initialDisplacement = (maxH - minH) / 2;
    midpoint(points[0], points[1], initialDisplacement, detail);

    return points;
}

function smoothTerrain(points, smoothingPasses = 1) {
    for (let pass = 0; pass < smoothingPasses; pass++) {
        const smoothedPoints = [points[0]]; // Keep first point

        // Apply moving average
        for (let i = 1; i < points.length - 1; i++) {
            const prevY = points[i - 1].y;
            const currentY = points[i].y;
            const nextY = points[i + 1].y;

            const smoothedY = (prevY + currentY + nextY) / 3;
            smoothedPoints.push(new THREE.Vector2(points[i].x, smoothedY));
        }

        smoothedPoints.push(points[points.length - 1]); // Keep last point
        points = smoothedPoints;
    }
    return points;
}

function createTerrainMesh() {
    const shape = new THREE.Shape();
    shape.moveTo(-terrainWidth / 2, minTerrainHeight);

    // Generate and smooth terrain points
    let terrainVertices = generateTerrain(
        terrainWidth,
        maxTerrainHeight,
        minTerrainHeight,
        detailLevel,
        roughness
    );

    // Apply smoothing (adjust passes as needed)
    terrainVertices = smoothTerrain(terrainVertices, 2);

    // Create the shape
    terrainVertices.forEach(point => {
        shape.lineTo(point.x, point.y);
    });

    // Close the shape
    shape.lineTo(terrainWidth / 2, minTerrainHeight);
    shape.lineTo(-terrainWidth / 2, minTerrainHeight);

    // Store points for collision detection
    terrainPoints = terrainVertices;

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
        color: 0x228B22,
        side: THREE.DoubleSide
    });

    return new THREE.Mesh(geometry, material);
}

export { createTerrainMesh, terrainPoints };