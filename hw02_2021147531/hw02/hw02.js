import { resizeAspectRatio } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let shader = null;
let vao = null;
let uOffsetLoc = null;

const offset = { x: 0.0, y: 0.0 };
const HALF = 0.1;           // 정사각형이 밖으로 나가지 않게 하기 위한 반쪽 길이
const STEP_TAP = 0.01;
const STEP_HOLD = 0.01;

const pressed = { up:false, down:false, left:false, right:false };

function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }
function clampOffset(){
  offset.x = clamp(offset.x, -1 + HALF, 1 - HALF);
  offset.y = clamp(offset.y, -1 + HALF, 1 - HALF);
}

// WebGL 초기화
function initWebGL() {
  if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
    return false;
  }
  canvas.width = 600;
  canvas.height = 600;
  resizeAspectRatio(gl, canvas);     // 1:1 유지
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  return true;
}

// 셰이더 로드/생성
async function initShader() {
  const vsrc = await readShaderFile('shVert.glsl');
  const fsrc = await readShaderFile('shFrag.glsl');
  shader = new Shader(gl, vsrc, fsrc);
}

function setupBuffers() {
  const vertices = new Float32Array([
    -0.1, -0.1, 0.0,
    -0.1,  0.1, 0.0,
     0.1,  0.1, 0.0,
     0.1, -0.1, 0.0,
  ]);

  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);
}

// 입력 처리
function setupInput() {
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':  pressed.left  = true; if (!e.repeat) { offset.x -= STEP_TAP; clampOffset(); } break;
      case 'ArrowRight': pressed.right = true; if (!e.repeat) { offset.x += STEP_TAP; clampOffset(); } break;
      case 'ArrowUp':    pressed.up    = true; if (!e.repeat) { offset.y += STEP_TAP; clampOffset(); } break;
      case 'ArrowDown':  pressed.down  = true; if (!e.repeat) { offset.y -= STEP_TAP; clampOffset(); } break;
      default: return;
    }
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowLeft':  pressed.left  = false; break;
      case 'ArrowRight': pressed.right = false; break;
      case 'ArrowUp':    pressed.up    = false; break;
      case 'ArrowDown':  pressed.down  = false; break;
      default: return;
    }
    e.preventDefault();
  });
}

function render() {
  const dx = (pressed.right ? 1 : 0) - (pressed.left ? 1 : 0);
  const dy = (pressed.up    ? 1 : 0) - (pressed.down ? 1 : 0);
  if (dx || dy) {
    offset.x += dx * STEP_HOLD;
    offset.y += dy * STEP_HOLD;
    clampOffset();
  }

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(uOffsetLoc, offset.x, offset.y);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

  requestAnimationFrame(render);
}

// main
async function main() {
  if (!initWebGL()) return;
  await initShader();
  shader.use();
  setupBuffers();
  uOffsetLoc = gl.getUniformLocation(shader.program, 'uOffset');
  setupInput();
  render();
}
main().catch(console.error);