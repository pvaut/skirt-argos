
precision highp float;

varying float v_color_frac;

varying float v_intensity;


 
void main()
{
    if (v_color_frac < -1E-9) discard; // signal for absent data
    
    gl_FragColor = vec4(v_intensity,v_intensity,v_intensity, v_color_frac);
}