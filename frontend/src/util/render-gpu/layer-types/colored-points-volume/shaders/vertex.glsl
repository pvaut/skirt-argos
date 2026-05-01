precision highp float;


attribute float a_posx;
attribute float a_posy;
attribute float a_posz;

attribute float a_velx;
attribute float a_vely;
attribute float a_velz;

attribute float a_selmask;
attribute float a_colorval;

uniform vec3 u_projection_center;
uniform vec3 u_projection_x;
uniform vec3 u_projection_y;
uniform vec3 u_projection_z;
uniform vec3 u_view_dir;
uniform float u_aspect_corr_x;
uniform float u_aspect_corr_y;

uniform float u_pointsize;
uniform float u_color_minval;
uniform float u_color_maxval;
uniform float u_color_gammafactor;


varying float v_color_frac;
varying float v_selmask; // 0=unselected 1=selected
varying float v_opacity_frac;

attribute float a_size;
uniform float u_size_minval;
uniform float u_size_maxval;
uniform float u_size_gammafactor;


attribute float a_slice;
uniform float u_slice_minval;
uniform float u_slice_maxval;




void main() {
  
  vec3 posit = vec3(a_posx, a_posy, a_posz) - u_projection_center;

  gl_Position = vec4(
    dot(posit, u_projection_x) * u_aspect_corr_x, 
    dot(posit, u_projection_y) * u_aspect_corr_y, 
    -0.25 * dot(posit, u_projection_z),
    1.0
  );

  v_color_frac = (a_colorval - u_color_minval) / (u_color_maxval - u_color_minval);
  v_color_frac = min(1.0, max(0.0, v_color_frac));
  v_color_frac = pow(v_color_frac, u_color_gammafactor);
  v_selmask = a_selmask;

  float slice_frac = (a_slice - u_slice_minval) / (u_slice_maxval - u_slice_minval);

  if ((slice_frac < 0.0) || (slice_frac > 1.0)) // point outside current slice
    v_color_frac = -1.0; //  negative value means don't show

  if (!(a_colorval>0.0) && !(a_colorval<1.0)) // poor man's isnan
    v_color_frac = -1.0; // negative value means don't show

  float size_frac = (0.1 + pow((a_size - u_size_minval) / (u_size_maxval - u_size_minval), u_size_gammafactor));

  v_opacity_frac = size_frac;

  gl_PointSize = u_pointsize * size_frac;
}


