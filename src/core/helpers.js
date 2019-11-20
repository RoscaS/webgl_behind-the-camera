// Group: B4
// Object: Infography Project 1
// Date: 18 november 2019
// Tristan Seuret
// Nathan Latino
// Sol Rosca

let degToRad = deg => deg * Math.PI / 180;
let radToDeg = rad => rad * 180 / Math.PI;

function createShaderProgram(gl, vertex, fragment) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragment);
  return createProgram(gl, vertexShader, fragmentShader);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function resizeCanvasToDisplaySize(canvas, callback) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    callback();
    return true;
  }
  return false;
}

function createHtmlElement(type, parent, className) {
  const elem = document.createElement(type);
  parent.appendChild(elem);
  if (className) elem.className = className;
  return elem;
}

