precision highp float;

attribute vec4 vNormal;
attribute vec4 vPosition;

uniform mat4 mModelView;// model-view transformation
uniform mat4 mNormals; // model-view transformation for normals
uniform mat4 mProjection; // projection matrix

varying vec3 fNormal;
varying vec3 fViewer;
varying vec3 fPosition;

void main() {
    fNormal = (mNormals * vNormal).xyz;
    
    vec3 posC = (mModelView * vPosition).xyz;
    fViewer = - posC;
    fPosition = posC;
    
    gl_Position = mProjection * mModelView * vPosition;
}