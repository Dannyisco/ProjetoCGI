precision highp float;

varying vec2 fPosition;
const int MAX_PLANETS = 10;
const int counter = 10;
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];
const float pi = 3.1415;

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 net_force(vec2 fPosition) {
   highp float G = 6.67 * pow(10.0, -11.0);
   highp float d = 5.51 * pow(10.0, 3.0);
   highp float n = 6.371 * pow(10.0, 6.0);
   
   vec2 force = vec2(0.0);

   for(int i=0; i < MAX_PLANETS; i++) {
    if(i > counter)
        break;

    vec2 r = uPosition[i] - fPosition;
    normalize(r);

    highp float mass = 4.0 * pi * pow(uRadius[i], 3.0) * d / 3.0;
    highp float len = length(r) * n;

    force += G * mass / pow(len, 2.0) * r;
   }
   
   return force;
}

void main() {
    vec2 force = net_force(fPosition);
    highp float angle = atan(force.y, force.x)/2.0*pi;
    highp float intensity = length(force);
    

        //gl_FragColor = vec4(hsv2rgb(vec3(angle, 1.0, 1.0)), 1.0);
    //else
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 

}
