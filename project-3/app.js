import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, mult, rotateX, rotateY, inverse, transpose, normalMatrix, perspective } from "../../libs/MV.js";
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
let mode;
let uKa;
let uKd;
let uKs;
let shininess;
let uMaterial;
let nLights = 1;

//GUI
let cameraObj = {fovy: 45, near: 0.1, far: 30};
let optionsObj = {backface_culling: true, depth_test: true};
let materialObj = {Ka: vec3(150, 150, 150), Kd: vec3(150, 150, 150), Ks: vec3(200, 200, 200), shininess: 100};
let lightPos = {x: 0, y: 0, z:10, w: 1};
let lightIntensities = {ambient: vec3(50, 50, 50), diffuse: vec3(60, 60, 60), specular: vec3(200, 200, 200)};
let lightAxis = {x: 0, y: 0, z:-1};;

const gui = new GUI()

//options
const options = gui.addFolder('options')
options.add(optionsObj, 'backface_culling', true, false)
options.add(optionsObj, 'depth_test', true, false)
options.open()
//camera
const camera = gui.addFolder('camera')
camera.add(cameraObj, 'fovy', 0, 180)
camera.add(cameraObj, 'near', 0, 25) 
camera.add(cameraObj, 'far', 0, 40)
camera.open()
//material
const material = gui.addFolder('material')
material.addColor(materialObj, 'Ka', 0, 255)
material.addColor(materialObj, 'Kd', 0, 255) 
material.addColor(materialObj, 'Ks', 0, 255)
material.add(materialObj, 'shininess', 100)
material.open()
//lights
const lights = gui.addFolder('lights')
const light1 = lights.addFolder('light 1')
//pos
const position = light1.addFolder('position')
position.add(lightPos, 'x', -20, 20)
position.add(lightPos, 'y', -20, 20)
position.add(lightPos, 'z', -20, 20)
position.add(lightPos, 'w', 1)
//intensities
const intensities = light1.addFolder('intensities')
intensities.addColor(lightIntensities, 'ambient', 0, 255)
intensities.addColor(lightIntensities, 'diffuse', 0, 255)
intensities.addColor(lightIntensities, 'specular', 0, 255)
//axis
const axis = light1.addFolder('axis')
axis.add(lightAxis, 'x', -20, 20)
axis.add(lightAxis, 'y', -20, 20)
axis.add(lightAxis, 'z', -20, 20)

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
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

        let ambient;
        let diffuse;
        let specular;
        let position;
        
        gl.uniformMatrix4fv(mModelView,false,  flatten(modelView()));
        gl.uniformMatrix4fv(mNormals,false,  flatten(normalMatrix(modelView())));
        gl.uniformMatrix4fv(mview, false, flatten(mView));
        gl.uniformMatrix4fv(mViewNormals,false, flatten(normalMatrix(mView)));
        gl.uniformMatrix4fv(mprojection,false, flatten(mProjection));
        gl.uniform1i(uNLights, nLights);

        for(let i=0; i < nLights; i++) {
            ambient = gl.getUniformLocation(program, "uLights[" + i + "].ambient");
            diffuse = gl.getUniformLocation(program, "uLights[" + i + "].diffuse");
            specular = gl.getUniformLocation(program, "uLights[" + i + "].specular");
            position = gl.getUniformLocation(program, "uLights[" + i + "].position");
            gl.uniform3fv(ambient, lightIntensities.ambient); 
            gl.uniform3fv(diffuse, lightIntensities.diffuse);  
            gl.uniform3fv(specular, lightIntensities.specular);
            gl.uniform4fv(position, vec4(lightPos.x, lightPos.y, lightPos.z, lightPos.w));
        }

        pushMatrix()
            multTranslation([0,-2,0])
            objects();
            drawPlane();
        popMatrix()

        if(optionsObj.depth_test)
            gl.enable(gl.DEPTH_TEST);
        else
            gl.disable(gl.DEPTH_TEST);

        if(optionsObj.backface_culling) {
            gl.enable(gl.CULL_FACE);
        }
        else
            gl.disable(gl.CULL_FACE);
    }

    function objects() {
        
        
        pushMatrix()
            multTranslation([-2.5, 0, -2.5]);
            cube()
        popMatrix();
        
   
        pushMatrix()
            multTranslation([-2.5, 0, 2.5]);
            cylinder()
        popMatrix();
 

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
