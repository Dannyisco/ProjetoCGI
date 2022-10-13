import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../libs/utils.js';
import { vec2, flatten, subtract, dot } from '../libs/MV.js';

// Buffers: particles before update, particles after update, quad vertices
let inParticlesBuffer, outParticlesBuffer, quadBuffer;

// Particle system constants

// Total number of particles
const N_PARTICLES = 100000;
const MAX_LIFE = vec2(2, 20);
const MIN_LIFE = vec2(1, 19);

let drawPoints = true;
let drawField = true;

let n = 6.371 * (10**6);
let counterPlanets=0;
//const MAX_PLANETS=10;

let uRadius = [];
let uPosition = [];

let cursorPos = vec2(0.0);

let centerX = 0;
let centerY = 0;

let lifeMin = 2;
let lifeMax = 10;

let velocityMin = 0.1;
let velocityMax = 0.2;

let spreadAngle = Math.PI;
let angleDirect = 0.0;

let open = 2.0;

let time = undefined;

function main(shaders)
{
    // Generate the canvas element to fill the entire page
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    /** type {WebGL2RenderingContext} */
    const gl = setupWebGL(canvas, {alpha: true});

    // Initialize GLSL programs    
    const fieldProgram = buildProgramFromSources(gl, shaders["field-render.vert"], shaders["field-render.frag"]);
    const renderProgram = buildProgramFromSources(gl, shaders["particle-render.vert"], shaders["particle-render.frag"]);
    const updateProgram = buildProgramFromSources(gl, shaders["particle-update.vert"], shaders["particle-update.frag"], ["vPositionOut", "vAgeOut", "vLifeOut", "vVelocityOut"]);

    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 

    buildQuad();
    buildParticleSystem(N_PARTICLES);

    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0,0,canvas.width, canvas.height);
    });

    window.addEventListener("keydown", function(event) {
        console.log(event.key);
        switch(event.key) {
            case "PageUp":
                if(event.shiftKey)
                    velocityMax += 0.1;
                else
                    velocityMax += 0.1;
                break;
            case "PageDown":
                if(event.shiftKey)
                    velocityMin -= 0.1;
                else
                    velocityMax -= 0.1;
                break;
            case "ArrowUp":
                if(spreadAngle + 0.05 > Math.PI)
                    spreadAngle = Math.PI;
                else
                    spreadAngle += 0.05;
                break;
            case "ArrowDown":
                if(spreadAngle - 0.05 < -Math.PI)
                    spreadAngle = -Math.PI;
                else
                    spreadAngle -= 0.05;
                break;    
            case "ArrowLeft":
                angleDirect+=0.02;
                break;
            case "ArrowRight":
                angleDirect-=0.02;
                break;
            case 'q':
                if(lifeMin < MIN_LIFE.y)
                    lifeMin += 1;
                break;
            case 'a':
                if(lifeMin > MIN_LIFE.x)
                    lifeMin -= 1;
                break;
            case 'w':
                if(lifeMax < MAX_LIFE.y)
                    lifeMax += 1;
                break;
            case 's':
                if(lifeMax > MAX_LIFE.x)
                    lifeMax -= 1;
                break;
            case '0':
                drawField = !drawField;
                break;
            case '9':
                drawPoints  = !drawPoints;
                break; 
            case 'Shift':
                centerX = cursorPos[0];
                centerY = cursorPos[1];
                break;

        }
    })
    
    canvas.addEventListener("mousedown", function(event) {
        let initialPos= getCursorPosition(canvas, event);
        uPosition.push(initialPos);
    });

    canvas.addEventListener("mousemove", function(event) {
        const p = getCursorPosition(canvas, event);

        //console.log(p);
    });

    canvas.addEventListener("mouseup", function(event) {
        let finalPos = getCursorPosition(canvas, event);
        let initialPos = uPosition[counterPlanets];
        let radius = (Math.hypot(finalPos[0] - initialPos[0], finalPos[1] - initialPos[1])) * n; 
        //let radius = (((finalPos[0] - initialPos[0])*2) + ((finalPos[1] - initialPos[1])*2)) * (1/2);
        uRadius.push(radius);
      
        counterPlanets++;
    });

    
    function getCursorPosition(canvas, event) {
        const mx = event.offsetX;
        const my = event.offsetY;

        cursorPos[0]=((mx / canvas.width * 2) - 1) * 1.5;;
        cursorPos[1]=(((canvas.height - my)/canvas.height * 2) -1)*(1.5 * canvas.height / canvas.width);

        const x = ((mx / canvas.width * 2) - 1) * 1.5;
        const y = (((canvas.height - my)/canvas.height * 2) -1)*(1.5 * canvas.height / canvas.width);
        

        return vec2(x,y);
    }

    window.requestAnimationFrame(animate);

    function buildQuad() {
        const vertices = [-1.0, 1.0, -1.0, -1.0, 1.0, -1.0,
                          -1.0, 1.0,  1.0, -1.0, 1.0,  1.0];
        
        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    }

    function buildParticleSystem(nParticles) {
        const data = [];

        for(let i=0; i<nParticles; ++i) {
            // position
            const x = 3.0*Math.random() -1.5;
            const y = 3.0*Math.random() -1.5;

            data.push(x); data.push(y);
            
            // age
            data.push(0.0);

            // life
            const life = Math.random() * (lifeMax - lifeMin) + lifeMin
            data.push(life);


            // velocity
            let angle = (2.0 * Math.random()-1) * Math.PI;
            let velocity = 0.1;//Math.random() * (velocityMax - velocityMin) + velocityMin;

            data.push(velocity*Math.cos(angle));
            data.push(velocity*Math.sin(angle));
        }

        inParticlesBuffer = gl.createBuffer();
        outParticlesBuffer = gl.createBuffer();

        // Input buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);

        // Output buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, outParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);
    }




    function animate(timestamp, x, y)
    {
        let deltaTime = 0;

        if(time === undefined) {        // First time
            time = timestamp/1000;
            deltaTime = 0;
        } 
        else {                          // All other times
            deltaTime = timestamp/1000 - time;
            time = timestamp/1000;
        }

        window.requestAnimationFrame(animate);

        // Clear framebuffer
        gl.clear(gl.COLOR_BUFFER_BIT);

        if(drawField) drawQuad();
        updateParticles(deltaTime);
        if(drawPoints) drawParticles(outParticlesBuffer, N_PARTICLES);

        swapParticlesBuffers();
    }

    function updateParticles(deltaTime)
    {
        // Setup uniforms
        const uDeltaTime = gl.getUniformLocation(updateProgram, "uDeltaTime");
        const uOrigin = gl.getUniformLocation(updateProgram, "uOrigin");
        const uLifeMin = gl.getUniformLocation(updateProgram, "uLifeMin");
        const uLifeMax = gl.getUniformLocation(updateProgram, "uLifeMax");
        const uVelocityMin = gl.getUniformLocation(updateProgram, "uVelocityMin");
        const uVelocityMax = gl.getUniformLocation(updateProgram, "uVelocityMax");
        const uCounter = gl.getUniformLocation(updateProgram, "uCounter");
        const uAngle = gl.getUniformLocation(updateProgram, "uAngle");
        const uAngleDirect = gl.getUniformLocation(updateProgram, "uAngleDirect");

        gl.useProgram(updateProgram);

        gl.uniform1f(uDeltaTime, deltaTime);
        gl.uniform2f(uOrigin, centerX, centerY);
        gl.uniform1f(uLifeMin, lifeMin);
        gl.uniform1f(uLifeMax, lifeMax);
        gl.uniform1f(uVelocityMin, velocityMin);
        gl.uniform1f(uVelocityMax, velocityMax);
        gl.uniform1i(uCounter, counterPlanets);
        gl.uniform1f(uAngle, spreadAngle);
        gl.uniform1f(uAngleDirect, angleDirect);

        
        for(let i=0; i<counterPlanets; i++) {
            // Get the location of the uniforms...
            const a = gl.getUniformLocation(updateProgram, "uPosition[" + i + "]");
            const b = gl.getUniformLocation(updateProgram, "uRadius[" + i + "]");
            // Send the corresponding values to the GLSL program
            gl.uniform2fv(a, uPosition[i]);
            gl.uniform1f(b, uRadius[i]);
        }
       
        // Setup attributes
        const vPosition = gl.getAttribLocation(updateProgram, "vPosition");
        const vAge = gl.getAttribLocation(updateProgram, "vAge");
        const vLife = gl.getAttribLocation(updateProgram, "vLife");
        const vVelocity = gl.getAttribLocation(updateProgram, "vVelocity");

        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(vAge, 1, gl.FLOAT, false, 24, 8);
        gl.vertexAttribPointer(vLife, 1, gl.FLOAT, false, 24, 12);
        gl.vertexAttribPointer(vVelocity, 2, gl.FLOAT, false, 24, 16);
        
        gl.enableVertexAttribArray(vPosition);
        gl.enableVertexAttribArray(vAge);
        gl.enableVertexAttribArray(vLife);
        gl.enableVertexAttribArray(vVelocity);

        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outParticlesBuffer);
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, N_PARTICLES);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    }

    function swapParticlesBuffers()
    {
        let auxBuffer = inParticlesBuffer;
        inParticlesBuffer = outParticlesBuffer;
        outParticlesBuffer = auxBuffer;
    }

    function drawQuad() {

        gl.useProgram(fieldProgram);

        // Setup Uniform
        const uScale = gl.getUniformLocation(fieldProgram, "uScale");
        const uCounter = gl.getUniformLocation(fieldProgram, "uCounter");
        gl.uniform2f(uScale, 1.5, 1.5 * canvas.height / canvas.width);
        gl.uniform1i(uCounter, counterPlanets);

        for(let i=0; i<counterPlanets; i++) {
            // Get the location of the uniforms...
            const a = gl.getUniformLocation(fieldProgram, "uPosition[" + i + "]");
            const b = gl.getUniformLocation(fieldProgram, "uRadius[" + i + "]");
            // Send the corresponding values to the GLSL program
            gl.uniform2fv(a, uPosition[i]);
            gl.uniform1f(b, uRadius[i]);
        }

        // Setup attributes
        const vPosition = gl.getAttribLocation(fieldProgram, "vPosition"); 

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawParticles(buffer, nParticles)
    {

        gl.useProgram(renderProgram);

        // Setup attributes
        const vPosition = gl.getAttribLocation(renderProgram, "vPosition");
        const uScale = gl.getUniformLocation(renderProgram, "uScale");

        gl.uniform2f(uScale, 1.5, 1.5 * canvas.height / canvas.width);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.drawArrays(gl.POINTS, 0, nParticles);
    }

}


loadShadersFromURLS([
    "field-render.vert", "field-render.frag",
    "particle-update.vert", "particle-update.frag", 
    "particle-render.vert", "particle-render.frag"
    ]
).then(shaders=>main(shaders));
