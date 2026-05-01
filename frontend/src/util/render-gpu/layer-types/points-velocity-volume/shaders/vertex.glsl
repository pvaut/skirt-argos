precision highp float;


attribute float a_posx;
attribute float a_posy;
attribute float a_posz;

attribute float a_velx;
attribute float a_vely;
attribute float a_velz;

attribute float a_selmask;
// attribute float a_colorval;

uniform vec3 u_projection_center;
uniform vec3 u_projection_x;
uniform vec3 u_projection_y;
uniform vec3 u_projection_z;
uniform vec3 u_view_dir;
uniform float u_aspect_corr_x;
uniform float u_aspect_corr_y;

uniform float u_vel_cent_x;
uniform float u_vel_cent_y;
uniform float u_vel_cent_z;
uniform float u_vel_half_range;
uniform float u_vel_dir_frac;

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
  
  vec3 posit = vec3(a_posx, a_posy, a_posz) - u_projection_center;
  vec3 veloc =  vec3(a_velx-u_vel_cent_x, a_vely-u_vel_cent_y, a_velz-u_vel_cent_z);

  posit = posit + u_vel_dir_frac * veloc;
  gl_Position = vec4(
    dot(posit, u_projection_x) * u_aspect_corr_x, 
    dot(posit, u_projection_y) * u_aspect_corr_y, 
    -0.25 * dot(posit, u_projection_z),
    1.0
  );

  v_color_frac = dot(
    veloc,
    u_view_dir
    );

  v_color_frac = 0.5 + 0.5 * v_color_frac / u_vel_half_range;

  v_color_frac = min(1.0, max(0.0, v_color_frac));

  v_selmask = a_selmask;
  

  float slice_frac = (a_slice - u_slice_minval) / (u_slice_maxval - u_slice_minval);

  if ((slice_frac < 0.0) || (slice_frac > 1.0)) // point outside current slice
    v_color_frac = -1.0; //  negative value means don't show

  gl_PointSize = u_pointsize;
}


