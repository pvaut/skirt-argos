precision highp float;

attribute float a_posx;
attribute float a_posy;
attribute float a_selmask;
attribute float a_color_source_r;
attribute float a_color_source_g;
attribute float a_color_source_b;

uniform vec2 u_conv_factor;
uniform vec2 u_conv_offset;

uniform float u_pointsize;

uniform float u_background;
uniform float u_softening;
uniform float u_stretch;
uniform float u_color_saturation_buffer;

uniform float u_norm_r;
uniform float u_norm_g;
uniform float u_norm_b;

varying vec4 v_color;
varying float v_selmask; // 0=unselected 1=selected

float asinh(float x) {
    return log(x + sqrt(x * x + 1.0));
}


void main() {

  gl_Position = vec4(
    a_posx * u_conv_factor.x + u_conv_offset.x, 
    a_posy * u_conv_factor.y + u_conv_offset.y, 
    0.0, 1.0);


  v_selmask = a_selmask;

//   if (!(a_colorval>0.0) && !(a_colorval<1.0)) // poor man's isnan
//     v_color_frac = -1.0; // negative value means don't show


  //gl_Position.z = slice_frac / 2.0; //  we sort the points according to the slicing (e.g. Z axis)


  gl_PointSize = u_pointsize;

  float color_r = max(0.0, a_color_source_r / u_norm_r - u_background);
  float color_g = max(0.0, a_color_source_g  / u_norm_g - u_background);
  float color_b = max(0.0, a_color_source_b / u_norm_b - u_background);
  float I = (color_r + color_g + color_b) + 1E-9;
  float I_stretch = asinh(u_softening * I / u_stretch) / u_softening;

  float color_r_corr =  color_r * I_stretch / I;
  float color_g_corr =  color_g * I_stretch / I;
  float color_b_corr =  color_b * I_stretch / I;

  float color_corr_max = max(max(1.0+u_color_saturation_buffer, color_r_corr), max(color_g_corr, color_b_corr))/(1.0+u_color_saturation_buffer);
  color_r_corr = min(1.0, color_r_corr / color_corr_max);
  color_g_corr = min(1.0, color_g_corr / color_corr_max);
  color_b_corr = min(1.0, color_b_corr / color_corr_max);

  v_color = vec4(color_r_corr, color_g_corr, color_b_corr,1.0);

  if (a_selmask < 0.5) { // means point not selected
//    v_color = vec4(0.25, 0.25, 0.25, 1.0);
      v_color = vec4(0.2+color_r_corr/3.0, 0.2+color_g_corr/3.0, 0.2+color_b_corr/3.0, 1.0);
    } 

}


