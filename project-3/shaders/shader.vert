precision highp float;
const int MAX_LIGHTS = 3;

struct LightInfo {
    // Light colour intensities
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    // Light geometry
    vec4 position;  // Position/direction of light (in camera coordinates)
    // ...
    //   additional fields
    // ...
};

uniform int uNLights; // Effective number of lights used
uniform LightInfo uLights[MAX_LIGHTS]; // The array of lights present in the scene


attribute vec4 vPosition;
attribute vec4 vNormal;

uniform mat4 mModelView;// model-view transformation
uniform mat4 mNormals; // model-view transformation for normals
uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transf. for vectors
uniform mat4 mProjection; // projection matrix

//varying vec4 fColor;
varying vec3 fLight;
varying vec3 fNormal;
varying vec3 fViewer;

void main() {

    vec3 posC = (mModelView * vPosition).xyz;

    fNormal = (mNormals * vNormal).xyz;

    for(int i=0; i < MAX_LIGHTS; i++) {
        if(i == 1) break;

        if(uLights[i].position.w == 0.0)
            fLight += normalize((mViewNormals*uLights[i].position).xyz);
        else
            fLight += normalize((mView*uLights[i].position).xyz - posC);
    }
    
    fViewer = vec3(0,0,1); 
    
    gl_Position = mProjection * mModelView * vPosition;
}