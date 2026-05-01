precision highp float;


attribute float a_posx;
attribute float a_posy;
attribute float a_posz;

attribute float a_line_edge_type;
attribute float a_selmask;

uniform vec3 u_projection_center;
uniform vec3 u_projection_x;
uniform vec3 u_projection_y;
uniform vec3 u_projection_z;
uniform vec3 u_view_dir;
uniform float u_aspect_corr_x;
uniform float u_aspect_corr_y;

uniform float u_opacity;

varying float v_line_opacity;
varying float v_color_frac;
varying float v_selmask; // 0=unselected 1=selected

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

  v_color_frac = 1.0;

  v_line_opacity = u_opacity * (1.0 - a_line_edge_type);
  if (a_selmask < 0.5) v_line_opacity *= 0.4;
  v_selmask = a_selmask;
  
  float slice_frac = (a_slice - u_slice_minval) / (u_slice_maxval - u_slice_minval);

  if ((slice_frac < 0.0) || (slice_frac > 1.0)) // point outside current slice
    v_color_frac = -1.0; //  negative value means don't show

}

