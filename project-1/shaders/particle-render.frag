precision mediump float;

varying float fLeft;
varying float fTotal;

void main() {
  gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), vec4(1.0, 0.843, 0.082, 1.0), ((fTotal-fLeft)/fTotal));
}