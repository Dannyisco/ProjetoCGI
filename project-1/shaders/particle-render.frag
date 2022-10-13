precision mediump float;

varying float fLeft;
varying float fTotal;

void main() {
  gl_FragColor = vec4(0.94, 0.51, 0.63, (fTotal-fLeft)/fTotal);
  //gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), vec4(1.0, 0.843, 0.082, 1.0), ((fTotal-fLeft)/fTotal));
}