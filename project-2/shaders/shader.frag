precision highp float;

varying vec3 fNormal;
uniform vec3 uColor;

void main() {
    if(fNormal[1] == 1.0)
        gl_FragColor = vec4(uColor, 1.0);
    else
        gl_FragColor = vec4(uColor * 0.95 + fNormal * 0.05, 1.0);
}