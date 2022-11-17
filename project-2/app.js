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

let on = false;
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



const MAX_SPEED = 0.015;
const MAX_ANGLE = 30;

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
    mode = gl.TRIANGLES; 

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom, 0.01, 10);
    let mView = lookAt([3, 1.7, 3], [0, 0.6, 0], [0, 1, 0]);
    //let  mView = lookAt([0,1.6,0],  [0,0.6,0], [0,0,-1]);
    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeyup = function(event) {
        switch(event.key) {
            case "ArrowLeft":
                slowHelicopter = true;
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
                if(height == 0 && incBlade <= 0.05)
                    incBlade += 0.001;
                else if(height < 7.0){
                    height += 0.05;
                }
                break;
            case "ArrowDown":
                if(height >= 0.05) {
                    height -= 0.05;
                    
                }
                else {
                    slowBlade = true;
                    height = 0;
                    sleep(2000).then(() => {slowBlade = false; incBlade = 0});
                }
                break;
            case "1":
                mView = lookAt([3, 1.7, 3], [0, 0.6, 0], [0, 1, 0]);
                break;
            case "2":
                mView = lookAt([0,0.6,-1], [0,0.6,0], [0,1,0]);
                break;
            case "3":
                mView = lookAt([0,1.6,0],  [0,0.6,0], [0,0,-1]);
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
            if(slowHelicopter && incHelicopter >= 0.0001)
                incHelicopter -= 0.0001;

            if(slowBlade && incBlade >= 0.0005)
                incBlade -= 0.0005;
        } 

        helicopterSpeed += incHelicopter;

        if(height == 0) {
            bladeSpeed += incBlade;
            incHelicopter = 0;
        }
           
        if(height > 0)
            bladeSpeed += incBlade + incHelicopter;
        
        if(height <= 0.5) {
            if(incHelicopter == 0)
                inclination = 0
            else
                inclination -= inclination/(height/0.05)
        }
        else
            inclination = incHelicopter * MAX_ANGLE / MAX_SPEED;

        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        mProjection = ortho(-aspect*zoom,aspect*zoom, -zoom, zoom, 0.01, 10);
        uploadProjection(mProjection);
        
        loadMatrix(mView);

        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, vec3(0.98, 0.31, 0.09));

        pushMatrix();
            multRotationY(360 * helicopterSpeed);
            multScale([0.1,0.1,0.1]);
            multTranslation([(CABIN_LENGTH + TAIL_CONE_LENGTH)*3, (CABIN_HEIGHT+0.07) + height, 0.0]);
            multRotationX(-inclination);
            multRotationY(-90);
            helicopter();
        popMatrix();

        
        background(uColor);

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
       // const uColor = gl.getUniformLocation(program, "uColor");
        pushMatrix();
            blades();
        popMatrix();
        
        //gl.uniform3fv(uColor, vec3(0.0, 1, 0.0));
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

    function background(uColor) {
        gl.uniform3fv(uColor, vec3(0.16, 0.55, 0.18));
        pushMatrix();
            plane();
        popMatrix();
        pushMatrix();
            multScale([0.9, 1.5, 0.9]);
            multTranslation([-0.6, -0.005, -0.7]);
            pyramidBuilding(uColor);
        popMatrix();
        pushMatrix();
            helipads(uColor);
        popMatrix();
        pushMatrix();
            roads(uColor);
        popMatrix();
        

        

    }
    function roads(uColor){
        pushMatrix();
            road(uColor);
        popMatrix();
        pushMatrix();
            multRotationY(90);
            road(uColor);
        popMatrix();
        pushMatrix();
            multRotationY(-90);
            road(uColor);
        popMatrix();
    }

    function road(uColor){
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

    
    function helipads(uColor){
        gl.uniform3fv(uColor, vec3(0.3, 0.1, 0.1));
        pushMatrix();
            helipad(uColor);
        popMatrix();
        gl.uniform3fv(uColor, vec3(0.1, 0.1, 0.1));
        pushMatrix();
            helipad(uColor);
        popMatrix();
        gl.uniform3fv(uColor, vec3(0.0, 0.0, 0.2));
        pushMatrix();
            helipad(uColor);
        popMatrix();
    }

    function helipad(uColor){
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

    function pyramidBuilding(uColor){
        gl.uniform3fv(uColor, vec3(0.3, 0.1, 0.1));
        pushMatrix();
            base();
        popMatrix();
        gl.uniform3fv(uColor, vec3(0.1, 0.1, 0.1));
        pushMatrix();
            pyramid();
        popMatrix();
        gl.uniform3fv(uColor, vec3(0.0, 0.0, 0.2));
        pushMatrix();
            windows();
        popMatrix();
        pushMatrix();
            top();
        popMatrix();
        gl.uniform3fv(uColor, vec3(1.0, 1.0, 1.0));
        pushMatrix();
            light();
        popMatrix();


    }

    function top(){
        multRotationZ(90);
        multTranslation([0.48, 0.001, 0.0]);
        multScale([0.08, 0.01, 0.01]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function light(){
        multTranslation([0.00006, 0.51, 0.0]);
        multScale([0.02, 0.02, 0.02]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function windows(){
        pushMatrix();
            multTranslation([0.0, 0.22, -0.146]);
            multRotationX(32);
            windowGlass();
        popMatrix();
        pushMatrix();
            multTranslation([0.0, 0.22, 0.146]);
            multRotationX(-32);
            windowGlass();
        popMatrix();
        pushMatrix();
            multTranslation([0.146, 0.22, 0.0]);
            multRotationY(90);
            multRotationX(-32);
            windowGlass();
        popMatrix();
        pushMatrix();
            multTranslation([-0.146, 0.22, 0.0]);
            multRotationY(90);
            multRotationX(32);
            windowGlass();
        popMatrix();
    }

    function windowGlass(){
       
        multScale([0.15 , 0.15, 0.001]);
        
        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function pyramid(){
        multTranslation([0.0, 0.25, 0.0]);
        multScale([0.5, 0.4, 0.5]);
        uploadModelView();
        PYRAMID.draw(gl, program, mode);
    }

    function base(){
        multTranslation([0.0, 0.029, 0.0]);
        multScale([0.5, 0.06, 0.5]);
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
