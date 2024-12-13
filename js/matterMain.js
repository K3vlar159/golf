import * as Matter from 'matter-js';
import decomp from 'poly-decomp';
import { createTerrainMesh, terrainPoints } from './terrain.js';

window.decomp = decomp;

createTerrainMesh();

// scale factor => konverzia to generuje strasne male takze sa to musi zvacsit aby to vyzeralo normalne
const SCALE_FACTOR = 35;

const matterTerrainPoints = terrainPoints.map(p => ({
    x: p.x * SCALE_FACTOR,
    y: (p.y * SCALE_FACTOR) * -1, // three js a matter maju inak format pre suradnice
                                  // => Y sa musi otocit aby bol dobre teren
}));

const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite;

const engine = Engine.create();

const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 1300,
        height: 915, // toto podla potreby asi
        wireframes: false,
        background: '#111111',
    },
});

const terrain = Matter.Bodies.fromVertices(
    650,
    700, // offsety aby to bolo dole
    [matterTerrainPoints],
    {
        isStatic: true,
        render: {
            fillStyle: '#228B22',
        },
    }
);

Composite.add(engine.world, terrain);

// test objekty
const box = Bodies.rectangle(400, 200, 30, 30, {
    render: { fillStyle: '#FF0000' },
});
const ball = Bodies.circle(500, 50, 20, {
    render: { fillStyle: '#00FF00' },
});

Composite.add(engine.world, [box, ball]);

// pre interakciu s myskou
const mouse = Matter.Mouse.create(render.canvas);
const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { render: { visible: false } },
});
render.mouse = mouse;

Composite.add(engine.world, mouseConstraint);

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);
