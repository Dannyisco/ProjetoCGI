import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3 } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as PYRAMID from '../../libs/objects/pyramid.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as BUNNY from '../../libs/objects/bunny.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 0.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running
let ex = 0;
let ey = 0;
let ez = 1;
let height = 0;
let distance = 0;
let inclination = 0;

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-aspect,aspect, -1, 1,-3,3);

    mode = gl.TRIANGLES; 

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
            case 'p':
                animation = !animation;
                break;
            case "ArrowLeft":
                
                break;
            case "ArrowUp":
                if(height < 0.6){
                    height += 0.01;
                    speed += 0.01;
                    inclination += 0.5
                }
                break;
            case "ArrowDown":
                if(height > 0) {
                    height -= 0.01;
                    speed -= 0.01;
                    inclination -= 0.5
                }
                break;
            case "1":
                ex = 1;
                ey = 1;
                ez = 1;  
                break;
            case "2":
                ex = -1;
                ey = 0;
                ez = 0;  
                break;
            case "3":
                ex = 0.2;
                ey = 2.2;
                ez = 0;   
                break;
            case "4":
                ex = 0;
                ey = 0;
                ez = -1; 
                break;
         }
    };

    
    

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    PYRAMID.init(gl);
    SPHERE.init(gl);
    CUBE.init(gl);
    CYLINDER.init(gl);
    BUNNY.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);




    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-aspect,aspect, -1, 1,-3,3);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

   

    function render()
    {
        if(animation) time += speed;
        if(height == 0)
            speed = 0;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        loadMatrix(lookAt([ex,ey,ez], [0,0,0], [0,1,0]));

        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(1.0, 0.0, 0.0));

        

        pushMatrix();
           
            multRotationY(360 * time * 0.05);
            multTranslation([0.22+distance, 0.06+height, 0.0]);
            multRotationX(-inclination);
            multRotationY(-90);
            multScale([0.1,0.1,0.1]);
            helicopter();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.0, 0.0, 1.0));
        background();
    }

    function cabin() {
        multTranslation([0.0, -0.25, 0.0]);
        multScale([0.65, 0.35, 0.3]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }
    
    function tailCone() {
        multTranslation([0.0, -0.12, 0.0]);
        multScale([0.90, 0.10, 0.08]);
        multTranslation([0.5, -0.5, 0.0]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }
    
    function tailFin() {
        multTranslation([0.83, -0.17, 0.0]);
        multRotationZ(70);
        multScale([0.2, 0.10, 0.08]);
        multTranslation([0.5, -0.5, 0.0]);

        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }


    function landingSkids(){
        pushMatrix();
            multTranslation([0.0, -0.6, 0.2])
            landingSkid();
        popMatrix();
        pushMatrix()
            multTranslation([0.0, -0.6, -0.2])
            landingSkid();
        popMatrix();
        pushMatrix();
            multTranslation([-0.12, -0.43, 0.1]);
            multRotationX(-30);
            multRotationZ(55);
            landingSkidSuporter();
        popMatrix();
        pushMatrix();
            multTranslation([0.12, -0.43, 0.1]);
            multRotationX(-30);
            multRotationZ(-55);
            landingSkidSuporter();
        popMatrix();
        pushMatrix();
            multRotationY(180);
            multTranslation([-0.12, -0.43, 0.1]);
            multRotationX(-30);
            multRotationZ(55);
            landingSkidSuporter();
        popMatrix();
        pushMatrix();
            multRotationY(180);
            multTranslation([0.12, -0.43, 0.1]);
            multRotationX(-30);
            multRotationZ(-55);
            landingSkidSuporter();
        popMatrix();
        
    }

    function landingSkid(){
        multRotationZ(-90);
        multScale([0.03, 0.6, 0.02]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }

    
    function landingSkidSuporter(){
        
        multScale([0.48, 0.025, 0.020]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function blades() {
        pushMatrix();
            multRotationY(360*time);
            multRotationY(120);
            topBlade();
        popMatrix();
        pushMatrix()
            multRotationY(360*time);
            multRotationY(240);
            topBlade();
        popMatrix();
        pushMatrix();
            multRotationY(360*time);
            topBlade();
        popMatrix();
        pushMatrix();
            multTranslation([0.91, -0.1, 0.05]);
            multRotationZ(360*time);
            multRotationY(180);
            rearBlade();
        popMatrix();
        pushMatrix();
            multTranslation([0.91, -0.1, 0.05]);
            multRotationZ(360*time);
            rearBlade();
        popMatrix();
    }

    function topBlade()
    {
        multTranslation([0.35, -0.04, 0.0]);
        multRotationZ(90);
        multScale([0.02, 0.7, 0.02]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function rearBlade(){
        multTranslation([0.1, 0.0, 0.0]);
        multRotationZ(90);
        multScale([0.04, 0.2, 0.01]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function mast(){
        multScale([0.03, 0.09, 0.03]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }


    function masts(){
        pushMatrix();
            multRotationY(360*time);
            multTranslation([0.0, -0.06, 0.0]);
            mast();
        popMatrix();
        pushMatrix();
            multRotationX(90);
            multTranslation([0.91, 0.04, 0.1]);
            multRotationY(360*time);
            mast();
        popMatrix();
    }



    function helicopter() {
        pushMatrix();
            blades();
        popMatrix();

        pushMatrix();
            cabin();
        popMatrix();

        pushMatrix();
            tailCone();
        popMatrix();

        pushMatrix();
            tailFin();
        popMatrix();

        pushMatrix();
            landingSkids();
        popMatrix();

        pushMatrix();
            masts();
        popMatrix();

    }

    function background() {
        pushMatrix();
            plane();
        popMatrix();
    }

    function plane(){
        multTranslation([0.0, -0.005, 0.0]);
        multScale([2.0, 0.01, 2.0]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }


}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
