precision highp float;


attribute vec3 a_pos;
attribute vec4 a_color;
attribute float a_posz;

uniform vec3 u_projection_center;
uniform vec3 u_projection_x;
uniform vec3 u_projection_y;
uniform vec3 u_projection_z;
uniform vec3 u_view_dir;
uniform float u_aspect_corr_x;
uniform float u_aspect_corr_y;

varying vec4 v_color;



void main() {
  
  vec3 posit = a_pos - u_projection_center;


  gl_Position = vec4(
    dot(posit, u_projection_x) * u_aspect_corr_x, 
    dot(posit, u_projection_y) * u_aspect_corr_y, 
    -0.25 * dot(posit, u_projection_z),
    1.0
  );

  v_color = a_color;
}


