precision highp float;

attribute float a_posx;
attribute float a_posy;
attribute float a_selmask;
attribute float a_colorval;

uniform vec2 u_conv_factor;
uniform vec2 u_conv_offset;

uniform float u_pointsize;
uniform float u_opacity;
uniform float u_color_minval;
uniform float u_color_maxval;
uniform float u_color_gammafactor;

varying float v_color_frac;
varying float v_selmask; // 0=unselected 1=selected

attribute float a_slice;
uniform float u_slice_minval;
uniform float u_slice_maxval;




void main() {

  gl_Position = vec4(
    a_posx * u_conv_factor.x + u_conv_offset.x, 
    a_posy * u_conv_factor.y + u_conv_offset.y, 
    0.0, 1.0);

  v_color_frac = (a_colorval - u_color_minval) / (u_color_maxval - u_color_minval);
  v_color_frac = min(1.0, max(0.0, v_color_frac));
  v_color_frac = pow(v_color_frac, u_color_gammafactor);
  v_selmask = a_selmask;


  float slice_frac = (a_slice - u_slice_minval) / (u_slice_maxval - u_slice_minval);


  if ((slice_frac < 0.0) || (slice_frac > 1.0)) // point outside current slice
    v_color_frac = -1.0; //  negative value means don't show

  if (!(a_colorval>0.0) && !(a_colorval<1.0)) // poor man's isnan
    v_color_frac = -1.0; // negative value means don't show


  gl_Position.z = slice_frac / 2.0; //  we sort the points according to the slicing (e.g. Z axis)

  if (a_selmask < 0.5) { // means point not selected
    gl_Position.z += 0.5; // we put unselected points further away, so that they never occlude a selected point
  } 

  gl_PointSize = u_pointsize;
}


