precision highp float;


varying float v_color_frac;
varying float v_selmask;

uniform sampler2D u_sampler;

 
void main()
{
    if (v_color_frac < 0.0) discard;
    
    float r = 0.0, delta = 0.0, alpha = 1.0;
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;

    // round point
    r = dot(cxy, cxy);
    alpha = 1.0 - smoothstep(0.8, 1.0, r);

    if (alpha <0.01) discard;

    vec2 vTextureCoord = vec2(v_color_frac, 0.5);

    vec4 v_color = texture2D(u_sampler, vTextureCoord);

    if (v_selmask < 0.5) v_color = vec4(0.5,0.5,0.5, 0.3);

    gl_FragColor = v_color * alpha;
}