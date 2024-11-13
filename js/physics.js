let velocity = new THREE.Vector2();
const gravity = -0.05;
const friction = 0.98; // Friction to reduce sliding
const bounceDamping = 0.6; // Controls bounce height

import { terrainPoints } from './terrain.js';
import { terrain, ball, ballRadius, isDragging } from './main.js';

export { applyPhysics, velocity };

// Function to get the terrain height at a specific x-position
function getTerrainHeightAt(x) {
    let closestPointLeft = null;
    let closestPointRight = null;

    // Check if terrainPoints contains valid data
    if (!terrainPoints || terrainPoints.length === 0) {
        console.error("terrainPoints is empty or undefined.");
        return terrain.position.y;
    }

    // Loop through terrainPoints to find closest left and right points
    terrainPoints.forEach(point => {
        if (point.x <= x && (!closestPointLeft || point.x > closestPointLeft.x)) {
            closestPointLeft = point;
        }
        if (point.x >= x && (!closestPointRight || point.x < closestPointRight.x)) {
            closestPointRight = point;
        }
    });

    // If both points have the same x-coordinate, return their y-value directly
    if (closestPointLeft && closestPointRight && closestPointLeft.x === closestPointRight.x) {
        return closestPointLeft.y;
    }

    // Linear interpolation for height calculation if points are different
    if (closestPointLeft && closestPointRight) {
        const t = (x - closestPointLeft.x) / (closestPointRight.x - closestPointLeft.x);
        return closestPointLeft.y * (1 - t) + closestPointRight.y * t;
    }

    // Fallback: If only one point is found, return its height
    if (closestPointLeft) return closestPointLeft.y;
    if (closestPointRight) return closestPointRight.y;

    // Final fallback: Return default height if no points found
    return terrain.position.y;
}

function getTerrainSlopeAngleAt(x) {
    const delta = 0.01; // Small offset for slope calculation
    const heightAtX1 = getTerrainHeightAt(x - delta);
    const heightAtX2 = getTerrainHeightAt(x + delta);

    // Calculate the slope (angle) in radians using the difference in height
    const slope = Math.atan2(heightAtX2 - heightAtX1, 2 * delta);
    return slope;
}



// Update applyPhysics with terrain height collision detection
function applyPhysics() {
    if (!isDragging) {
        // Apply gravity in the vertical direction
        velocity.y += gravity;

        // Get the terrain height and slope at the ball's current x-position
        const terrainHeight = getTerrainHeightAt(ball.position.x) + ballRadius;
        const slopeAngle = getTerrainSlopeAngleAt(ball.position.x); // Calculate slope angle in radians

        // Rotate velocity to align with slope
        const gravityAlongSlope = gravity * Math.sin(slopeAngle);
        const gravityPerpendicularToSlope = gravity * Math.cos(slopeAngle);

        // Collision detection with terrain
        if (ball.position.y - ballRadius <= terrainHeight)
        {
            ball.position.y = terrainHeight; // Adjust position above terrain

            // Bounce effect: reverse and dampen vertical velocity
            velocity.y = -velocity.y * bounceDamping;

            // Adjust velocity along the slope
            velocity.x += gravityAlongSlope; // Apply gravity in the x direction based on slope
            velocity.y += gravityPerpendicularToSlope; // Adjust y velocity to simulate slope effect

            // Apply friction to horizontal movement on bounce
            velocity.x *= friction;

            // If horizontal speed is very low, stop the ball
            if (Math.abs(velocity.x) < 0.01) {
                velocity.x = 0;
            }
        }

        // Update position based on velocity
        ball.position.x += velocity.x;
        ball.position.y += velocity.y;

        // Prevent the ball from sinking below terrain
        if (ball.position.y < terrainHeight) {
            ball.position.y = terrainHeight; // Correct position
        }
    }
}