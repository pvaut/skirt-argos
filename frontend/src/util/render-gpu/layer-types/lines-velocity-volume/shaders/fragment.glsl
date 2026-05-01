
precision highp float;


varying float v_line_opacity;
varying float v_color_frac;
varying float v_selmask;

 
void main()
{
    if (v_color_frac < 0.0) discard;
    vec4 v_color = vec4(1.0, 1.0, 1.0, v_line_opacity);
    if (v_selmask < 0.5) v_color = vec4(0.2,0.2,0.2,0.3 * v_line_opacity);
    gl_FragColor = v_color;
}