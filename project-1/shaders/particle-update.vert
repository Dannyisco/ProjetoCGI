precision mediump float;


const int MAX_PLANETS=10;
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];
uniform int uCounter;
const float G_CONSTANT = 6.67 * pow(10.0, -11.0);
const float DENSITY = 5.51 * pow(10.0, 3.0);
const float RE = 6.371 * pow(10.0, 6.0);
const float pi = 3.1415;

uniform float uLifeMin;
uniform float uLifeMax;
uniform float uVelocityMin;
uniform float uVelocityMax;


/* Number of seconds (possibly fractional) that has passed since the last
   update step. */
uniform float uDeltaTime;
uniform vec2 uOrigin;


/* Inputs. These reflect the state of a single particle before the update. */


attribute vec2 vPosition;              // actual position
attribute float vAge;                  // actual age (in seconds)
attribute float vLife;                 // when it is supposed to dye 
attribute vec2 vVelocity;              // actual speed

/* Outputs. These mirror the inputs. These values will be captured into our transform feedback buffer! */
varying vec2 vPositionOut;
varying float vAgeOut;
varying float vLifeOut;
varying vec2 vVelocityOut;

// generates a pseudo random number that is a function of the argument. The argument needs to be constantly changing from call to call to generate different results
highp float rand(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

vec2 net_force(vec2 vPosition) {
   vec2 gfSum = vec2(0.0);

   for(int i = 0; i < MAX_PLANETS; i++) {
      if(i >= uCounter)
         break;

      highp float mass = 4.0 * 3.1415 * pow(uRadius[i], 3.0) * DENSITY / 3.0;
      vec2 r = vec2(uPosition[i].x - vPosition.x, uPosition[i].y - vPosition.y);

      gfSum += normalize(r) * G_CONSTANT * mass / (pow(length(r), 2.0)*RE);
      //gfSum.y += normalize(r).y * G_CONSTANT * mass / (pow(length(r), 2.0)*RE);
   }

   return gfSum;
}



   /* Update parameters according to our simple rules.*/
void main() {
   //vec2 velocity = vec2(rand(vPosition) * (uVelocityMax - uVelocityMin) + uVelocityMin);

   vPositionOut = vPosition + vVelocity * uDeltaTime;
   vAgeOut = vAge + uDeltaTime;
   vLifeOut = rand(vPosition) * (uLifeMax - uLifeMin) + uLifeMin;;
   vVelocityOut = (vVelocity + net_force(vPosition)/1000.0 * uDeltaTime) ;
      
   if (vAgeOut >= vLife) {
      vAgeOut = 0.0;
      vPositionOut = uOrigin;
      vVelocityOut = vec2(0.1*cos((2.0 * rand(vPosition)-1.0) * pi), 0.1*sin((2.0 * rand(vPosition)-1.0) * pi)) ;
   }

}