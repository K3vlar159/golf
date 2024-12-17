// Terrain settings
const terrainWidth = 200;
const maxTerrainHeight = 20;
const minTerrainHeight = -15;
const detailLevel = 7 // Number of iterations (use smaller numbers for less detail)
const roughness = 0.3; // Controls how jagged the terrain is/hill height (0.1 to 1.0)
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
    // Shader
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;

            uniform vec3 baseColor;
            uniform vec3 lightDirection;
            uniform float lightIntensity;

            void main() {
            // Simple lighting model
            float dotProduct = dot(normalize(lightDirection), normalize(vec3(vUv, 0.0)));
            float diffuse = max(dotProduct, 0.0);

            // Pastel color with lighting
            vec3 finalColor = baseColor * (1.0 + diffuse * lightIntensity);

            gl_FragColor = vec4(finalColor, 1.0);
            }
            `,
        uniforms: {
            baseColor: { value: new THREE.Color(0x165b13) },
            lightDirection: { value: new THREE.Vector3(0.11, -10, 0) },
            lightIntensity: { value: 0.3 }
        },
        side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, shaderMaterial);
}

export { createTerrainMesh, terrainPoints, terrainWidth, minTerrainHeight };

