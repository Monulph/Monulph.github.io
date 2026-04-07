const o=`
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,e=`
precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_scene_mix;
uniform float u_prev_mode;
uniform float u_mode;
uniform float u_prev_theme;
uniform float u_theme;
uniform float u_color_shift;

#define TAU 6.283185307179586

vec3 palette(float t) {
  return 0.48 + 0.42 * cos(TAU * (vec3(0.02, 0.17, 0.31) + t + vec3(0.0, 0.1, 0.2) + u_color_shift * 0.15));
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float radius = length(p);
  float angle = atan(p.y, p.x);
  float swirl = sin(angle * (4.0 + floor(mod(u_mode, 5.0))) - u_time * (0.65 + u_energy * 0.6));
  float rings = sin(radius * (18.0 + u_bass * 16.0 + mod(u_prev_mode, 4.0) * 2.0) - u_time * (2.0 + u_mid * 1.2));
  float pulse = exp(-radius * (4.2 - u_beat * 1.4));
  float haze = 0.5 + 0.5 * sin((p.x + p.y) * (7.0 + u_treble * 8.0) + u_time * 1.1);
  float v = clamp(0.24 + rings * 0.24 + swirl * 0.18 + pulse * (0.55 + u_beat * 0.35) + haze * 0.18, 0.0, 1.0);

  vec3 color = palette(v + u_theme * 0.03) * (0.65 + v * 0.9);
  color += pulse * vec3(0.08, 0.09, 0.12);
  gl_FragColor = vec4(color, 1.0);
}
`;export{e as fragmentShaderSource,o as vertexShaderSource};
