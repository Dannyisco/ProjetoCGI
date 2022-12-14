precision highp float;
const int MAX_LIGHTS =8;

struct LightInfo {
 
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 axis;
    float aperture;
    float cutoff;
    vec4 position;
    int on;
    int typeof;
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

uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transf. for vectors

void main() {
    for(int i=0; i<MAX_LIGHTS; i++) {
        if(i == uNLights) break;

        if(uLights[i].on == 1){
            vec3 L;
            vec3 V = normalize(fViewer);
            vec3 N = normalize(fNormal);
            vec3 H = normalize(L+V);
            float decay;

            if(uLights[i].typeof == 1)
                L = normalize((mViewNormals*uLights[i].position).xyz);
            else {
                L = normalize((mView*uLights[i].position).xyz - fPosition);
            }
                
            if(uLights[i].typeof == 2) {
                float angle = acos(dot(L, -uLights[i].axis)/length(L) * length(-uLights[i].axis));
                if(angle <= radians(uLights[i].aperture))
                    decay = pow(cos(angle), uLights[i].cutoff);
                else
                    decay = 0.0;
            }
            else {
                decay = 1.0;
            }
        
            vec3 ambientColor = uLights[i].ambient/255.0 * uMaterial.Ka /255.0;
            vec3 diffuseColor = uLights[i].diffuse/255.0 * uMaterial.Kd /255.0;
            vec3 specularColor = uLights[i].specular/255.0 * uMaterial.Ks /255.0;
            
            float diffuseFactor = max( dot(L,N), 0.0 );
            vec3 diffuse = diffuseFactor * diffuseColor * decay;
            float specularFactor = pow(max(dot(N,H), 0.0), uMaterial.shininess) ;
            vec3 specular = specularFactor * specularColor * decay;

            if( dot(L,N) < 0.0 ) {
                specular = vec3(0.0, 0.0, 0.0);
            }

            gl_FragColor += vec4(ambientColor + diffuse + specular, 1);
        }else
            gl_FragColor += vec4(0,0,0,0);
    }
}