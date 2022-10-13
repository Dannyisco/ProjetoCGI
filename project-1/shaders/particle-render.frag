precision mediump float;

varying float fLeft;
varying float fTotal;

void main() {
  gl_FragColor = vec4(0.94, 0.51, 0.63, (fTotal-fLeft)/fTotal);
  
}