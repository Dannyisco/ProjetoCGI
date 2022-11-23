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

let mv;
let mModel;
let heliPos;

let view1 = true;
let view5 = false;

let time = 0;  
let speed = 1/60.0; 
let boxMass;


let boxes = [];


let helicopterSpeed = 0; 
let bladeSpeed = 0;       
let incHelicopter = 0.0;
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running
let zoom = 35.0;
let height = 0; 
let inclination = 0;
let movingHelicopter = false;
let slowBlade = false;
let gama ;
let theta ;
let eyePos = 0.0
let atPos = 0.0

//duas rotacoes por segundo para helices
const CABIN_LENGTH = 4.2;
const CABIN_WIDTH = 1.9;
const CABIN_HEIGHT = 2.3;

const TAIL_CONE_LENGTH = 5.8;
const TAIL_FIN_LENGTH = 1.3;
const TAIL_WIDTH = 0.5;
const TAIL_HEIGHT = 0.6;

const LANDING_SKID_LENGTH = 5.5;
const LANDING_SKID_WIDTH = 0.2;
const LANDING_SKID_HEIGHT = 0.2;

const SKID_SUPPORTER_LENGTH = 4.1;
const SKID_SUPPORTER_HEIGHT = 0.2;
const SKID_SUPPORTER_WIDTH = 0.2;

const REAR_BLADE_LENGTH = 1.3;
const REAR_BLADE_HEIGHT = 0.3;
const REAR_BLADE_WIDTH = 0.06;

const TOP_BLADE_LENGTH = 4.5;
const TOP_BLADE_HEIGHT = 0.1;
const TOP_BLADE_WIDTH = 0.1;

const MAST_LENGTH = 0.2;
const MAST_HEIGHT = 0.6;
const MAST_WIDTH = 0.2;

const MAX_SPEED = 0.0035;
const MAX_ANGLE = 30;
const MIN_HEIGHT = Math.round(LANDING_SKID_LENGTH*0.5) //sin(30) = 0.5
const MAX_HEIGHT = 30
const RADIUS = 30
const VP_DISTANCE = 50

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gama = document.getElementById('1').value;
    theta = document.getElementById('2').value;

    gl = setupWebGL(canvas); 
    mode = gl.TRIANGLES; 

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom, -100, 100);
    let mView = mult(lookAt([0,17,1], [0,17,0], [0,1,0]),mult(rotateX(gama), rotateY(theta)));
    resize_canvas();
    window.addEventListener("resize", resize_canvas);


    document.onkeyup = function(event) {
        switch(event.key) {
            case "ArrowLeft":
                movingHelicopter = false;
                break;
            case " ":
                mModel = mult(inverse(mView),mv);
                heliPos = mult(mModel, vec4(0, 0, 0, 1))
                let finalPosX = 0;   
                let finalPosZ = 0;
                let acceleration = vec3(0, -9.8, 0);
                
                let angle = Math.acos(heliPos[0]/RADIUS)
                if(heliPos[2] > 0)
                    angle = -angle + 2 * Math.PI
    
                let angularVelocity = incHelicopter * 2 * Math.PI * 60 * 0.5
                let velocity = vec3(RADIUS * angularVelocity * Math.sin(angle) * (-1), 0, RADIUS * angularVelocity * Math.cos(angle) * (-1))
                boxes.push({startTime : time, initPos : heliPos, initVel : velocity, finalPos : [finalPosX, finalPosZ], acceleration: acceleration});

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
                if(height > 0)
                    movingHelicopter = true;
                break;
            case "ArrowUp":
                if(height == 0) {
                    height = MIN_HEIGHT;
                }
                else if(height < MAX_HEIGHT){
                    height += 1;
                }
                break;
            case "ArrowDown":
                if (height > MIN_HEIGHT) {
                    height -= 1;
                }
                else {
                    slowBlade = true;
                    height = 0;
                    sleep(2000).then(() => {slowBlade = false; bladeSpeed = 0});
                }
                break;
            case "1":
                view1 = true;
                view5 = false;
                zoom = 35.0;
                break;
            case "2":
                view1 = false;
                view5 = false;
                zoom = 35.0;
                mView = lookAt([0,17,1], [0,17,0], [0,1,0]);
                break;
            case "3":
                view1 = false;
                view5 = false;
                zoom = 50
                mView = lookAt([0,40,0], [0,0,0], [0,0,-2]);
                break;
            case "4":
                view1 = false;
                view5 = false;
                zoom = 35.0;
                mView = lookAt([1, 17, 0.0], [0, 17, 0], [0, 1, 0]);
                break;
            case "5":
                view1 = false;
                mProjection = perspective(VP_DISTANCE, aspect, VP_DISTANCE/10 , 4*VP_DISTANCE);
                view5 = true;
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

    
    gl.clearColor(0.16, 0.21, 0.41, 1.0);

    PYRAMID.init(gl);
    SPHERE.init(gl);
    CUBE.init(gl);
    CYLINDER.init(gl);
    BUNNY.init(gl);
    TORUS.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-aspect*zoom, aspect*zoom, -zoom, zoom, -100, 100);
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

        gama = document.getElementById('1').value;
        theta = document.getElementById('2').value;

        if(view1)
            mView = mult(lookAt([0,17,1], [0,17,0], [0,1,0]),mult(rotateX(gama), rotateY(theta)));
        
        if(view5) {
            mModel = mult(inverse(mView),mv);
            eyePos = mult(mModel, vec4(-CABIN_LENGTH/2, 0, 0, 1));
            atPos = mult(mModel, vec4(-(CABIN_LENGTH/2 + 0.1 + VP_DISTANCE), 0, 0, 1));
            mView = lookAt([eyePos[0], eyePos[1], eyePos[2]], [atPos[0], atPos[1], atPos[2]], [0, 1 , 0]);
        }else
            mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom, -100, 100);

        if(animation) {
            if(movingHelicopter) {
                if(incHelicopter < MAX_SPEED && height > 0)
                    incHelicopter += 0.00001
            }
            else {
                if(incHelicopter >= 0.00001) {
                    incHelicopter -= 0.00001
                    if(incHelicopter < 0.00001)
                        incHelicopter = 0

                }
            }
            
            if(slowBlade && bladeSpeed >= 3) {
                bladeSpeed -= 3;
            }
            else
                bladeSpeed = 2 * 360 * time;

            time += speed;
            helicopterSpeed += incHelicopter;
            
        } 

        if(height == 0) {
            bladeSpeed = 0;
            incHelicopter = 0;
        }
    
        inclination = incHelicopter * MAX_ANGLE / MAX_SPEED;

        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        uploadProjection(mProjection);
       
        
        loadMatrix(mView);

        uColor = gl.getUniformLocation(program, "uColor");
        
        pushMatrix();
            background();
        popMatrix();
     
        pushMatrix();
            multRotationY(360 * helicopterSpeed);
            multTranslation([RADIUS, (CABIN_HEIGHT/2 + LANDING_SKID_HEIGHT + 1.5) + height, 0.0]);
            multRotationX(-inclination);
            multRotationY(270)
            helicopter();
            mv = modelView();
        popMatrix(); 
    
        
        for(let i = 0; i< boxes.length ; i++){
        
            gl.uniform3fv(uColor, vec3(0.62, 0.43, 0.71));

            let currentTime = time - boxes[i].startTime;

            let x = boxes[i].initPos[0] + boxes[i].initVel[0] * currentTime + 0.5 * boxes[i].acceleration[0]*Math.pow(currentTime, 2);
            let y = boxes[i].initPos[1] + boxes[i].initVel[1] * currentTime + 0.5 * boxes[i].acceleration[1]*Math.pow(currentTime, 2);
            let z = boxes[i].initPos[2] + boxes[i].initVel[2] * currentTime + 0.5 * boxes[i].acceleration[2]*Math.pow(currentTime, 2);
              
            if(currentTime < 5) {
                pushMatrix();
                    if(y - 2/2 > 0) {
                        multTranslation([x, y, z]); 
                        boxes[i].finalPos[0] = x;
                        boxes[i].finalPos[1] = z;
                    }
                    else
                        multTranslation([boxes[i].finalPos[0], 2/2,  boxes[i].finalPos[1]]);            
                    box();
                popMatrix(); 

            }
            else {
                boxes.splice(i,1);
                i--
            }

         }

    }

    function box() {
        multScale([2, 2, 2]);
        uploadModelView();
        TORUS.draw(gl, program, mode);
    }

    function cabin() {
        multScale([CABIN_LENGTH, CABIN_HEIGHT, CABIN_WIDTH]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }
    
    function tailCone() {
        multTranslation([TAIL_CONE_LENGTH/2 + CABIN_LENGTH/2 - 0.8, CABIN_HEIGHT/4, 0.0]);
        multScale([TAIL_CONE_LENGTH, TAIL_HEIGHT, TAIL_WIDTH]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }
    
    function tailFin() {
        multTranslation([TAIL_CONE_LENGTH + CABIN_LENGTH/2 - 0.8, CABIN_HEIGHT/4 + 0.5, 0.0]);
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
        multTranslation([0.0, - LANDING_SKID_HEIGHT/2 - CABIN_HEIGHT/2 - 1.5, CABIN_WIDTH])
        
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
        multRotationX(-35);
        multRotationZ(55);
        multTranslation([-SKID_SUPPORTER_LENGTH/2, 0.0, 0.0]);
        multScale([SKID_SUPPORTER_LENGTH, SKID_SUPPORTER_HEIGHT, SKID_SUPPORTER_WIDTH]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function blades() {
        
        pushMatrix();
            multRotationY(bladeSpeed);
            multRotationY(120);
            topBlade();
        popMatrix();

        pushMatrix()
            multRotationY(bladeSpeed);
            multRotationY(240);
            topBlade();
        popMatrix();

        pushMatrix();
            multRotationY(bladeSpeed);
            topBlade();
        popMatrix();
        
        pushMatrix();
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.6, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH]);
            multRotationZ(bladeSpeed);
            rearBlades();
        popMatrix();
    
    }

    function rearBlades() {
        pushMatrix();
            rearBlade();
        popMatrix();

        pushMatrix();
            multRotationY(180);
            rearBlade();
        popMatrix();
    }

    function topBlade(){
        multTranslation([TOP_BLADE_LENGTH/2, CABIN_HEIGHT/2 + TOP_BLADE_HEIGHT + 0.1, 0.0]);
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
            multRotationY(bladeSpeed);
            multTranslation([0.0, CABIN_HEIGHT/2 + 0.1, 0.0]);
            mast();
        popMatrix();
        
        pushMatrix();
            multTranslation([TAIL_CONE_LENGTH + REAR_BLADE_LENGTH/2 + 0.6, TAIL_HEIGHT + REAR_BLADE_HEIGHT, TAIL_WIDTH/2]);
            multRotationX(90)
            multRotationY(bladeSpeed);
            mast();
        popMatrix();
    }

    function helicopter() {
        gl.uniform3fv(uColor, vec3(0.82, 0.28, 0.69));
        pushMatrix();
            blades();
        popMatrix();

        pushMatrix();
            landingSkidSupporters();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            landingSkids();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            masts();
        popMatrix();
        
        gl.uniform3fv(uColor, vec3(0.45, 0.24, 0.76));
        pushMatrix();
            cabin();
        popMatrix();

        
        pushMatrix();
            tailCone();
        popMatrix();

        
        pushMatrix();
            tailFin();
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
        
        pushMatrix();
            multTranslation([0.0, 0.6, 0.0]);
            towerMast();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.18, 0.1, 0.25));
        pushMatrix();
            roof();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.42, 0.15, 0.53));
        pushMatrix();
            multTranslation([0.05, 0.025 + 0.3, 0.1 - 0.01]);
            column2();
        popMatrix();

        pushMatrix();
            multTranslation([-0.05, 0.025 + 0.3, 0.1 - 0.01]);
            column2();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.82, 0.28, 0.69));
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
        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.0, 0.18, 0.0]);
            windows();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.0, 0.09, 0.0]);
            windows();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            windows();
        popMatrix();
        
        gl.uniform3fv(uColor, vec3(0.53, 0.56, 0.73));
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
        
        gl.uniform3fv(uColor, vec3(0.18, 0.1, 0.25));
        pushMatrix();
            multTranslation([0.0, 0.015, 0.0]);
            multScale([0.05, 0.03, 0.05]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.42, 0.15, 0.53));
        
        pushMatrix();
            multTranslation([0.0, 0.03 + 0.05, 0.0]);
            multScale([0.025, 0.1, 0.025]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

       
       gl.uniform3fv(uColor, vec3(0.82, 0.28, 0.69));
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
        CUBE.draw(gl, program, gl.LINES);
    }

    function c() {
        gl.uniform3fv(uColor, vec3(0.18, 0.1, 0.25));

        pushMatrix();  
            multTranslation([0.0,0.06 + 0.5 + 0.04 + 0.15 + 0.05 + 0.11, 0.0]);
            multRotationZ(25)
            multRotationX(20)
            multScale([0.18, 0.01, 0.18]);
            uploadModelView();
            CYLINDER.draw(gl, program, gl.TRIANGLES);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.42, 0.15, 0.53));

        pushMatrix();
            multTranslation([0.0,0.06 + 0.5 + 0.04 + 0.15 + 0.05 + 0.11, 0.0]);
            multScale([0.11, 0.11, 0.11]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
    }
    

    function towerPlanet() {
        pushMatrix();
            multTranslation([0.0, 0.02 + (Math.sin(time))*0.03, 0.0]);
            c()
        popMatrix();
        
        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.0,0.06 + 0.5 + 0.04 + 0.15 + 0.05, 0.0]);
            multScale([0.03, 0.1, 0.03]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.82, 0.28, 0.69));
        pushMatrix();
            multTranslation([0.0, 0.06 + 0.5 + 0.04 + 0.075 + 0.01, 0.0]);
            multScale([0.3, 0.15, 0.3]);
            multRotationX(180)
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
        
        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.0, 0.06 + 0.5 + 0.05 + 0.04, 0.0]);
            multScale([0.31, 0.02, 0.31]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.72, 0.23, 0.62));
        pushMatrix();
            multTranslation([0.0, 0.06 + 0.5 + 0.05 + 0.04, 0.0]);
            multScale([0.3, 0.08, 0.3]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.42, 0.15, 0.53));
        pushMatrix();
            multTranslation([0.0, 0.06 + 0.5, 0.0]);
            multScale([0.12, 0.1, 0.12]);
            multRotationX(180)
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.0, 0.005 + 0.38, 0.0]);
            multScale([2.5, 1.0, 2.5]);
            b()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.005 + 0.32, 0.0]);
            multScale([2.0, 1.0, 2.0]);
            b()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.005 + 0.26, 0.0]);
            multScale([1.5, 1.0, 1.5]);
            b()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.005 + 0.20, 0.0]);
            b()
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.42, 0.15, 0.53));
        pushMatrix();
            multTranslation([0.0, 0.06 + 0.25 , 0.0]);
            multScale([0.06, 0.5, 0.06]);
            multRotationX(180)
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.05 + 0.06, 0.0]);
            multScale([0.1, 0.1, 0.1]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.0, 0.03, 0.0]);
            multScale([0.1, 0.06, 0.1]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
    }

    function d() {
        multTranslation([0.0, 0.3, 0.0]);
        multScale([0.25, 0.6, 0.2]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function e() {
        multTranslation([-0.125/2, 0.005, 0.0]);
        multScale([0.125, 0.01, 0.2 - 0.02]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }
        
    function windowLines() {
        pushMatrix();
            multRotationZ(-30)
            e()
        popMatrix();

        pushMatrix();
            multRotationZ(-60)
            e()
        popMatrix();

        pushMatrix();
            multRotationZ(-90)
            e()
        popMatrix();

        pushMatrix();
            multRotationZ(-120)
            e()
        popMatrix();

        pushMatrix();
            multRotationZ(-150)
            e()
        popMatrix();

    }

    function line1() {
        pushMatrix();
            multScale([0.06, 1.0 - 0.001, 1.05]);
            d()
        popMatrix()
    }

    function line2() {
        pushMatrix();
            multTranslation([0.0, 0.6 + 0.1,0.0])
            multScale([0.06, 0.35 - 0.001, 1.05]);
            d()
        popMatrix()
    }

    function line3() {
        multTranslation([-0.25/2 + 0.02, 0.0, 0.0])
        multScale([0.06, 1.0 + 0.35 + 0.17 - 0.001, 1.05]);
        d()
    }

    function line4() {
        multTranslation([-0.25/2 + 0.02, - 0.35*0.6 + 0.1/2, 0.0])
        line2()
    }

    function f() {
        multTranslation([-0.25/2 + 0.02, 0.0, 0.0])
        line2();
        line1();
    }

    function doofenshmirtzEvilInc() {
        gl.uniform3fv(uColor, vec3(0.42, 0.15, 0.53));

        pushMatrix();
            multTranslation([0.0, 0.6 + 0.1 + 0.21 , 0.0]);
            multRotationX(90)
            multScale([0.25,0.2 - 0.04,0.25]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.30, 0.19, 0.41));

        pushMatrix();
            multTranslation([0.28, 0.0, 0.0]);
            line4();
        popMatrix()

        pushMatrix();
            multTranslation([0.24, 0.0, 0.0]);
            line4();
        popMatrix();

        pushMatrix();
            multTranslation([0.20, 0.0, 0.0]);
            line3()
        popMatrix();

        pushMatrix();
            multTranslation([0.16, 0.0, 0.0]);
            f()
        popMatrix();

        pushMatrix();
            multTranslation([0.12, 0.0, 0.0]);
            f()
        popMatrix();

        pushMatrix();
            multTranslation([0.08, 0.0, 0.0]);
            f()
        popMatrix();

        pushMatrix();
            multTranslation([0.04, 0.0, 0.0]);
            f()
        popMatrix();

        pushMatrix();
            f()
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.18, 0.1, 0.25));
        pushMatrix();
            multTranslation([0.0, 0.6 + 0.1 + 0.21, 0.0]);
            windowLines()
        popMatrix();

        pushMatrix();
            multTranslation([0.25/2 + 0.35*0.25/2, 0.6 - 0.35*0.6 + 0.1 + 0.1/2 + 0.35*0.6, 0.0]);
            multScale([0.4, 0.02, 1.1]);
            d()
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.6 + 0.1 + 0.21, 0.0]);
            multScale([1.1, 0.02, 1.1]);
            d()
        popMatrix();
        
        gl.uniform3fv(uColor, vec3(0.09, 0.07, 0.11));

        pushMatrix();
            multTranslation([0.0,0.0,0.01])
            multScale([0.5,0.2,1.0])
            d()
        popMatrix();

        pushMatrix();
            multTranslation([0.25/2 - 0.3*0.25/2 - 0.01, 0.6, 0.0]);
            multScale([0.3, 0.12, 0.6]);
            d()
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.10, 0.46, 0.28));
        pushMatrix();
            multTranslation([0.0, 0.6 + 0.1 + 0.21 - 0.13*0.6 - 0.01, 0.01]);
            multScale([0.9, 0.13, 1.0]);
            d()
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.2, 0.11, 0.29));

        pushMatrix();
            multTranslation([0.25/2 + 0.35*0.25/2, 0.6 - 0.35*0.6 + 0.1 + 0.1/2, 0.0]);
            multScale([0.35, 0.35, 1.0]);
            d()
        popMatrix();
    

        pushMatrix();
            multTranslation([(-0.25 + (0.25-0.25*0.3))/2, 0.6 + 0.05, 0.0]);
            multRotationX(180)
            multScale([0.05,0.1,0.05]);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();
        
        pushMatrix();
            multTranslation([0.0, 0.6 + 0.1 + 0.21 , 0.0]);
            multRotationX(90)
            multScale([0.05,0.2 - 0.01,0.05]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            multTranslation([0.25/2 - 0.3*0.25/2, 0.6, 0.0]);
            multScale([0.3, 0.17, 1.0]);
            d()
        popMatrix();
        
        pushMatrix();
            multTranslation([0.0, 0.6 + 0.1, 0.0]);
            multScale([1.0, 0.35, 1.0]);
            d()
        popMatrix();
        
        pushMatrix();
            d()
        popMatrix();
    }

    function background() {
        /*
        pushMatrix();
            helipad();
        popMatrix();

        
        pushMatrix();
            roads();
        popMatrix();*/

        pushMatrix()
        multScale([40.0, 40.0, 40.0]);
       
            pushMatrix();
                multTranslation([0.8 , 0.0, -0.8]);
                multScale([1.1, 1.3, 1.3]);
                tower();
            popMatrix();

            pushMatrix();
                multTranslation([0.8 , 0.0, 0.8]);
                multScale([1.3, 1.5, 1.5]);
                tower();
            popMatrix();
            
            pushMatrix();
                multTranslation([-0.6, -0.005, -0.5]);
                multRotationY(100)
                towerOfAvengers();
            popMatrix();

            
            pushMatrix();
                multTranslation([0.4, 0.0, -1.0]);
                multRotationY(-15)
                doofenshmirtzEvilInc();
            popMatrix();

            
            pushMatrix();
                towerPlanet();
            popMatrix();

            pushMatrix();
                multTranslation([-0.8, 0.01, 0.7]);
                multScale([0.5, 0.5, 0.5]);
                batMobile();
            popMatrix();

        popMatrix()

        gl.uniform3fv(uColor, vec3(0.07, 0.09, 0.19));
        pushMatrix();
            plane();
        popMatrix();

    }

    function batMobile(){
        gl.uniform3fv(uColor, vec3(0.18, 0.1, 0.25));
        pushMatrix();
            batMobileBase();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.09, 0.07, 0.11));
        pushMatrix();
            multTranslation([-0.19, 0.114, 0.17]);
            wheelsSquad();
        popMatrix();

       
        pushMatrix();
            multTranslation([0.19, 0.114, -0.17]);
            wheelsSquad();
        popMatrix();

       
        pushMatrix();
            multTranslation([0.19, 0.114, 0.17]);
            wheelsSquad();
        popMatrix();

       
        pushMatrix();
            multTranslation([-0.19, 0.114, -0.17]);
            wheelsSquad();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.2, 0.1, 0.0]);
            wheel();
        popMatrix();

        
        pushMatrix();
            multTranslation([-0.2, 0.1, 0.0]);
            wheel();
        popMatrix();

        
        pushMatrix();
        multTranslation([-0.24, 0.11, 0.12]);
            frontWheel();
        popMatrix();

        
        pushMatrix();
        multTranslation([-0.24, 0.11, -0.12]);
            frontWheel();
        popMatrix();

        
        pushMatrix();
        multTranslation([0.24, 0.11, -0.12]);
            frontWheel();
        popMatrix();

        
        pushMatrix();
        multTranslation([0.24, 0.11, 0.12]);
            frontWheel();
        popMatrix();

        pushMatrix();
            multTranslation([0.0, 0.11, 0.0]);
            multRotationX(90);
            multScale([0.4, 0.3, 0.05]);
            cabinP();
        popMatrix();

        
        
        pushMatrix();
            multTranslation([-0.015, 0.12, 0.0]);
            multRotationZ(90);
            multScale([0.09, 0.47, 0.09]);
            middleGun();
        popMatrix();

        
        pushMatrix();
            multTranslation([-0.006, 0.12, 0.0]);
            multRotationZ(90);
            multScale([0.06, 0.53, 0.06]);
            middleGun();
        popMatrix();

       
        pushMatrix();
            multTranslation([-0.05, 0.12, 0.0]);
            multRotationZ(90);
            multScale([0.02, 0.47, 0.02]);
            middleGun();
        popMatrix();

      
        pushMatrix();
            multTranslation([0.05, 0.12, -0.17]);
            multRotationZ(90);
            multScale([0.04, 0.19, 0.04]);
            middleGun();
        popMatrix();

       
        pushMatrix();
            multTranslation([0.05, 0.12, 0.17]);
            multRotationZ(90);
            multScale([0.04, 0.19, 0.04]);
            middleGun();
        popMatrix();

        pushMatrix();
            multTranslation([0.14, 0.17, 0.0]);
            multRotationX(90);
            multScale([0.17, 0.15, 0.1]);
            cabinP();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.134, 0.17, 0.0]);
            multRotationX(90);
            multScale([0.178, 0.17, 0.06]);
            cabinP();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.24, 0.163, 0.17]);
            batWings();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.28, 0.181, 0.17]);
            batWings();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.32, 0.2, 0.17]);
            batWings();
        popMatrix();

       
        pushMatrix();
            multTranslation([0.24, 0.163, -0.17]);
            batWings();
        popMatrix();

     
        pushMatrix();
            multTranslation([0.28, 0.181, -0.17]);
            batWings();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.32, 0.2, -0.17]);
            batWings();
        popMatrix();




    }

    function batWings(){ 
         
        multRotationX(90);
        multScale([0.14, 0.01, 0.03]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }

    function middleGun(){  
        
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }



    function cabinP(){
        
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }
    function frontWheel(){
        multRotationX(90);
        multScale([0.1, 0.15, 0.06]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }


    function wheel(){  
        multRotationX(90);
        multScale([0.08, 0.4, 0.08]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }

    function wheelsSquad(){
        multScale([0.12, 0.08, 0.05]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function batMobileBase(){
        multTranslation([0.0, 0.0, 0.0]);
        multScale([1.0, 0.1, 1.0]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
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
            multTranslation([0.37, 0.749, -0.247]);
            multScale([0.02, 0.109, 0.02]);
            column();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.46, 0.749, -0.247]);
            multScale([0.02, 0.109, 0.02]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.55, 0.749, -0.247]);
            multScale([0.02, 0.109, 0.02]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.55, 0.65, -0.13]);
            multScale([0.02, 0.1, 0.02]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.37, 0.65, -0.13]);
            multScale([0.02, 0.1, 0.02]);
            column();
        popMatrix();

        pushMatrix();
            multTranslation([0.359, 0.67, 0.05]);
            multRotationZ(90);
            multScale([0.2, 0.02, 0.2]);
            symbol();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.349, 0.67, 0.07]);
            multRotationZ(90);
            multScale([1.2, 10.0, 2.0]);
            partsOfH();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.349, 0.67, 0.02]);
            multRotationX(34);
            multRotationZ(90);
            multScale([2.3, 10.0, 2.0]);
            partsOfH();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.346, 0.66, 0.029]);
            multRotationX(90);
            multRotationZ(90);
            multScale([0.7, 10.0, 2.0]);
            partsOfH();
        popMatrix();

        gl.uniform3fv(uColor, vec3(0.20, 0.35, 0.71));
        pushMatrix();
            multTranslation([0.456, 0.489, 0.159]);
            multScale([0.17, 0.96, 0.02]);
            frontWiondow();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.456, 0.489, 0.0009]);
            multRotationX(14);
            multScale([0.17, 0.96, 0.02]);
            frontWiondow();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.456, 0.749, -0.05]);
            multScale([0.17, 0.11, 0.4]);
            principalStage();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.456, 0.67, 0.018]);
            multScale([0.17, 0.1, 0.3]);
            principalStage();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.456, 0.51, 0.086]);
            multScale([0.17, 0.173, 0.146]);
            principalStage();
        popMatrix();

        
        pushMatrix();
            multTranslation([0.456, 0.31, 0.059]);
            multScale([0.17, 0.173, 0.189]);
            principalStage();
        popMatrix();

       
        pushMatrix();
            multTranslation([0.456, 0.11, 0.03]);
            multScale([0.17, 0.173, 0.23]);
            principalStage();
        popMatrix();

    }
    
    function principalStage(){
        
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }


    function frontWiondow(){
        
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
            multTranslation([0.46, 0.69, -0.043]);
            multScale([0.2, 0.02, 0.4]);
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
        multScale([100.0, 0.01, 100.0]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
