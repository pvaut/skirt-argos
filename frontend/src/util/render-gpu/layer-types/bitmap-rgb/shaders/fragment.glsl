
precision highp float;

varying vec4 v_color;
varying float v_selmask;

uniform float u_pointsize;
uniform float u_pointsize_rel_x;
uniform float u_pointsize_rel_y;

 
void main()
{
    if (v_color[3] <= 1E-9) discard; // signal for absent data
    
    float r = 0.0, delta = 0.0, alpha = 1.0;
    vec2 cxy = (2.0 * gl_PointCoord - 1.0);

    if ((cxy.x < -u_pointsize_rel_x) || (cxy.x > u_pointsize_rel_x)) discard;
    if ((cxy.y < -u_pointsize_rel_y) || (cxy.y > u_pointsize_rel_y)) discard;

    gl_FragColor = v_color;
}