const e=`
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,o=`
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

#define PI 3.141592653589793
#define TAU 6.283185307179586

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec3 palette(float t, float theme) {
  if (theme < 0.5) return mix(vec3(0.04, 0.05, 0.08), vec3(0.65, 0.82, 1.0), t);
  if (theme < 1.5) return mix(vec3(0.08, 0.04, 0.02), vec3(1.0, 0.75, 0.42), t);
  if (theme < 2.5) return mix(vec3(0.03, 0.07, 0.10), vec3(0.55, 1.0, 0.85), t);
  if (theme < 3.5) return mix(vec3(0.08, 0.02, 0.08), vec3(1.0, 0.55, 0.9), t);
  return 0.5 + 0.5 * cos(TAU * (vec3(0.1, 0.25, 0.5) + t + theme * 0.07));
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float modeBand = floor(mod(u_mode, 6.0));
  float t = u_time * (0.32 + u_energy * 0.2);
  vec2 q = p;

  if (modeBand < 1.0) {
    q *= rot(t * 0.7);
  } else if (modeBand < 2.0) {
    q = vec2(length(p) - 0.28, atan(p.y, p.x) / PI);
  } else if (modeBand < 3.0) {
    q = abs(p);
  } else if (modeBand < 4.0) {
    q *= rot(-t * 0.45);
    q.y += sin(q.x * 8.0 + t * 2.5) * 0.08;
  } else if (modeBand < 5.0) {
    q = vec2(atan(p.y, p.x) / PI, length(p));
  } else {
    q *= 1.0 + 0.2 * sin(t);
  }

  float waves = 0.5 + 0.5 * sin(q.x * (10.0 + u_bass * 10.0) + q.y * (8.0 + u_treble * 12.0) - t * 3.0);
  float rings = 0.5 + 0.5 * cos(length(p) * (22.0 + u_mid * 10.0) - t * 4.0);
  float beam = smoothstep(0.24, 0.0, abs(p.y + 0.18 * sin(p.x * 5.0 + t * 2.0)));
  float core = smoothstep(0.58 + u_scene_mix * 0.12, 0.0, length(p));
  float pulse = u_beat * 0.45 + u_energy * 0.25;

  float v = clamp(waves * 0.45 + rings * 0.3 + beam * 0.35 + core * 0.4 + pulse, 0.0, 1.0);
  vec3 color = palette(v, u_theme);
  color *= 0.55 + v * 0.95;
  color += beam * vec3(0.15, 0.18, 0.22);

  gl_FragColor = vec4(color, 1.0);
}
`;export{o as fragmentShaderSource,e as vertexShaderSource};
