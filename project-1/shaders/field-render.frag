precision highp float;

varying vec2 fPosition;
const int MAX_PLANETS = 10;
uniform int uCounter;
uniform float uRadius[MAX_PLANETS];
uniform vec2 uPosition[MAX_PLANETS];
const float G_CONSTANT = 6.67 * pow(10.0, -11.0);
const float DENSITY = 5.51 * pow(10.0, 3.0);
const float RE = 6.371 * pow(10.0, 6.0);
const float pi = 3.1415;

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 net_force(vec2 fPosition) {
   vec2 gfSum = vec2(0.0);

   for(int i = 0; i < MAX_PLANETS; i++) {
      if(i >= uCounter)
         break;

      vec2 r = vec2(uPosition[i].x - fPosition.x, uPosition[i].y - fPosition.y);
      highp float distance = length(r)*RE;
      highp float mass = 0.0;

      if(distance <= uRadius[i])
         mass = 4.0 * 3.1415 * pow(distance, 3.0) * DENSITY / 3.0;
      else 
         mass = 4.0 * 3.1415 * pow(uRadius[i], 3.0) * DENSITY / 3.0;
         
      gfSum += normalize(r) * G_CONSTANT * mass / (pow(distance, 2.0));
   }
   return gfSum;
}

void main() {
    vec2 force = net_force(fPosition);
    highp float angle = atan(force.y, force.x)/(2.0*pi);
    highp float intensity = length(force);
    
    
      if(uCounter > 0) {
         gl_FragColor = vec4(hsv2rgb(vec3(angle, 1.0, 1.0)), pow(intensity, 2.0)/intensity);

         if (mod(intensity, 2.0) < 0.8*2.0  && mod(intensity, 2.0) > 0.8)
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
      else
         gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
   

}
