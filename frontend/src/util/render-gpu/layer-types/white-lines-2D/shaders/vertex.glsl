precision highp float;

attribute float a_posx;
attribute float a_posy;
attribute float a_selmask;
attribute float a_colorval;

uniform vec2 u_conv_factor;
uniform vec2 u_conv_offset;

uniform float u_opacity;
uniform float u_intensity;

varying float v_color_frac;
varying float v_intensity;




void main() {

  gl_Position = vec4(
    a_posx * u_conv_factor.x + u_conv_offset.x, 
    a_posy * u_conv_factor.y + u_conv_offset.y, 
    0.0, 1.0);

  v_color_frac = u_opacity;
  v_intensity = u_intensity;
}


