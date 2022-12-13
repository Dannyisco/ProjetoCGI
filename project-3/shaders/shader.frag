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

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used
uniform LightInfo uLights[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial;        // The material of the object being drawn

varying vec3 fPosition;
varying vec3 fNormal;
varying vec3 fLight;
varying vec3 fViewer;

void main() {
    for(int i=0; i<MAX_LIGHTS; i++) {
        if(i == 1) break;

        vec3 L = normalize(fLight);
        vec3 V = normalize(fViewer);
        vec3 N = normalize(fNormal);
        vec3 H = normalize(L+V);
        
        vec3 ambientColor = uLights[i].ambient * uMaterial.Ka /255.0;
        vec3 diffuseColor = uLights[i].diffuse * uMaterial.Kd /255.0;
        vec3 specularColor = uLights[i].specular * uMaterial.Ks /255.0;
        
        float diffuseFactor = max( dot(L,N), 0.0 );
        vec3 diffuse = diffuseFactor * diffuseColor;
        float specularFactor = pow(max(dot(N,H), 0.0), uMaterial.shininess);
        vec3 specular = specularFactor * specularColor;

        if( dot(L,N) < 0.0 ) {
            specular = vec3(0.0, 0.0, 0.0);
        }

        gl_FragColor = vec4(ambientColor + diffuse + specular, 1.0);
    }
}