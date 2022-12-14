precision highp float;
const int MAX_LIGHTS = 3;

struct LightInfo {
 
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 axis;

    float aperture;
    float cutoff;

    vec4 position;
    
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
varying vec3 fViewer;

uniform mat4 mModelView;// model-view transformation
uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transf. for vectors

void main() {
    for(int i=0; i<MAX_LIGHTS; i++) {
        if(i == uNLights) break;

        vec3 L;
        vec3 V = normalize(fViewer);
        vec3 N = normalize(fNormal);
        vec3 H = normalize(L+V);

        if(uLights[i].position.w == 0.0)
            L = normalize((mViewNormals*uLights[i].position).xyz);
        else
            L = normalize((mView*uLights[i].position).xyz - fPosition);

        float angle = acos(dot(L, -uLights[i].axis)/length(L) * length(-uLights[i].axis));
        float x = pow(cos(angle), uLights[i].cutoff);
        
        vec3 ambientColor = uLights[i].ambient/255.0 * uMaterial.Ka /255.0;
        vec3 diffuseColor = uLights[i].diffuse/255.0 * uMaterial.Kd /255.0;
        vec3 specularColor = uLights[i].specular/255.0 * uMaterial.Ks /255.0;
        
        float diffuseFactor = max( dot(L,N), 0.0 );
        vec3 diffuse = diffuseFactor * diffuseColor;
        float specularFactor = pow(max(dot(N,H), 0.0), uMaterial.shininess);
        vec3 specular = specularFactor * specularColor;

        if( dot(L,N) < 0.0 ) {
            specular = vec3(0.0, 0.0, 0.0);
        }

        gl_FragColor += vec4(ambientColor + diffuse + specular, x);
    }
}