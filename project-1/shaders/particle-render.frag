precision mediump float;

varying float fLeft;
varying float fTotalAge;

void main() {

  //mudar cores
  gl_FragColor = vec4(0.94, 0.51, 0.63, (fTotalAge-fLeft)/fTotalAge);
  
}