/* 
    Homework 03
    2021147531 조윤성
    2023193004 태호성
    2023193009 김명재
*/

import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let isInitialized = false;  // main이 실행되는 순간 true로 change
let shader;
let lineVao, lineBuffer;
let tempVao, tempBuffer;
let circleVao, circleBuffer;
let intersectVao, intersectBuffer;
let isDrawing = false; // mouse button을 누르고 있는 동안 true로 change
let startPoint = null;  // mouse button을 누른 위치
let tempEndPoint = null; // mouse를 움직이는 동안의 위치
let lines = []; // 그려진 선분들을 저장하는 array
let textOverlay; // 원 정보 표시
let textOverlay2; // 선분 정보 표시
let textOverlay3; // 교점 정보 표시
let axes = new Axes(gl, 0.85); // x, y axes 그려주는 object (see util.js)

// DOMContentLoaded event
// 1) 모든 HTML 문서가 완전히 load되고 parsing된 후 발생
// 2) 모든 resource (images, css, js 등) 가 완전히 load된 후 발생
// 3) 모든 DOM 요소가 생성된 후 발생
// DOM: Document Object Model로 HTML의 tree 구조로 표현되는 object model 
// 모든 code를 이 listener 안에 넣는 것은 mouse click event를 원활하게 처리하기 위해서임
// mouse input을 사용할 때 이와 같이 main을 call 한다. 

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) { // true인 경우는 main이 이미 실행되었다는 뜻이므로 다시 실행하지 않음
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
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
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    shader.use();

    lineVao = gl.createVertexArray();
    gl.bindVertexArray(lineVao);
    lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    tempVao = gl.createVertexArray();
    gl.bindVertexArray(tempVao);
    tempBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tempBuffer);
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    circleVao = gl.createVertexArray();
    gl.bindVertexArray(circleVao);
    circleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    intersectVao = gl.createVertexArray();
    gl.bindVertexArray(intersectVao);
    intersectBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, intersectBuffer);
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
// 캔버스 좌표: 캔버스 좌측 상단이 (0, 0), 우측 하단이 (canvas.width, canvas.height)
// WebGL 좌표 (NDC): 캔버스 좌측 하단이 (-1, -1), 우측 상단이 (1, 1)
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,  // x/canvas.width 는 0 ~ 1 사이의 값, 이것을 * 2 - 1 하면 -1 ~ 1 사이의 값
        -((y / canvas.height) * 2 - 1) // y canvas 좌표는 상하를 뒤집어 주어야 하므로 -1을 곱함
    ];
}

/* 
    browser window
    +----------------------------------------+
    | toolbar, address bar, etc.             |
    +----------------------------------------+
    | browser viewport (컨텐츠 표시 영역)       | 
    | +------------------------------------+ |
    | |                                    | |
    | |    canvas                          | |
    | |    +----------------+              | |
    | |    |                |              | |
    | |    |      *         |              | |
    | |    |                |              | |
    | |    +----------------+              | |
    | |                                    | |
    | +------------------------------------+ |
    +----------------------------------------+

    *: mouse click position

    event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
    event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
    rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
    rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

    x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
    y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 이미 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소 (div, body, html 등)으로 전파되지 않도록 방지

        const rect = canvas.getBoundingClientRect(); // canvas를 나타내는 rect 객체를 반환
        const x = event.clientX - rect.left;  // canvas 내 x 좌표
        const y = event.clientY - rect.top;   // canvas 내 y 좌표
        
        if (!isDrawing && lines.length < 2) { 
            // 1번 또는 2번 선분을 그리고 있는 도중이 아닌 경우 (즉, mouse down 상태가 아닌 경우)
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true; // 이제 mouse button을 놓을 때까지 계속 true로 둠. 즉, mouse down 상태가 됨
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY]; // 임시 선분의 끝 point
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {

            // lines.push([...startPoint, ...tempEndPoint])
            //   : startPoint와 tempEndPoint를 펼쳐서 하나의 array로 합친 후 lines에 추가
            // ex) lines = [] 이고 startPoint = [1, 2], tempEndPoint = [3, 4] 이면,
            //     lines = [[1, 2, 3, 4]] 이 됨
            // ex) lines = [[1, 2, 3, 4]] 이고 startPoint = [5, 6], tempEndPoint = [7, 8] 이면,
            //     lines = [[1, 2, 3, 4], [5, 6, 7, 8]] 이 됨

            lines.push([...startPoint, ...tempEndPoint]); 

            const[x1, y1, x2, y2] = lines[0];
            const dx = x2 - x1;
            const dy = y2 - y1;
            const radius = Math.sqrt(dx*dx + dy*dy);

            if (lines.length == 1) {
                updateText(textOverlay, "Circle: center (" + lines[0][0].toFixed(2) + ", " + lines[0][1].toFixed(2) + 
                    ") radius = " + radius.toFixed(2));
            }
            else { // lines.length == 2
                updateText(textOverlay2, "Line segment: (" + lines[1][0].toFixed(2) + ", " + lines[1][1].toFixed(2) + 
                    ") ~ (" + lines[1][2].toFixed(2) + ", " + lines[1][3].toFixed(2) + ")");
            }

            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

// 원그리기용
function drawCircle(line, color = [1.0, 0.0, 1.0, 1.0], numSegments = 100){
    const[x1, y1, x2, y2] = line;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const radius = Math.sqrt(dx*dx + dy*dy);

    shader.setVec4("u_color", color);
    const circleVertices = new Float32Array(numSegments * 2);

    for(let i = 0; i < numSegments; i++){
        const theta = (i / numSegments) * 2 * Math.PI;
        circleVertices[2 * i] = x1 + radius * Math.cos(theta);
        circleVertices[2 * i + 1] = y1 + radius * Math.sin(theta);
    }

    return circleVertices;
}

// 교점구하기용
function getIntersection(circleArray, lineArray){
    const[cx, cy, ex, ey] = circleArray;
    const[x0, y0, x1, y1] = lineArray;

    const dx = x1 - x0;
    const dy = y1 - y0;
    const radius = Math.sqrt((ex - cx)**2 + (ey - cy)**2);

    // 이차식 계수 선언하고 판별식 확인
    const a = dx*dx + dy*dy;
    const b = 2 * (dx*(x0 - cx) + dy*(y0 - cy));
    const c = (x0 - cx)**2 + (y0 - cy)**2 - radius**2;

    const discriminant = b*b - 4*a*c;
    if (discriminant < 0) return [];

    // 근의공식으로 t 구하기
    const t1 = (-b + Math.sqrt(discriminant)) / (2*a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2*a);

    const points = [];
    // t 범위 조건 확인
    if (t1 >= 0 && t1 <= 1) points.push([x0 + t1*dx, y0 + t1*dy]);
    if (t2 >= 0 && t2 <= 1) points.push([x0 + t2*dx, y0 + t2*dy]);
    console.log([x0 + t1*dx, y0 + t1*dy]);
    console.log([x0 + t2*dx, y0 + t2*dy]);
    return points;
}

// 캔버스에 교점 정보 출력
function printIntersection(intersection){
    if(intersection.length == 2){
        updateText(textOverlay3, "Intersection Points: " + intersection.length 
            + " Point 1: (" + intersection[0][0].toFixed(2) + ", " + intersection[0][1].toFixed(2) + ")" 
            + " Point 2: (" + intersection[1][0].toFixed(2) + ", " + intersection[1][1].toFixed(2) + ")");
    } else if(intersection.length == 1){
        updateText(textOverlay3, "Intersection Points: " + intersection.length 
            + " Point 1: (" + intersection[0][0].toFixed(2) + ", " + intersection[0][1].toFixed(2) + ")");
    } else{
        updateText(textOverlay3, "No intersection");
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();
    const numSegments = 100;
    
    // 저장된 선들 그리기
    let num = 0;
    for (let line of lines) {
        if (num == 0) { 
            const circleVertices = drawCircle(line, [1.0, 0.0, 1.0, 1.0], numSegments) // 원은 magenta
            gl.bindVertexArray(circleVao);
            gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
            gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
        } else { 
            shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); // 선분은 gray
            gl.bindVertexArray(lineVao);
            gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.drawArrays(gl.LINES, 0, 2);
        }
        num++;
    }

    // 임시 도형 그리기(회색)
    if(isDrawing && startPoint && tempEndPoint){
        // 임시 도형을 위해 startPoint와 tempEndPoint 가져와 사용
        const tempLine = [...startPoint, ...tempEndPoint];

        if (lines.length == 0){
            // 첫번째 - 임시 원
            const tempCircleVertices = drawCircle(tempLine, [0.5, 0.5, 0.5, 1.0], numSegments); 
            gl.bindVertexArray(tempVao);       
            gl.bindBuffer(gl.ARRAY_BUFFER, tempBuffer);    
            gl.bufferData(gl.ARRAY_BUFFER, tempCircleVertices, gl.STATIC_DRAW);
            gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
        }
        if(lines.length === 1){
            // 두번째 - 임시 선분
            shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
            gl.bindVertexArray(tempVao);
            gl.bindBuffer(gl.ARRAY_BUFFER, tempBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tempLine), gl.STATIC_DRAW);
            gl.drawArrays(gl.LINES, 0, 2);
        }
    }

    // 교점 표시하기
    if(lines.length === 2){
        const intersection = getIntersection(lines[0], lines[1]);
        shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]); // 교점은 노란색
        gl.bindVertexArray(intersectVao);

        intersection.forEach(p => {
            const pointVertex = new Float32Array([p[0], p[1]]);
            console.log(p[0], p[1]); // 교점확인
            gl.bindBuffer(gl.ARRAY_BUFFER, intersectBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, pointVertex, gl.STATIC_DRAW);
            gl.drawArrays(gl.POINTS, 0, 1);
        });
        printIntersection(intersection);
    }

    // axes 그리기
    axes.draw(mat4.create(), mat4.create()); // 두 개의 identity matrix를 parameter로 전달
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
            return false; 
        }

        // 셰이더 초기화
        await initShader();
        
        // 나머지 초기화
        shader.use();        
        setupBuffers();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);
        
        // 마우스 이벤트 설정
        setupMouseEvents();
        
        // 초기 렌더링
        render();

        return true;
        
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
