precision mediump float;

attribute vec2 vPosition;
attribute float vAge;
attribute float vLife;
attribute vec2 vVelocity;

varying float fLeft;
varying float fTotalAge;

uniform vec2 uScale;

void main() {
  gl_PointSize = 2.0;
  gl_Position = vec4(vPosition/uScale, 0.0, 1.0) ;
  fLeft = vAge;
  fTotalAge = vLife;
}