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
uniform float uAngleMin;
uniform float uAngleMax;


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

      gfSum += normalize(r) * G_CONSTANT * mass / (pow(length(r)*RE, 2.0));
   }

   return gfSum;
}



   /* Update parameters according to our simple rules.*/
void main() {

   highp float angle = rand(vPosition*uDeltaTime) * (uAngleMax - uAngleMin) + uAngleMin;
   highp float velocity = rand(vVelocity*uDeltaTime) * (uVelocityMax - uVelocityMin) + uVelocityMin;

   vPositionOut = vPosition + vVelocity * uDeltaTime;
   vAgeOut = vAge + uDeltaTime;
   vLifeOut = rand(vPosition * uDeltaTime) * (uLifeMax - uLifeMin) + uLifeMin;
   vVelocityOut = vec2(velocity*cos(angle), velocity*sin(angle)) + net_force(vPosition) * uDeltaTime;

      
   if (vAgeOut >= vLife) {
      vAgeOut = 0.0;
      vPositionOut = uOrigin;
   }

}