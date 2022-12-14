import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten,vec2, vec3, vec4, mult, rotateX, rotateY, inverse, transpose, normalMatrix, perspective, add } from "../../libs/MV.js";
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
let dragging = false;
let cursorPosition = vec2(0.0);
const POSITIONAL = 'Positional';
const DIRECTIONAL = 'Directional';
const SPOTLIGHT = 'Spotlight';

let optionsObj = {
    Mode : NaN,
    DepthTest : true,
    BackfaceCulling : true
}

let cameraObj = {
    Gama : 0,
    Theta : 0,
    fovy : 52,
    near : 0.1,
    far : 60,
    eye : vec3(0, 6, 10),
    at : vec3(0, 0, 0),
    up : vec3(0, 1, 0)
}

let lights = [
    {
    ambient : [41,19,73],
    diffuse : [87,78,115],
    specular : [106,34,223],
    position : [2,14,12,1.0],
    axis : [0.0,0.0,-1.0],
    aperture : 0,
    cutoff  : 8.1,
    on : true,
    typeof : POSITIONAL
    },
    {
    ambient : [145,26,98],
    diffuse : [125,69,108],
    specular : [126,74,155],
    position : [0.8,20.0,0.0,0.0],
    axis : [0.0,0.0,-1.0],
    aperture : 11.8,
    cutoff  : 8.1,
    on : false,
    typeof : DIRECTIONAL
    },
    {
    ambient : [122,46,93],
    diffuse : [215,56,186],
    specular : [168,73,112],
    position : [0.2,1.6,5.7,1.0],
    axis : [0.0,0.0,-1.0],
    aperture : 20,
    cutoff  : 10.5,
    on : true,
    typeof : SPOTLIGHT
    }
];

let bunnyMaterial = {
    Ka: [232,110,167],
    Kd: [243,173,189],
    Ks: [225,32,131],
    shininess : 100.0
}


let groundMaterial = {
    Ka: [131,165,225],
    Kd: [125,125,125],
    Ks: [0,0,0],
    shininess : 50.0
}

let torusMaterial = {
    Ka: [57,12,37],
    Kd: [75,22,36],
    Ks: [106,25,177],
    shininess : 100.0
}

let cubeMaterial = {
    Ka: [45,164,247],
    Kd: [255,255,255],
    Ks: [135,211,235],
    shininess : 50.0
};

let cylinderMaterial = {
    Ka : [87,40,135],
    Kd : [73,99,185],
    Ks : [188,43,137],
    shininess : 100.0
}


//GUI
const gui = new GUI()

//options
const options = gui.addFolder('Options')
options.add(optionsObj, 'BackfaceCulling', true, false).name('backface culling')
options.add(optionsObj, 'DepthTest', true, false).name('depth test')


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
up.add(cameraObj.up, 0, -1, 1, 0.01).step(0.1).name('x').listen();
up.add(cameraObj.up, 1, -1, 1, 0.01).step(0.1).name('y').listen();
up.add(cameraObj.up, 2, -1, 1, 0.01).step(0.1).name('z').listen();


//lights
const lightsFolder= gui.addFolder('Lights')

for(let i=0; i < lights.length; i++) {
    addLightFolder(i);
}

function addLightFolder(i) {
    const light = lightsFolder.addFolder('Light' + (i+1));

    light.add(lights[i],'on', true, false).name('On');

    const menu = light.add(lights[i], 'typeof', {Positional: POSITIONAL, Directional: DIRECTIONAL, Spotlight: SPOTLIGHT}).listen();

    menu.onChange(function(x){
        x != SPOTLIGHT ? spotlightSett.hide() : spotlightSett.show();

        if(lights[i].typeof== DIRECTIONAL) lights[i].position[3]=0.0;
        else lights[i].position[3]=1.0;
        });

    
    const intensities = light.addFolder('Intensities')
    intensities.addColor(lights[i], 'ambient').listen();
    intensities.addColor(lights[i], 'diffuse').listen();
    intensities.addColor(lights[i], 'specular').listen();

    const position = light.addFolder('Position')
    position.add(lights[i].position,0, -10, 50).step(0.1).name('x').listen();
    position.add(lights[i].position,1, -10, 50).step(0.1).name('y').listen();
    position.add(lights[i].position,2, -50, 50).step(0.1).name('z').listen();
    var x = position.add(lights[i].position,3).name('w').listen();
    x.domElement.style.pointerEvents = "none";
    x.domElement.style.opacity = .5;

    const spotlightSett = light.addFolder('Spotlight');

    const axis = spotlightSett.addFolder('Axis')
    axis.add(lights[i].axis,0).step(0.1).name('x').listen();
    axis.add(lights[i].axis,1).step(0.1).name('y').listen();
    axis.add(lights[i].axis,2).step(0.1).name('z').listen();

    spotlightSett.add(lights[i], 'aperture', 0, 90).step(0.1).listen();
    spotlightSett.add(lights[i], 'cutoff', 0, 200).step(0.1).name('cut off').listen();

    if(lights[i].typeof != SPOTLIGHT)
    spotlightSett.hide();
}

//material
const material = gui.addFolder('Material')
material.addColor(bunnyMaterial, 'Ka', 0, 255).listen();
material.addColor(bunnyMaterial, 'Kd', 0, 255).listen();
material.addColor(bunnyMaterial, 'Ks', 0, 255).listen();
material.add(bunnyMaterial, 'shininess',0, 100).listen();


function setup(shaders)
{
    //canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas); 
    mode = gl.TRIANGLES; 

    let program = buildProgramFromSources(gl, shaders["phong.vert"], shaders["phong.frag"]);

    let mProjection = perspective(cameraObj.fovy, aspect, cameraObj.near, cameraObj.far)
    let mView = lookAt([-15, 5, 0], [0, 0, 0], [0, 1, 0]);

    let initpos = vec2(0,0);
    

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
            var dy = (cursorPos[1] - initpos[1]) * 50; 
            var dx = (cursorPos[0] - initpos[0]) * 100;
        
            
            if(cameraObj.Theta > 180) cameraObj.Theta = 180
            else cameraObj.Theta -= dy;

            if(cameraObj.Gama > 180) cameraObj.Gama = 180
            else cameraObj.Gama += dx;

            if(cameraObj.Theta < -180) cameraObj.Theta = -180
            else cameraObj.Theta -= dy;

            if(cameraObj.Gama < -180) cameraObj.Gama = -180
            else cameraObj.Gama += dx;
            

        }
        initpos[0] = cursorPos[0];
        initpos[1] = cursorPos[1];
    });

    function getCursorPosition(canvas, event) {
        const mx = event.offsetX;
        const my = event.offsetY;
    
        cursorPosition[0]=((mx / canvas.width * 2) - 1) * 1.5;
        cursorPosition[1]=(((canvas.height - my)/canvas.height * 2) -1)*(1.5 * canvas.height / canvas.width);
    
        return vec2(cursorPosition[0], cursorPosition[1]);
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

        mView = mult(lookAt([cameraObj.eye[0], cameraObj.eye[1], cameraObj.eye[2]], 
            [cameraObj.at[0], cameraObj.at[1], cameraObj.at[2]],
            [cameraObj.up[0], cameraObj.up[1], cameraObj.at[2]]),
            mult(rotateX(cameraObj.Theta), rotateY( cameraObj.Gama)));

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
        
        gl.uniformMatrix4fv(mModelView,false,  flatten(modelView()));
        gl.uniformMatrix4fv(mNormals,false,  flatten(normalMatrix(modelView())));
        gl.uniformMatrix4fv(mview, false, flatten(mView));
        gl.uniformMatrix4fv(mViewNormals,false, flatten(normalMatrix(mView)));
        gl.uniformMatrix4fv(mprojection,false, flatten(mProjection));
        gl.uniform1i(uNLights, lights.length);

        for(let i=0; i < lights.length; i++) {
            const ambient = gl.getUniformLocation(program, "uLights[" + i + "].ambient");
            const diffuse = gl.getUniformLocation(program, "uLights[" + i + "].diffuse");
            const specular = gl.getUniformLocation(program, "uLights[" + i + "].specular");
            const position = gl.getUniformLocation(program, "uLights[" + i + "].position");
            const axis = gl.getUniformLocation(program, "uLights[" + i + "].axis");
            const cutoff = gl.getUniformLocation(program, "uLights[" + i + "].cutoff");
            const aperture = gl.getUniformLocation(program, "uLights[" + i + "].aperture");
            const on = gl.getUniformLocation(program, "uLights[" + i + "].on");
            const type = gl.getUniformLocation(program, "uLights[" + i + "].typeof");
            gl.uniform3fv(ambient, lights[i].ambient); 
            gl.uniform3fv(diffuse, lights[i].diffuse);  
            gl.uniform3fv(specular, lights[i].specular);
            gl.uniform4fv(position, vec4(lights[i].position[0], lights[i].position[1], lights[i].position[2], lights[i].position[3]));
            gl.uniform3fv(axis, vec3(lights[i].axis[0], lights[i].axis[1], lights[i].axis[2]));
            gl.uniform1f(cutoff , lights[i].cutoff);
            gl.uniform1f(aperture, lights[i].aperture);
            if(lights[i].on == true) gl.uniform1i(on, 1);
            else gl.uniform1i(on, 0);
            
            if(lights[i].typeof == 'Positional') gl.uniform1i(type, 0);
            else if(lights[i].typeof == 'Directional') gl.uniform1i(type, 1);
            else gl.uniform1i(type, 2);
        }

        pushMatrix()
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
        
        gl.uniform3fv(uKa, cubeMaterial.Ka);
        gl.uniform3fv(uKd, cubeMaterial.Kd);
        gl.uniform3fv(uKs, cubeMaterial.Ks);
        gl.uniform1f(shininess, cubeMaterial.shininess);
        pushMatrix()
            multTranslation([-2.5, 0, -2.5]);
            cube()
        popMatrix();
        
        gl.uniform3fv(uKa, cylinderMaterial.Ka);
        gl.uniform3fv(uKd, cylinderMaterial.Kd);
        gl.uniform3fv(uKs, cylinderMaterial.Ks);
        gl.uniform1f(shininess, cylinderMaterial.shininess);
        pushMatrix()
            multTranslation([-2.5, 0, 2.5]);
            cylinder()
        popMatrix();
 
        gl.uniform3fv(uKa, torusMaterial.Ka);
        gl.uniform3fv(uKd, torusMaterial.Kd);
        gl.uniform3fv(uKs, torusMaterial.Ks);
        gl.uniform1f(shininess, torusMaterial.shininess);
        pushMatrix()
            multTranslation([2.5, 0, -2.5]);
            torus()
        popMatrix();
       

        gl.uniform3fv(uKa, bunnyMaterial.Ka);
        gl.uniform3fv(uKd, bunnyMaterial.Kd);
        gl.uniform3fv(uKs, bunnyMaterial.Ks);
        gl.uniform1f(shininess, bunnyMaterial.shininess);
        pushMatrix()
            multTranslation([2.5, 0, 2.5]);
            bunny()
        popMatrix();
    }

    function cylinder() {
        multTranslation([0.0, 1 , 0.0]);
        multScale([2, 2, 2]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }

    function cube() {
        multTranslation([0.0, 1, 0.0]);
        multScale([2, 2, 2]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function torus() {
        multTranslation([0.0, 0.4, 0.0]);
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
const urls = ["phong.vert", "phong.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
