import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, mult, rotateX, rotateY, inverse, perspective } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as PYRAMID from '../../libs/objects/pyramid.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as BUNNY from '../../libs/objects/bunny.js';
import * as TORUS from '../../libs/objects/torus.js';

/** @type WebGLRenderingContext */
let gl;
let uColor;
let mode; 


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas); 
    mode = gl.TRIANGLES; 

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = perspective(45,aspect, 1, 150)
    let mView = lookAt([6, 4, 6], [0, 0, 0], [0, 1, 0]);
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
    gl.enable(gl.DEPTH_TEST);
    
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
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        uploadProjection(mProjection);
        
        loadMatrix(mView);
        
        uColor = gl.getUniformLocation(program, "uColor");


        pushMatrix()
            multTranslation([0,-2,0])
            objects();
            drawPlane();
        popMatrix()
    }

    function objects() {
    
        gl.uniform3fv(uColor, vec3(1.0, 0.0, 1.0));
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
        multTranslation([0.0, 2/2, 0.0]);
        multScale([15, 15, 15]);
        uploadModelView();
        BUNNY.draw(gl, program, mode);
    }

    function drawPlane() {
        gl.uniform3fv(uColor, vec3(1.0, 0.0, 0.0));
        pushMatrix()
            multTranslation([0.0, -1/2, 0.0]);
            multScale([10, 1, 10]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix()
    }
}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
