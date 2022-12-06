precision highp float;
const int MAX_LIGHTS = 8;

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

//uniform int uNLights; // Effective number of lights used
uniform LightInfo uLights[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial;        // The material of the object being drawn

uniform vec3 uColor;
varying vec3 fNormal;
varying vec3 fLight;
varying vec3 fViewer;
//const vec4 lightPosition = vec4(0.0, 1.8, 1.3, 1.0);


void main() {
    vec3 ambientColor;
    vec3 diffuseColor;
    vec3 specularColor;
    float diffuseFactor;
    vec3 diffuse;
    float specularFactor;
    vec3 specular;


    for(int i=0; i<MAX_LIGHTS; i++) {
        //if(i == uNLights) break;
        vec3 L = normalize(fLight);
        vec3 V = normalize(fViewer);
        vec3 N = normalize(fNormal);
        vec3 H = normalize(L+V);
        
        ambientColor = uLights[i].ambient * uMaterial.Ka;
        diffuseColor = uLights[i].diffuse * uMaterial.Kd;
        specularColor = uLights[i].specular * uMaterial.Ks;
        diffuseFactor = max( dot(L,N), 0.0 );
        diffuse = diffuseFactor * diffuseColor;
        specularFactor = pow(max(dot(N,H), 0.0), shininess);
        specular = specularFactor * specularColor;

        if( dot(L,N) < 0.0 ) {
            specular = vec3(0.0, 0.0, 0.0);
        }

        gl_FragColor += vec4(ambientColor + diffuse + specular, 1.0);
    }
}