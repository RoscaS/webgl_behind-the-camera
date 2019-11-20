// Group: B4
// Object: Infography Project 1
// Date: 18 november 2019
// Tristan Seuret
// Nathan Latino
// Sol Rosca

/**
 * This project allows the user to visualize the camera's frustrum.
 * By using a technique that allows us to split a view, two
 * scenes using differents camera are created. The last one
 * looks at the first one and allows us to see an object that
 * represents the camera and it's frustrum in the other view.
 */
class Project {
  constructor() {
    this.gl = document.getElementById('canvas').getContext('webgl');
    window.addEventListener('resize', this.render);

    this.programShape = createShaderProgram(this.gl, vertexA, fragmentA);
    this.programCamera = createShaderProgram(this.gl, vertexB, fragmentB);

    this.fShape = new FShape(this.gl, this.programShape);
    this.cameraShape = new CameraShape(this.gl, this.programCamera);
    this.frustrumShape = new FrustrumShape(this.gl, this.programCamera);

    this.initControlValues();
    this.initHtmlElements();
    this.initUI();

    this.render();
  }

  //------------------------------------------------------------------*\
  //							               RENDERING
  //------------------------------------------------------------------*/

  /**
   * Logic's entry point. Needs to be an arrow function to allows the use
   * of Project's `this` when used as a callback.
   */
  render = () => {

    resizeCanvasToDisplaySize(this.gl.canvas, this.render);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.SCISSOR_TEST);
    this.gl.canvas.style.transform = `translateY(${ window.scrollY }px`;
    this.gl.useProgram(this.programShape);

    let worldMatrix = this.createWorldMatrix();

    // SCENES
    this.fShape.initBuffers();
    let leftAspect = this.getSplittedAspectRatio(this.leftHtmlElement);
    let leftCamera = this.getCameraMatrix(this.getCameraPosition());
    let leftProjection = this.settings.orthographic
                         ? this.createOrthographicProjection(leftAspect)
                         : this.createPerspectiveProjection(this.leftFovRad(), leftAspect, true);
    this.drawArray(worldMatrix, leftCamera, leftProjection);

    let rightAspect = this.getSplittedAspectRatio(this.rightHtmlElement);
    let rightCamera = this.getCameraMatrix(this.getFixedCameraPosition());
    let rightProjection = this.createPerspectiveProjection(this.rightFovRad(), rightAspect, false);
    this.drawArray(worldMatrix, rightCamera, rightProjection);

    // CAMERA AND FRUSTRUM
    this.drawUniforms(rightCamera, rightProjection, leftCamera, leftProjection);
  };

  //------------------------------------------------------------------*\
  //							               SCENE
  //------------------------------------------------------------------*/

  /**
   * Compute the "part" of the viewport where a scene is rendered.
   * Returns that part's aspect ratio.
   */
  getSplittedAspectRatio(htmlElement) {
    const rect = htmlElement.getBoundingClientRect();
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const left = rect.left;
    const bottom = this.gl.canvas.clientHeight - rect.bottom - 1;

    this.gl.viewport(left, bottom, width, height);
    this.gl.scissor(left, bottom, width, height);
    this.gl.clearColor(0, 0, 0, 1);

    return width / height;
  }

  getCameraMatrix(position) {
    const up = [0, 1, 0];
    const target = [0, 0, 0];
    return m4.lookAt(position, target, up);
  }

  //------------------------------------------------------------------*\
  //							               MATRICES
  //------------------------------------------------------------------*/

  createWorldMatrix() {
    let worldMatrix = m4.yRotation(degToRad(this.settings.f_rotation));
    worldMatrix = m4.xRotate(worldMatrix, degToRad(this.settings.f_rotation));
    return m4.translate(worldMatrix, -35, -75, -5);
  }

  createOrthographicProjection(aspectRatio) {
    return m4.orthographic(
      -this.settings.ortho_size * aspectRatio,
      this.settings.ortho_size * aspectRatio,
      -this.settings.ortho_size,
      this.settings.ortho_size,
      this.settings.cam_near,
      this.settings.cam_far,
    );
  }

  createPerspectiveProjection(angle, aspectRatio, isPOV) {
    let near = isPOV ? this.settings.cam_near : this.settings.near;
    let far = isPOV ? this.settings.cam_far : this.settings.far;
    return m4.perspective(angle, aspectRatio, near, far);
  }

  //------------------------------------------------------------------*\
  //							               DRAWING
  //------------------------------------------------------------------*/

  /**
   * In charge of drawing the F shape. It's called twice. Once
   * for each scene.
   */
  drawArray(worldMatrix, cameraMatrix, projectionMatrix) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const viewMatrix = m4.inverse(cameraMatrix);
    let matrix = m4.multiply(projectionMatrix, viewMatrix);
    matrix = m4.multiply(matrix, worldMatrix);

    this.gl.uniformMatrix4fv(this.fShape.matrixUniformLocation, false, matrix);

    let primitiveType = this.gl.TRIANGLES;
    let offset = 0;
    let count = this.fShape.size / 3;
    this.gl.drawArrays(primitiveType, offset, count);
  }

  /**
   * In charge of drawing the the camera represantation and it's
   * frustrum.
   */
  drawUniforms(sceneB_cMatrix, sceneB_pMatrix, sceneA_cMatrix, sceneA_pMatrix) {
    this.gl.useProgram(this.programCamera);
    let color = [1, 1, 1, 1];
    let primitiveType = this.gl.LINES;
    let count = 0;
    let offset = 0;

    let viewMatrix = m4.inverse(sceneB_cMatrix);
    let matrix = m4.multiply(sceneB_pMatrix, viewMatrix);

    // CAMERA
    matrix = m4.multiply(matrix, sceneA_cMatrix);
    this.cameraShape.initBuffers(matrix);
    this.gl.uniformMatrix4fv(this.cameraShape.matrixUniformLocation, false, matrix);
    this.gl.uniform4fv(this.cameraShape.colorUniformLocations, color);

    count = this.cameraShape.indices.length;
    this.gl.drawElements(primitiveType, count, this.gl.UNSIGNED_SHORT, offset);

    // FRUSTRUM
    matrix = m4.multiply(matrix, m4.inverse(sceneA_pMatrix));
    this.frustrumShape.initBuffers(matrix);
    this.gl.uniformMatrix4fv(this.frustrumShape.matrixUniformLocation, false, matrix);
    this.gl.uniform4fv(this.frustrumShape.colorUniformLocations, color);

    count = this.frustrumShape.indices.length;
    this.gl.drawElements(primitiveType, count, this.gl.UNSIGNED_SHORT, offset);
  }

  //------------------------------------------------------------------*\
  //							              HTML
  //------------------------------------------------------------------*/

  initHtmlElements() {
    const scenesEl = document.querySelector('#scenes');
    let leftOuterEl = createHtmlElement('div', scenesEl, 'item');
    let rightOuterEl = createHtmlElement('div', scenesEl, 'item');

    this.leftHtmlElement = createHtmlElement('div', leftOuterEl, 'view');
    this.rightHtmlElement = createHtmlElement('div', rightOuterEl, 'view');
  }

  //------------------------------------------------------------------*\
  //							                UI
  //------------------------------------------------------------------*/

  initUI() {
    webglLessonsUI.setupUI(document.querySelector('#uiLeft'), this.settings, [
      { type: 'slider', key: 'cam_X', min: -350, max: 350, change: this.render },
      { type: 'slider', key: 'cam_Y', min: -350, max: 350, change: this.render },
      { type: 'slider', key: 'cam_Z', min: -350, max: 350, change: this.render },
    ]);
    webglLessonsUI.setupUI(document.querySelector('#uiCenter'), this.settings, [
      {
        type: 'slider',
        key: 'f_rotation',
        min: 0,
        max: 360,
        change: this.render,
        precision: 2,
        step: 0.001,
      },
      { type: 'slider', key: 'cam_near', min: 1, max: 500, change: this.render },
      { type: 'slider', key: 'cam_far', min: 1, max: 800, change: this.render },
    ]);

    webglLessonsUI.setupUI(document.querySelector('#uiRight'), this.settings, [

      {
        type: 'slider',
        key: 'cam_fov',
        min: 1,
        max: 170,
        change: this.render,
      },
      { type: 'slider', key: 'ortho_size', min: 1, max: 150, change: this.render },
      { type: 'checkbox', key: 'orthographic', change: this.render },

    ]);
  }

  //------------------------------------------------------------------*\
  //							                SETTINGS
  //------------------------------------------------------------------*/

  initControlValues() {
    this.settings = {
      f_rotation: 170,
      cam_fov: 60,
      right_fov: 60,
      quality: false,

      // cam_X: -100,
      // cam_Y: 0,
      // cam_Z: -300,

      cam_X: 0,
      cam_Y: 0,
      cam_Z: -300,

      fix_X: -700,
      fix_Y: 400,
      fix_Z: -400,

      cam_near: 60,
      cam_far: 550,

      orthographic: false,
      ortho_size: 120,

      near: 1,
      far: 2000,

      cameraScale: 20,
    };
  }

  leftFovRad = () => degToRad(this.settings.cam_fov);
  rightFovRad = () => degToRad(this.settings.right_fov);
  getCameraPosition = () => [this.settings.cam_X, this.settings.cam_Y, this.settings.cam_Z];
  getFixedCameraPosition = () => [this.settings.fix_X, this.settings.fix_Y, this.settings.fix_Z];
}
