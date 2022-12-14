import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten,vec2, vec3, vec4, mult, rotateX, rotateY, inverse, transpose, normalMatrix, perspective } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";
import { GUI } from '../../libs/dat.gui.module.js'

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as PYRAMID from '../../libs/objects/pyramid.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as BUNNY from '../../libs/objects/bunny.js';
import * as TORUS from '../../libs/objects/torus.js';

/** @type WebGLRenderingContext */
let gl;
let canvas = document.getElementById("gl-canvas");;
let mode;
let uKa;
let uKd;
let uKs;
let shininess;
let uMaterial;
let nLights = 3;
let dragging = false;
let cursorPosition = vec2(0.0);

let optionsObj = {
    Mode : NaN,
    DepthTest : true,
    BackfaceCulling : true
}

let cameraObj = {
    Gama : 0,
    Theta : 0,
    fovy : 45,
    near : 0.1,
    far : 60,
    eye : vec3(-15, 5, 0),
    at : vec3(0, 0, 0),
    up : vec3(0, 1, 0)
}

let lights = [
    {
    ambient : [50,0,0],
    diffuse : [60,60,60],
    specular : [200,200,200],
    position : [20,-5.0,0.0,0.0],
    axis : [0.0,0.0,-1.0],
    aperture : 10.0,
    cutoff  : 10
    },
    {
    ambient : [50,0,0],
    diffuse : [50,0,0],
    specular : [150,0,0],
    position : [-20.0,5.0,5.0,0.0],
    axis : [20.0,-5.0,-5.0],
    aperture : 180.0,
    cutoff  : -1
    },
    {
    ambient : [75,75,100],
    diffuse : [75,75,100],
    specular : [150,150,175],
    position : [0,0,10,0.0],
    axis : [-5.0,-5.0,-2.0],
    aperture : 180.0,
    cutoff  : -1
    }
];


let materialObj = {
    Ka : [255,255,255],
    Kd : [0,0,0],
    Ks : [0,0,0],
    shininess : 100.0
}

let groundMaterial = {
    Ka: [150,150,75],
    Kd: [125,125,125],
    Ks: [0,0,0],
    shininess : 100.0
}

let grayMaterial = {
    Ka: [60,70,150],
    Kd: [150,150,150],
    Ks: [200,70,200],
    shininess : 10.0
}

let redMaterial = {
    Ka: [150,150,150],
    Kd: [150,150,150],
    Ks: [200,200,200],
    shininess : 10.0
};

let greenMaterial = {
    Ka: [50,150,50],
    Kd: [50,150,50],
    Ks: [200,200,200],
    shininess : 10.0
}

//GUI
const gui = new GUI()

//options
const options = gui.addFolder('Options')
options.add(optionsObj, 'BackfaceCulling', true, false).name('backface culling')
options.add(optionsObj, 'DepthTest', true, false).name('depth test')
options.open()

//camera
const camera = gui.addFolder('Camera')
camera.add(cameraObj, 'fovy', 0, 180).step(0.1).listen();
camera.add(cameraObj, 'near', 0, 25) .step(0.1).listen();
camera.add(cameraObj, 'far', 0, 40).step(0.1).listen();
camera.add(cameraObj, 'Gama', -180, 180).step(0.1).listen();
camera.add(cameraObj, 'Theta', -180, 180).step(0.1).listen();
camera.open()

//eye
const eye = camera.addFolder('Eye')
eye.add(cameraObj.eye, 0, -50, 50).step(0.1).name('x').listen();
eye.add(cameraObj.eye, 1, -50, 50).step(0.1).name('y').listen();
eye.add(cameraObj.eye, 2, -50, 50).step(0.1).name('z').listen();

//at
const at = camera.addFolder('At')
at.add(cameraObj.at, 0, -50, 50).step(0.1).name('x').listen();
at.add(cameraObj.at, 1, -50, 50).step(0.1).name('y').listen();
at.add(cameraObj.at, 2, -50, 50).step(0.1).name('z').listen();

//up
const up = camera.addFolder('Up')
up.add(cameraObj.up, 0).step(0.1).name('x').listen();
up.add(cameraObj.up, 1).step(0.1).name('y').listen();
up.add(cameraObj.up, 2).step(0.1).name('z').listen();

//material
const material = gui.addFolder('Material')
material.addColor(materialObj, 'Ka', 0, 255).listen();
material.addColor(materialObj, 'Kd', 0, 255).listen();
material.addColor(materialObj, 'Ks', 0, 255).listen();
material.add(materialObj, 'shininess',0, 100).listen();
material.open()

//lights
const lightsFolder= gui.addFolder('Lights')
for(let i=0; i < nLights; i++) {
    let light = lightsFolder.addFolder('Light' + (i+1));
    light.add(lights[i], 'aperture').step(0.1).listen();
    light.add(lights[i], 'cutoff').step(0.1).name('cut off').listen();

    const intensities = light.addFolder('Intensities')
    intensities.addColor(lights[i], 'ambient').listen();
    intensities.addColor(lights[i], 'diffuse').listen();
    intensities.addColor(lights[i], 'specular').listen();

    const position = light.addFolder('Position')
    position.add(lights[i].position,0).step(0.1).name('x').listen();
    position.add(lights[i].position,1).step(0.1).name('y').listen();
    position.add(lights[i].position,2).step(0.1).name('z').listen();
    position.add(lights[i].position,3, 0, 1).step(0.1).name('w').listen();

    const axis = light.addFolder('Axis')
    axis.add(lights[i].axis,0).step(0.1).name('x').listen();
    axis.add(lights[i].axis,1).step(0.1).name('y').listen();
    axis.add(lights[i].axis,2).step(0.1).name('z').listen();

}

function getCursorPosition(canvas, event) {
    const mx = event.offsetX;
    const my = event.offsetY;

    cursorPosition[0]=((mx / canvas.width * 2) - 1) * 1.5;
    cursorPosition[1]=(((canvas.height - my)/canvas.height * 2) -1)*(1.5 * canvas.height / canvas.width);

    return vec2(cursorPosition[0], cursorPosition[1]);
}

let initpos = vec2(0,0);
    canvas.addEventListener("mousedown", function(event) {
        dragging = true;
        initpos = getCursorPosition(canvas, event);
    });

    canvas.addEventListener("mouseup", function(event) {
        dragging = false;
    });

    canvas.addEventListener("mousemove", function(event) {
        const cursorPos = getCursorPosition(canvas, event);
        if (dragging) {
            var dy = (cursorPos[1] - initpos[1]) * 180; //???
            var dx = (cursorPos[0] - initpos[0]) * 45; //???

            if(cameraObj.Theta > 180) cameraObj.Theta = 180
            else cameraObj.Theta += dy;

            if(cameraObj.Gama > 180) cameraObj.Gama = 180
            else cameraObj.Gama += dx;

            if(cameraObj.Theta < -180) cameraObj.Theta = -180
            else cameraObj.Theta += dy;

            if(cameraObj.Gama < -180) cameraObj.Gama = -180
            else cameraObj.Gama += dx;

        }
        initpos[0] = cursorPos[0];
        initpos[1] = cursorPos[1];
    });

function setup(shaders)
{
    //canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas); 
    mode = gl.TRIANGLES; 

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = perspective(cameraObj.fovy, aspect, cameraObj.near, cameraObj.far)
    let mView = lookAt([-15, 5, 0], [0, 0, 0], [0, 1, 0]);

    resize_canvas();
    window.addEventListener("resize", resize_canvas);


    document.onkeydown = function(event) {
    
        switch(event.key) { 
            case 'w':
                mode = gl.LINES; 
                break;
            case 's':
                mode = gl.TRIANGLES;
                break;
         }
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    PYRAMID.init(gl);
    SPHERE.init(gl);
    CUBE.init(gl);
    CYLINDER.init(gl);
    BUNNY.init(gl);
    TORUS.init(gl);
    
    window.requestAnimationFrame(render);

    function resize_canvas(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        //mProjection = ortho(-aspect*zoom, aspect*zoom, -zoom, zoom, -100, 100);
    }
    
    function uploadProjection()
    {
        uploadMatrix("mProjection", mProjection);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function uploadMatrix(name, m) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, flatten(m));
    }


    function render() {
        mProjection = perspective(cameraObj.fovy, aspect, cameraObj.near, cameraObj.far)
       // mView = mult(lookAt([-15, 5, 0], [0, 0, 0], [0, 1, 0]),mult(rotateX(cameraObj.Theta), rotateY( cameraObj.Gama)));
        mView = mult(lookAt([cameraObj.eye[0], cameraObj.eye[1], cameraObj.eye[2]], [cameraObj.at[0], cameraObj.at[1], cameraObj.at[2]], [cameraObj.up[0], cameraObj.up[1], cameraObj.at[2]]),mult(rotateX(cameraObj.Theta), rotateY( cameraObj.Gama)));

        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        uploadProjection(mProjection);
        
        loadMatrix(mView);

        uKa = gl.getUniformLocation(program, "uMaterial.Ka");
        uKd = gl.getUniformLocation(program, "uMaterial.Kd");
        uKs = gl.getUniformLocation(program, "uMaterial.Ks");
        shininess = gl.getUniformLocation(program, "uMaterial.shininess");

        const mModelView = gl.getUniformLocation(program, "mModelView");
        const mNormals = gl.getUniformLocation(program, "mNormals"); 
        const mview = gl.getUniformLocation(program, "mView"); 
        const mViewNormals = gl.getUniformLocation(program, "mViewNormals"); 
        const mprojection = gl.getUniformLocation(program, "mProjection");
        
        const uNLights =  gl.getUniformLocation(program, "uNLights");
        uMaterial = gl.getUniformLocation(program, "uMaterial");
        
        gl.uniformMatrix4fv(mModelView,false,  flatten(modelView()));
        gl.uniformMatrix4fv(mNormals,false,  flatten(normalMatrix(modelView())));
        gl.uniformMatrix4fv(mview, false, flatten(mView));
        gl.uniformMatrix4fv(mViewNormals,false, flatten(normalMatrix(mView)));
        gl.uniformMatrix4fv(mprojection,false, flatten(mProjection));
        gl.uniform1i(uNLights, nLights);

        let ambient;
        let diffuse;
        let specular;
        let position;
        let axis;
        let cutoff;
        let aperture;


        for(let i=0; i < nLights; i++) {
            ambient = gl.getUniformLocation(program, "uLights[" + i + "].ambient");
            diffuse = gl.getUniformLocation(program, "uLights[" + i + "].diffuse");
            specular = gl.getUniformLocation(program, "uLights[" + i + "].specular");
            position = gl.getUniformLocation(program, "uLights[" + i + "].position");
            axis = gl.getUniformLocation(program, "uLights[" + i + "].axis");
            cutoff = gl.getUniformLocation(program, "uLights[" + i + "].cutoff");
            aperture = gl.getUniformLocation(program, "uLights[" + i + "].aperture");
            gl.uniform3fv(ambient, lights[i].ambient); 
            gl.uniform3fv(diffuse, lights[i].diffuse);  
            gl.uniform3fv(specular, lights[i].specular);
            gl.uniform4fv(position, vec4(lights[i].position[0], lights[i].position[1], lights[i].position[2], lights[i].position[3]));
            gl.uniform3fv(position, vec3(lights[i].axis[0], lights[i].axis[1], lights[i].axis[2]));
            gl.uniform1f(position, vec3(lights[i].cutoff));
            gl.uniform1f(position, vec3(lights[i].aperture));
        }

        pushMatrix()
            multTranslation([0,-2,0])
            objects();
            drawPlane();
        popMatrix()

        if(optionsObj.DepthTest)
            gl.enable(gl.DEPTH_TEST);
        else
            gl.disable(gl.DEPTH_TEST);

        if(optionsObj.BackfaceCulling) {
            gl.enable(gl.CULL_FACE);
        }
        else
            gl.disable(gl.CULL_FACE);
    }

    function objects() {
        
        gl.uniform3fv(uKa, redMaterial.Ka);
        gl.uniform3fv(uKd, redMaterial.Kd);
        gl.uniform3fv(uKs, redMaterial.Ks);
        gl.uniform1f(shininess, redMaterial.shininess);
        pushMatrix()
            multTranslation([-2.5, 0, -2.5]);
            cube()
        popMatrix();
        
        gl.uniform3fv(uKa, greenMaterial.Ka);
        gl.uniform3fv(uKd, greenMaterial.Kd);
        gl.uniform3fv(uKs, greenMaterial.Ks);
        gl.uniform1f(shininess, greenMaterial.shininess);
        pushMatrix()
            multTranslation([-2.5, 0, 2.5]);
            cylinder()
        popMatrix();
 
        gl.uniform3fv(uKa, grayMaterial.Ka);
        gl.uniform3fv(uKd, grayMaterial.Kd);
        gl.uniform3fv(uKs, grayMaterial.Ks);
        gl.uniform1f(shininess, grayMaterial.shininess);
        pushMatrix()
            multTranslation([2.5, 0, -2.5]);
            torus()
        popMatrix();
       

        gl.uniform3fv(uKa, materialObj.Ka);
        gl.uniform3fv(uKd, materialObj.Kd);
        gl.uniform3fv(uKs, materialObj.Ks);
        gl.uniform1f(shininess, materialObj.shininess);
        pushMatrix()
            multTranslation([2.5, 0, 2.5]);
            bunny()
        popMatrix();
    }

    function cylinder() {
        multTranslation([0.0, 2/2 , 0.0]);
        multScale([2, 2, 2]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }

    function cube() {
        multTranslation([0.0, 2/2 , 0.0]);
        multScale([2, 2, 2]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function torus() {
        multTranslation([0.0, 2/2 , 0.0]);
        multScale([2, 2, 2]);
        uploadModelView();
        TORUS.draw(gl, program, mode);
    }

    function bunny() {
        multScale([15, 15, 15]);
        uploadModelView();
        BUNNY.draw(gl, program, mode);
    }

    function drawPlane() {
        gl.uniform3fv(uKa, groundMaterial.Ka);
        gl.uniform3fv(uKd, groundMaterial.Kd);
        gl.uniform3fv(uKs, groundMaterial.Ks);
        gl.uniform1f(shininess, groundMaterial.shininess);
        pushMatrix()
            multTranslation([0.0, -0.5/2, 0.0]);
            multScale([10, 0.5, 10]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix()
    }
}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
