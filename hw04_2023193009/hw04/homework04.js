/* 
    Homework 04
    2021147531 조윤성
    2023193004 태호성
    2023193009 김명재
*/

import { resizeAspectRatio } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let shader;
let vao;
let startTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    return true;
}

function setupBuffers() {
    const cubeVertices = new Float32Array([
        -0.15,  0.15,  // 좌상단
        -0.15, -0.15,  // 좌하단
         0.15, -0.15,  // 우하단
         0.15,  0.15   // 우상단
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0, 2, 3     // 두 번째 삼각형
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // VBO for position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    // EBO
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function drawRect(transform, color) {
    shader.use();
    shader.setMat4("u_transform", transform);
    shader.setVec4("u_color", color);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function render(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsedTime = (currentTime - startTime) / 1000.0;

    gl.clear(gl.COLOR_BUFFER_BIT);

    // pillar (brown)
    const pillar = mat4.create();
    mat4.translate(pillar, pillar, [0.0, -0.1, 0]);
    mat4.scale(pillar, pillar, [0.7, 3.5, 1]);
    drawRect(pillar, [0.55, 0.35, 0.1, 1.0]);

    // center of rotation
    const center = [0.0, 0.4, 0.0];

    // big blade (white)
    const bigBlade = mat4.create();
    mat4.translate(bigBlade, bigBlade, center);
    mat4.rotate(bigBlade, bigBlade, Math.sin(elapsedTime) * Math.PI * 2.0, [0, 0, 1]);
    mat4.scale(bigBlade, bigBlade, [2.5, 0.4, 1]);
    drawRect(bigBlade, [1.0, 1.0, 1.0, 1.0]);

    // small blades (gray)
    const smallBladeOffsets = [
        [-0.375, 0.0, 0.0],
        [0.375, 0.0, 0.0]
    ];

    for (let i = 0; i < smallBladeOffsets.length; i++) {
        const smallBlade = mat4.create();
        mat4.translate(smallBlade, smallBlade, center);
        mat4.rotate(smallBlade, smallBlade, Math.sin(elapsedTime) * Math.PI * 2.0, [0, 0, 1]);
        mat4.translate(smallBlade, smallBlade, smallBladeOffsets[i]);
        mat4.rotate(smallBlade, smallBlade, Math.sin(elapsedTime) * Math.PI * -10.0, [0, 0, 1]);
        mat4.scale(smallBlade, smallBlade, [0.6, 0.15, 1]);
        drawRect(smallBlade, [0.5, 0.5, 0.5, 1.0]);
    }
    
    requestAnimationFrame(render);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        await initShader();

        setupBuffers();
        requestAnimationFrame(render);

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

