precision highp float;

varying vec2 fPosition;

void main() {
    
    //gl_FragColor = vec4(mod(fPosition.x, 1.0), mod(fPosition.y, 1.0), 0.0, 1.0);

    highp float radius = 0.1;
    highp float pi = 3.1415926535897932384626433832795;
    
    vec2 center = vec2(0.0);
    highp float value = distance(center, fPosition);

    vec2 v1 = vec2(-radius, 0);
    vec2 v2 = vec2(fPosition.x - center.x, fPosition.y - center.y);

    highp float angle = acos(dot(v1, v2)/(length(v1)*length(v2)));

    vec4 colors;
    
    if(fPosition.y <= 0.0) {
        if(0.0 < angle && angle < pi/3.0)
            colors = vec4(1.0, angle / pi * 3.0, 0.0, 1.0);
        else if(pi/3.0 <= angle && angle < 2.0 * pi/3.0)
            colors = vec4(angle / pi * (-3.0) + 2.0, 1.0, 0.0, 1.0);
        else if(2.0 * pi/3.0 <= angle && angle < 3.0 * pi/3.0)
            colors = vec4(0.0, 1.0, angle / pi * 3.0 - 2.0, 1.0);
        else {
            if(fPosition.x >= center.x)
                colors = vec4(0.0, 1.0, 1.0, 1.0);
            else
                colors = vec4(1.0, 0.0, 0.0, 1.0);  
        }
    }
    
   if(fPosition.y > 0.0) {
        if(0.0 <= angle && angle < pi/3.0)
            colors = vec4(1.0, 0.0, angle / pi * 3.0, 1.0);
        else if(pi/3.0 <= angle && angle < 2.0 * pi/3.0)
            colors = vec4(angle / pi * (-3.0) + 2.0, 0.0, 1.0, 1.0);
        else 
            colors = vec4(0.0, angle / pi * 3.0 - 2.0, 1.0, 1.0);
    }

    if(value <= radius)
        gl_FragColor = colors; 
    else
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 

}
