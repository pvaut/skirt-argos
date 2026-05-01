
precision highp float;

varying float v_color_frac;
varying float v_selmask;

uniform sampler2D u_sampler;

uniform float u_pointsize;
uniform float u_pointsize_rel_x;
uniform float u_pointsize_rel_y;

 
void main()
{
    if (v_color_frac < -1E-9) discard; // signal for absent data
    
    float r = 0.0, delta = 0.0, alpha = 1.0;
    vec2 cxy = (2.0 * gl_PointCoord - 1.0);

    if ((cxy.x < -u_pointsize_rel_x) || (cxy.x > u_pointsize_rel_x)) discard;
    if ((cxy.y < -u_pointsize_rel_y) || (cxy.y > u_pointsize_rel_y)) discard;

    vec2 vTextureCoord = vec2(v_color_frac, 0.5);

    vec4 v_color = texture2D(u_sampler, vTextureCoord);
    if (v_selmask < 0.5) {
     //   v_color.xyz = vec3(0.3,0.3,0.3);
     v_color.xyz = vec3(0.2+v_color.x/3.0, .2+v_color.y/3.0, .2+v_color.z/3.0);
    }

    gl_FragColor = v_color * alpha;
}