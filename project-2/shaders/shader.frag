precision highp float;

varying vec3 fNormal;
uniform vec3 uColor;

void main() {
    gl_FragColor = vec4(uColor * 0.9 + fNormal * 0.1, 1.0);
}