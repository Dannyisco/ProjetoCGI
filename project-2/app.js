import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, mult, rotateX, rotateY, inverse } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as PYRAMID from '../../libs/objects/pyramid.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as BUNNY from '../../libs/objects/bunny.js';

/** @type WebGLRenderingContext */
let gl;
let uColor;
let a;

let mModel;
let initPos = vec4(0.0);

let time = 0;  
let speed = 1/60.0; 

let dropBox = false;
let helicopterSpeed = 0; 
let bladeSpeed = 0;       
let incHelicopter = 0.0;
let incBlade = 0.0;
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running
let zoom = 1.0;
let height = 0; 
let inclination = 0;
let slowHelicopter = false;
let slowBlade = false;
let theta = 30;
let gama = 60;


//duas rotacoes por segundo para helices
const CABIN_LENGTH = 0.65;
const CABIN_WIDTH = 0.3;
const CABIN_HEIGHT = 0.35;

const TAIL_CONE_LENGTH = 0.9;
const TAIL_FIN_LENGTH = 0.2;
const TAIL_WIDTH = 0.08;
const TAIL_HEIGHT = 0.1;

const LANDING_SKID_LENGTH = CABIN_LENGTH + 0.2;
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

const MAX_SPEED = 0.008;
const MAX_ANGLE = 30;
const MIN_HEIGHT = 0.2 * LANDING_SKID_LENGTH/0.5 

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas); 
    mode = gl.TRIANGLES; 

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom, -10, 10);
    let mView = mult(lookAt([0,-3,4], [0,0.4,0], [0,1,0]), mult(rotateX(gama), rotateY(theta)));
    //let mView = lookAt([1, 0.6, 0.0], [0, 0.6, 0], [0, 1, 0]);
    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeyup = function(event) {
        switch(event.key) {
            case "ArrowLeft":
                slowHelicopter = true;
                break;
            case "Space":
                dropBox = true;
                //sleep(5000).then(() => {dropBox = false});
            case "b":
                mModel = mult(inverse(mView),a);
                initPos = mult(mModel, vec4(0, 0, 0, 1));
                dropBox = true;
                sleep(5000).then(() => {dropBox = false});
                time = 0
                break;
        }
    }

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
                slowHelicopter = false;

                if(incHelicopter < MAX_SPEED && height > 0)
                    incHelicopter += 0.0001;
           
                break;
            case "ArrowUp":
                if(height == 0)
                    height = MIN_HEIGHT;
                else if(height < 3.0){
                    height += 0.05;
                }
                break;
            case "ArrowDown":
                if(height >= MIN_HEIGHT) {
                    height -= 0.05;
                }
                else {
                    slowBlade = true;
                    height = 0;
                    sleep(2000).then(() => {slowBlade = false; incBlade = 0});
                }
                break;
            
            case "1":
                mView = mult(lookAt([0,-3,4], [0,0.4,0], [0,1,0]), mult(rotateX(gama), rotateY(theta)));
                break;
            case "2":
                mView = lookAt([0,0.6,-1], [0,0.6,0], [0,1,0]);
                break;
            case "3":
                mView = lookAt([0,1.6,0], [0,0,0], [0,0,-2]);
                break;
            case "4":
                mView = lookAt([1, 0.6, 0.0], [0, 0.6, 0], [0, 1, 0]);
                break;
         }
    };

    /*Sobe com inclinação 0 e sem andar às voltas
                premindo left vai pra esquerda e com inclinação dependendo da velocidade
                larga-se o left e para de andar às voltas com a inclinação voltando lentamente ao 0.

                Acho q a velocidade nn depende da altura

                Quando está no solo e premimos cursorUp é suposto nao descolar logo e ver as helices a girar
                até uma determinada velocidade e só depois descolar.
                Ao tocar o solo na descida as helices devem parar de girar lentamente.
                */

    
    gl.clearColor(0.02, 0.07, 0.17, 1.0);

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
        mProjection = ortho(-aspect*zoom, aspect*zoom, -zoom, zoom, 0.01, 10);
    }

    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        if(animation) {
            if(slowHelicopter && incHelicopter >= 0.0001) {
                incHelicopter -= 0.0001
                if(incHelicopter < 0.0001)
                    incHelicopter = 0

            if(slowBlade && incBlade >= 0.0005)
                incBlade -= 0.0005;
            }

            time += speed;
            
        } 

        helicopterSpeed += incHelicopter;

        if(height == 0) 
            incHelicopter = 0;

        if(height > 0)
            incBlade = 0.05;
     
        bladeSpeed += incBlade + incHelicopter;
    
        inclination = incHelicopter * MAX_ANGLE / MAX_SPEED;

        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom, 0.01, 10);
        uploadProjection(mProjection);
        
        loadMatrix(mView);

        uColor = gl.getUniformLocation(program, "uColor");

        pushMatrix();
            multScale([1.2, 1.2, 1.2]);
            background();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.45, 0.24, 0.76));
        pushMatrix();
            multRotationY(360 * helicopterSpeed);
            multScale([0.2,0.2,0.2]);
            multTranslation([(CABIN_LENGTH + TAIL_CONE_LENGTH)*3, (CABIN_HEIGHT+0.07) + height, 0.0]);
            multRotationX(-inclination);
            multRotationY(-90 + incHelicopter*2500);
            helicopter();

            a = modelView();
        popMatrix();
        
        if(dropBox) {
            gl.uniform3fv(uColor, vec3(1.0, 0.0, 0.0));

            let mModel = mult(inverse(mView),a);
            let initPos = mult(mModel, vec4(0, 0, 0, 1));
            pushMatrix();
                //multTranslation([0.0, 2.0 * time, 0.0]);
                multTranslation([initPos[0], initPos[1], initPos[2]])
                box();
            popMatrix(); 
            
        }

    


            a = modelView();
        popMatrix()
        
        if(dropBox) {
            time += speed;
            gl.uniform3fv(uColor, vec3(1.0, 0.0, 0.0));
           
            pushMatrix();
                if(initPos[1] - (0.6 * time )-0.04 > 0) {
                    multTranslation([0.0, - 0.6 * time, 0.0]);
                    multTranslation([initPos[0], initPos[1], initPos[2]])
                }
                else
                    multTranslation([initPos[0], 0.04, initPos[2]]);
                box();
            popMatrix(); 
            
        }

    }

    function box() {
        multScale([0.08, 0.08, 0.08]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
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
        
        multScale([LANDING_SKID_LENGTH, LANDING_SKID_HEIGHT , LANDING_SKID_WIDTH]);
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
            multRotationY(360*bladeSpeed);
            multRotationY(120);
            topBlade();
        popMatrix();

        pushMatrix()
            multRotationY(360*bladeSpeed);
            multRotationY(240);
            topBlade();
        popMatrix();

        pushMatrix();
            multRotationY(360*bladeSpeed);
            topBlade();
        popMatrix();
        
        pushMatrix();
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.02, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH]);
            multRotationZ(360*bladeSpeed);
            multRotationY(180);
            rearBlade();
        popMatrix();
        
        pushMatrix();
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.02, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH]);
            multRotationZ(360*bladeSpeed);
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
            multRotationY(360*bladeSpeed);
            multTranslation([0.0, CABIN_HEIGHT/2 + 0.02, 0.0]);
            mast();
        popMatrix();
        
        pushMatrix();
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.02, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH/2]);
            multRotationX(90)
            multRotationY(360*bladeSpeed);
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

   
    function roads(){
        pushMatrix();
            road();
        popMatrix();
        pushMatrix();
            multRotationY(90);
            road();
        popMatrix();
        pushMatrix();
            multRotationY(-90);
            road();
        popMatrix();
    }

    function road(){
        gl.uniform3fv(uColor, vec3(0.0, 0.0, 0.0));
        pushMatrix();
            multTranslation([-0.7, 0.0, 0.01]);
            multScale([0.8, 0.001, 0.1]);
            ground();
        popMatrix(); 
        gl.uniform3fv(uColor, vec3(1.0, 1.0, 1.0));
        pushMatrix();
            multTranslation([-0.99, 0.0, 0.01]);
            partsOfH();
        popMatrix();
        pushMatrix();
            multTranslation([-0.79, 0.0, 0.01]);
            partsOfH();
        popMatrix();
        pushMatrix();
            multTranslation([-0.59, 0.0, 0.01]);
            partsOfH();
        popMatrix();
        pushMatrix();
            multTranslation([-0.39, 0.0, 0.01]);
            partsOfH();
        popMatrix();
        
    }


    function helipad(){
        gl.uniform3fv(uColor, vec3(0.0, 0.0, 0.0));
        pushMatrix();
            multTranslation([0.46, 0.0, 0.01]);
            multScale([0.2, 0.001, 0.2]);
            helipadGround();
        popMatrix();
        gl.uniform3fv(uColor, vec3(1.0, 1.0, 1.0));
        pushMatrix();
            letterH();
        popMatrix();

    }

    function helipadGround(){
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function ground(){
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function letterH(){
        pushMatrix();
            multTranslation([0.462, 0.0, 0.01]);
            partsOfH();
        popMatrix();
        pushMatrix();
            multRotationY(90);
            multTranslation([-0.01, 0.0, 0.5]);
            partsOfH();
        popMatrix();
        pushMatrix();
            multRotationY(90);
            multTranslation([-0.01, 0.0, 0.42]);
            partsOfH();
        popMatrix();

    }

    function partsOfH(){
        multScale([0.08, 0.0014, 0.01]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function column() {
           
            uploadModelView();
            CUBE.draw(gl, program, mode);
    }

    function column2() {
            multScale([0.01, 0.05, 0.01]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        
    }

    function roof() {
            multTranslation([0.0, 0.005 + 0.3 + 0.05, 0.075]);
            multScale([0.1, 0.01, 0.05]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
    }


    function tower() {
        gl.uniform3fv(uColor, vec3(0.59, 0.73, 0.83));
        pushMatrix();
            multTranslation([0.0, 0.6, 0.0]);
            towerMast();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.33, 0.35, 0.36));
        pushMatrix();
            roof();
        popMatrix();

        pushMatrix();
            multTranslation([0.05, 0.025 + 0.3, 0.1 - 0.01]);
            column2();
        popMatrix();

        pushMatrix();
            multTranslation([-0.05, 0.025 + 0.3, 0.1 - 0.01]);
            column2();
        popMatrix();

        pushMatrix();
            multTranslation([-0.05 + 0.01, 0.15, -0.05 + 0.01]);
            multScale([0.01, 0.3, 0.01]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.05 - 0.01, 0.15, -0.05 + 0.01]);
            multScale([0.01, 0.3, 0.01]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.0, 0.05]);
            towerHalf();
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.3, 0.0]);
            towerHalf();
        popMatrix();
    }

    function towerHalf() {
        gl.uniform3fv(uColor, vec3(0.2, 0.62, 0.93));
        pushMatrix();
            multTranslation([0.0, 0.18, 0.0]);
            windows();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.09, 0.5, 0.78));
        pushMatrix();
            multTranslation([0.0, 0.09, 0.0]);
            windows();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.03, 0.4, 0.66));
        pushMatrix();
            windows();
        popMatrix();
        
        gl.uniform3fv(uColor, vec3(0.63, 0.65, 0.66));

        pushMatrix();
            towerCube();
        popMatrix();
    }

    function towerCube() {
        multTranslation([0.0, 0.15, 0.0]);
        multScale([0.1, 0.3, 0.1]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function towerMast() {
        pushMatrix();
            multTranslation([0.0, 0.015, 0.0]);
            multScale([0.05, 0.03, 0.05]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.03 + 0.05, 0.0]);
            multScale([0.025, 0.1, 0.025]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.03 + 0.09 + 0.01, 0.0]);
            multScale([0.02, 0.02, 0.02]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
    }

    function squareWindow() {
        multTranslation([0.0, 0.06, 0.0]);
        multScale([0.101, 0.08, 0.06]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function windows() {
        pushMatrix();
            multRotationY(90);
            squareWindow();
        popMatrix();

        pushMatrix();
            squareWindow();
        popMatrix();
    }


    function b() {
        multScale([0.05, 0.005, 0.05]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function c() {
        pushMatrix();
            
            multTranslation([0.0,0.585 + 0.08 + 0.08 + 0.1, 0.0]);
            multRotationZ(25)
            multRotationX(20)
            multScale([0.18, 0.01, 0.18]);
            uploadModelView();
            CYLINDER.draw(gl, program, gl.TRIANGLES);
        popMatrix();


        pushMatrix();
            multTranslation([0.0,0.585 + 0.08 + 0.08 + 0.1, 0.0]);
            multScale([0.11, 0.11, 0.11]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
    }
    
    function towerPlanet() {

        pushMatrix();
            multTranslation([0.0,Math.sin(time) * 0.04, 0.0]);
            c()
        popMatrix();

        pushMatrix();
            multTranslation([0.0,0.585 + 0.08 + 0.08, 0.0]);
            multScale([0.03, 0.1, 0.03]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.025 + 0.5 + 0.05 - 0.04 + 0.05 + 0.04, 0.0]);
            multScale([0.3, 0.15, 0.3]);
            multRotationX(180)
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.025 + 0.5 + 0.05 - 0.04 + 0.05, 0.0]);
            multScale([0.3, 0.08, 0.3]);
            multRotationX(180)
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.025 + 0.5 + 0.05 - 0.04, 0.0]);
            multScale([0.12, 0.05, 0.12]);
            multRotationX(180)
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.025 + 0.5 - 0.02, 0.0]);
            multScale([0.06, 0.05, 0.06]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.005 + 0.34, 0.0]);
            multScale([2.5, 1.0, 2.5]);
            b()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.005 + 0.28, 0.0]);
            multScale([2.0, 1.0, 2.0]);
            b()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.005 + 0.22, 0.0]);
            multScale([1.5, 1.0, 1.5]);
            b()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.005 + 0.16, 0.0]);
            b()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.25 - 0.02, 0.0]);
            multScale([0.06, 0.5, 0.06]);
            multRotationX(180)
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.09, 0.0]);
            multScale([0.1, 0.1, 0.1]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.03, 0.0]);
            multScale([0.1, 0.06, 0.1]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
    }

    function background() {
        pushMatrix();
            helipad();
        popMatrix();

        pushMatrix();
            roads();
        popMatrix();

        pushMatrix();
            multScale([1.3, 1.5, 1.5]);
            tower();
        popMatrix();
        
        pushMatrix();
            multTranslation([-1.2, -0.005, -0.5]);
            towerOfAvengers();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.9, 0.38, 0.73));
        pushMatrix();
            multTranslation([0.5, 0.0, 0.5]);
            towerPlanet();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.05, 0.19, 0.1));
        pushMatrix();
            plane();
        popMatrix();

    }

    function towerOfAvengers(){
        pushMatrix();
            floors();
        popMatrix();

        pushMatrix();
            multTranslation([0.46, 0.549, 0.16]);
            multScale([0.02, 1.1, 0.02]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.37, 0.489, 0.16]);
            multScale([0.02, 0.99, 0.02]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.55, 0.489, 0.16]);
            multScale([0.02, 0.99, 0.02]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.37, 0.489, 0.0009]);
            multRotationX(14);
            multScale([0.02, 1.0, 0.05]); 
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.55, 0.489, 0.0009]);
            multRotationX(14);
            multScale([0.02, 1.0, 0.05]); 
            column();
        popMatrix();

        pushMatrix();
        multTranslation([0.37, 0.71, -0.247]);
        multScale([0.02, 0.175, 0.02]);
        column();
    popMatrix();

    
    pushMatrix();
        multTranslation([0.46, 0.71, -0.247]);
        multScale([0.02, 0.175, 0.02]);
        column();
    popMatrix();

    ;
    pushMatrix();
        multTranslation([0.55, 0.71, -0.247]);
        multScale([0.02, 0.175, 0.02]);
        column();
    popMatrix();

        pushMatrix();
            multTranslation([0.359, 0.67, 0.05]);
            multRotationZ(90);
            multScale([0.2, 0.02, 0.2]);
            symbol();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.0, 0.0, 1.0));
        pushMatrix();
            multTranslation([0.349, 0.67, 0.07]);
            multRotationZ(90);
            multScale([1.2, 10.0, 2.0]);
            partsOfH();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.0, 0.0, 1.0));
        pushMatrix();
            multTranslation([0.349, 0.67, 0.02]);
            multRotationX(34);
            multRotationZ(90);
            multScale([2.3, 10.0, 2.0]);
            partsOfH();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.0, 0.0, 1.0));
        pushMatrix();
            multTranslation([0.346, 0.66, 0.029]);
            multRotationX(90);
            multRotationZ(90);
            multScale([0.7, 10.0, 2.0]);
            partsOfH();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.0, 0.2, 1.0));
        pushMatrix();
            frontWiondow();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.0, 0.2, 1.0));
        pushMatrix();
            principalStage();
        popMatrix();

        
       

        
    }
    
    function principalStage(){
        multTranslation([0.456, 0.71, -0.05]);
        multScale([0.17, 0.173, 0.4]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }


    function frontWiondow(){
        multTranslation([0.456, 0.489, 0.16]);
        multScale([0.17, 0.96, 0.02]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function floors(){
        pushMatrix();
            multTranslation([0.46, 0.01, 0.02]);
            multScale([0.2, 0.02, 0.3]);
            floor();
        popMatrix();

        pushMatrix();
            multTranslation([0.46, 0.21, 0.045]);
            multScale([0.2, 0.02, 0.25]);
            floor();
        popMatrix();

        pushMatrix();
            multTranslation([0.46, 0.41, 0.07]);
            multScale([0.2, 0.02, 0.2]);
            floor();
        popMatrix();

        pushMatrix();
            multTranslation([0.46, 0.61, -0.13]);
            multScale([0.2, 0.02, 0.6]);
            floor();
        popMatrix();

        pushMatrix();
            multTranslation([0.46, 0.81, -0.043]);
            multScale([0.2, 0.02, 0.43]);
            floor();
        popMatrix();

        pushMatrix();
            multTranslation([0.46, 0.97, 0.123]);
            multScale([0.2, 0.02, 0.1]);
            floor();
        popMatrix();
    }

    function symbol(){
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    

    function floor(){
        uploadModelView();
        CUBE.draw(gl, program, mode);
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
