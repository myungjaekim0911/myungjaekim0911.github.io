/*-----------------------------------------------------------------------------
class SquarePyramid

1) Vertex positions
    A square pyramid has 5 faces. 1 face with 4 vertices, and 4 faces with 3 vertices. 
    The total number of vertices is 16 (1 * 4 + 4 * 3)
    So, vertices need 48 floats (16 * 3 (x, y, z)) in the vertices array

2) Vertex indices
    Vertex indices of the unit cube is as follows:
         v0
               
      v1------v4
     /       /
    v2------v3

    The order of faces and their vertex indices is as follows:
        bottom(1, 2, 3, 4)
        front (0, 2, 3) right (0, 3, 4) back (0, 1, 4) left (0, 1, 2)
    The total number of triangles is 6 (1 * 2 + 4)
    And, we need to maintain the order of vertices for each triangle as 
    counterclockwise (when we see the face from the outside of the cube):
        front [(0,2,3)]
        right [(0,3,4)]
        left [(0,1,2)]
        back [(0,4,1)]
        bottom [(1,4,3), (4,2,1)]

3) Vertex normals
    Each vertex in the same face has the same normal vector (flat shading)
    The vertex normal vector is the same as the face normal vector
    front face: (0, 0.447, 0.894), right face: (0.894, 0.447, 0), left face: (-0.894, 0.447, 0), back face: (0, 0.447, -0.894)
    bottom face: (0,-1,0)

4) Vertex colors
    Each vertex in the same face has the same color (flat shading)
    The color is the same as the face color
    front face: red (1,0,0,1), right face: yellow (1,1,0,1), left face: cyan (0,1,1,1), back face: magenta (1,0,1,1)
    bottom face: blue (0,0,1,1)

5) Vertex texture coordinates
    

6) Parameters:
    1] gl: WebGLRenderingContext
    2] options:
        -  color: array of 4 floats (default: [0.8, 0.8, 0.8, 1.0 ])
           in this case, all vertices have the same given color
           ex) const cube = new Cube(gl, {color: [1.0, 0.0, 0.0, 1.0]}); (all red)

7) Vertex shader: the location (0: position attrib (vec3), 1: normal attrib (vec3),
                            2: color attrib (vec4), and 3: texture coordinate attrib (vec2))
8) Fragment shader: should catch the vertex color from the vertex shader
-----------------------------------------------------------------------------*/
export class SquarePyramid {
  constructor(gl, options = {}) {
    this.gl = gl;

    const half = 0.5, yBase = 0, yApex = 1;
    const b0 = [ half, yBase,  half];
    const b1 = [-half, yBase,  half];
    const b2 = [-half, yBase, -half];
    const b3 = [ half, yBase, -half];
    const apex = [0, yApex, 0];

    this.vertices = new Float32Array([
      ...b0, ...b1, ...b2, ...b3,
      ...apex, ...b1, ...b0,
      ...apex, ...b3, ...b0,
      ...apex, ...b2, ...b3,
      ...apex, ...b2, ...b1,
    ]);

    const nBottom = [0,-1,0];
    const nFront  = [0,0.4472136, 0.8944272];
    const nRight  = [0.8944272,0.4472136,0];
    const nBack   = [0,0.4472136,-0.8944272];
    const nLeft   = [-0.8944272,0.4472136,0];

    this.normals = new Float32Array([
      ...nBottom, ...nBottom, ...nBottom, ...nBottom,
      ...nFront,  ...nFront,  ...nFront,
      ...nRight,  ...nRight,  ...nRight,
      ...nBack,   ...nBack,   ...nBack,
      ...nLeft,   ...nLeft,   ...nLeft,
    ]);

    if (options.color) {
      const c = options.color;
      this.colors = new Float32Array(16 * 4);
      for (let i = 0; i < 16; i++) {
        const o = i * 4;
        this.colors[o] = c[0];
        this.colors[o+1] = c[1];
        this.colors[o+2] = c[2];
        this.colors[o+3] = c[3];
      }
    } else {
      const blue=[0,0,1,1], red=[1,0,0,1], yellow=[1,1,0,1], magenta=[1,0,1,1], cyan=[0,1,1,1];
      this.colors = new Float32Array([
        ...blue, ...blue, ...blue, ...blue,
        ...red,  ...red,  ...red,
        ...yellow, ...yellow, ...yellow,
        ...magenta, ...magenta, ...magenta,
        ...cyan, ...cyan, ...cyan,
      ]);
    }

    this.texCoords = new Float32Array([
      1,1, 0,1, 0,0, 1,0,
      0.5,1, 0,0, 1,0,
      0.5,1, 0,0, 1,0,
      0.5,1, 0,0, 1,0,
      0.5,1, 0,0, 1,0,
    ]);

    this.indices = new Uint16Array([
      0,3,2, 2,1,0,
      5,6,4,
      8,9,7,
      11,12,10,
      14,15,13,
    ]);

    this.faceNormals = new Float32Array(this.normals);
    this.vertexNormals = new Float32Array(this.normals);

    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    this.ebo = gl.createBuffer();

    this.initBuffers();
  }

  copyVertexNormalsToNormals() {
    this.normals.set(this.vertexNormals);
  }

  copyFaceNormalsToNormals() {
    this.normals.set(this.faceNormals);
  }

  initBuffers() {
    const gl = this.gl;
    const vSize = this.vertices.byteLength;
    const nSize = this.normals.byteLength;
    const cSize = this.colors.byteLength;
    const tSize = this.texCoords.byteLength;
    const totalSize = vSize + nSize + cSize + tSize;

    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
    gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
    gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
    gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);
    gl.enableVertexAttribArray(1);

    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);
    gl.enableVertexAttribArray(2);

    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);
    gl.enableVertexAttribArray(3);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  updateNormals() {
    const gl = this.gl;
    const vSize = this.vertices.byteLength;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  draw(shader) {
    const gl = this.gl;
    shader.use();
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  delete() {
    const gl = this.gl;
    gl.deleteBuffer(this.vbo);
    gl.deleteBuffer(this.ebo);
    gl.deleteVertexArray(this.vao);
  }
}
