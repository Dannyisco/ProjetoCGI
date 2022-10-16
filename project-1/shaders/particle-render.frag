precision mediump float;

varying float fLeft;
varying float fTotalAge;

void main() {
  gl_FragColor = vec4(0.98, 0.76, 0.65, (fTotalAge-fLeft)/fTotalAge);  
}