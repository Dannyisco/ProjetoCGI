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
let inclination = 0;

const CABIN_LENGTH = 0.65;
const CABIN_WIDTH = 0.3;
const CABIN_HEIGHT = 0.35;

const TAIL_CONE_LENGTH = 0.9;
const TAIL_FIN_LENGTH = 0.2;
const TAIL_WIDTH = 0.08;
const TAIL_HEIGHT = 0.1;

const LANDING_SKID_WIDTH = 0.03;
const LANDING_SKID_HEIGHT = 0.03;

const SKID_SUPPORTER_LENGTH = 0.63;
const SKID_SUPPORTER_HEIGHT = 0.025;
const SKID_SUPPORTER_WIDTH = 0.03;

const REAR_BLADE_LENGTH = 0.2;
const REAR_BLADE_HEIGHT = 0.04;
const REAR_BLADE_WIDTH = 0.01;

const TOP_BLADE_LENGTH = 0.7;
const TOP_BLADE_HEIGHT = 0.02;
const TOP_BLADE_WIDTH = 0.02;

const MAST_LENGTH = 0.03;
const MAST_HEIGHT = 0.09;
const MAST_WIDTH = 0.03;

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
                if(height < 6.0){
                    height += 0.1;
                    speed += 0.005;
                    inclination += 0.5
                }
                break;
            case "ArrowDown":
                if(height > 0) {
                    height -= 0.1;
                    speed -= 0.005;
                    inclination -= 0.5
                }
                break;
            case "1":
                ex = 1;
                ey = 0.5;
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

    
    

    gl.clearColor(0.3, 0.51, 0.82, 1.0);
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
        gl.uniform3fv(uColor, vec3(0.98, 0.31, 0.09));

        pushMatrix();  
            multRotationY(360 * time * 0.05);
            multScale([0.1,0.1,0.1]);
            multTranslation([(CABIN_LENGTH + TAIL_CONE_LENGTH)*3, (CABIN_HEIGHT+0.07) + height, 0.0]);
            multRotationX(-inclination);
            multRotationY(-90);
            helicopter();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.16, 0.55, 0.18));
        background();

    }

    function cabin() {
        multScale([CABIN_LENGTH, CABIN_HEIGHT, CABIN_WIDTH]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }
    
    function tailCone() {
        multTranslation([TAIL_CONE_LENGTH/2 + CABIN_LENGTH/2 - 0.2, CABIN_HEIGHT/4, 0.0]);
        multScale([TAIL_CONE_LENGTH, TAIL_HEIGHT, TAIL_WIDTH]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }
    
    function tailFin() {
        multTranslation([TAIL_CONE_LENGTH + CABIN_LENGTH/2 - 0.2, CABIN_HEIGHT/4 + 0.07, 0.0]);
        multRotationZ(70);
        multScale([TAIL_FIN_LENGTH, TAIL_WIDTH, TAIL_HEIGHT]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }


    function landingSkids(){
        pushMatrix();
            multRotationY(180);
            landingSkid();
        popMatrix();
        pushMatrix()
            landingSkid();
        popMatrix();
    }

    function landingSkid(){
        multTranslation([0.0, -CABIN_HEIGHT - 0.07, CABIN_WIDTH])
        multScale([CABIN_LENGTH + 0.2, LANDING_SKID_HEIGHT , LANDING_SKID_WIDTH]);
        multRotationZ(-90);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }

    function landingSkidSupporters() {
        pushMatrix();
            left();
        popMatrix(); 

        pushMatrix();
            multRotationY(180);
            left();
        popMatrix(); 
        
    }
    
    function left() {
        pushMatrix();
            landingSkidSuporter();
        popMatrix(); 
    
        pushMatrix();
            multRotationZ(82);
            landingSkidSuporter();
        popMatrix(); 
    }
    
    function landingSkidSuporter(){
        multRotationX(-36);
        multRotationZ(55);
        multTranslation([-SKID_SUPPORTER_LENGTH/2, 0.0, 0.0]);
        multScale([SKID_SUPPORTER_LENGTH, SKID_SUPPORTER_HEIGHT, SKID_SUPPORTER_WIDTH]);
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
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.02, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH]);
            multRotationZ(360*time);
            multRotationY(180);
            rearBlade();
        popMatrix();
        
        pushMatrix();
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.02, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH]);
            multRotationZ(360*time);
            rearBlade();
        popMatrix();
    }

    function topBlade(){
        multTranslation([TOP_BLADE_LENGTH/2, CABIN_HEIGHT/2 + TOP_BLADE_HEIGHT + 0.02, 0.0]);
        multScale([TOP_BLADE_LENGTH, TOP_BLADE_HEIGHT, TOP_BLADE_WIDTH]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function rearBlade(){
   
        multTranslation([REAR_BLADE_LENGTH/2,0,0]);
        multScale([REAR_BLADE_LENGTH, REAR_BLADE_HEIGHT, REAR_BLADE_WIDTH]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function mast(){
        multScale([MAST_LENGTH, MAST_HEIGHT, MAST_WIDTH]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }


    function masts(){
        pushMatrix();
            multRotationY(360*time);
            multTranslation([0.0, CABIN_HEIGHT/2 + 0.02, 0.0]);
            mast();
        popMatrix();
        
        pushMatrix();
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.02, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH/2]);
            multRotationX(90)
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
            landingSkidSupporters();
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
        multScale([2.2, 0.01, 2.2]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
