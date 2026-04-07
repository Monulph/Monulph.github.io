const e=`
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,t=`
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

vec2 aspectUv(vec2 uv, float zoom) {
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  return p * zoom;
}

vec3 palette(float t, float theme, float hueShift) {
  float hs = hueShift + u_color_shift * 0.35;
  if (theme < 0.5) {
    return 0.55 + 0.45 * cos(TAU * (vec3(0.12, 0.42, 0.72) + t + vec3(hs * 0.8, hs * 1.05, hs * 1.25)));
  }
  if (theme < 1.5) {
    return mix(vec3(0.11, 0.07, 0.03), vec3(0.98, 0.78, 0.46), t);
  }
  if (theme < 2.5) {
    return mix(vec3(0.03, 0.08, 0.13), vec3(0.68, 0.92, 1.0), t);
  }
  if (theme < 3.5) {
    vec3 c = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.12, 0.22) + t + hs * 0.4));
    return c * vec3(1.1, 0.78, 0.5);
  }
  if (theme < 4.5) {
    return mix(vec3(0.06, 0.05, 0.03), vec3(1.0, 0.88, 0.55), t);
  }
  if (theme < 5.5) {
    return mix(vec3(0.06, 0.01, 0.12), vec3(0.88, 0.35, 1.0), t);
  }
  if (theme < 6.5) {
    return mix(vec3(0.03, 0.08, 0.04), vec3(0.42, 1.0, 0.72), t);
  }
  if (theme < 7.5) {
    return mix(vec3(0.08, 0.08, 0.1), vec3(0.96, 0.97, 1.0), t);
  }
  if (theme < 8.5) {
    return mix(vec3(0.0, 0.02, 0.05), vec3(0.75, 0.12, 0.95), t);
  }
  if (theme < 9.5) {
    vec3 c = 0.5 + 0.5 * cos(TAU * (vec3(0.12, 0.18, 0.24) + t + hs * 0.35));
    return c * vec3(1.15, 0.86, 0.72);
  }
  if (theme < 10.5) {
    return mix(vec3(0.02, 0.07, 0.11), vec3(0.5, 0.9, 1.0), t);
  }
  return mix(vec3(0.06, 0.02, 0.06), vec3(1.0, 0.76, 0.9), t);
}

vec3 renderSafeScene(vec2 uv, float mode) {
  vec2 p = aspectUv(uv, 1.08 + u_energy * 0.14);
  float sceneClass = mod(floor(mode), 4.0);
  float time = u_time;
  float beatPulse = u_beat * 0.45 + u_energy * 0.18;
  float hue = 0.02 * floor(mode);
  float v = 0.0;
  float accent = 0.0;

  if (sceneClass < 0.5) {
    p *= rot(time * 0.12 + u_mid * 0.35);
    float rings = 0.5 + 0.5 * sin(length(p) * (14.0 + u_bass * 8.0) - time * 2.0);
    float spokes = 0.5 + 0.5 * cos(atan(p.y, p.x) * (6.0 + floor(mod(mode, 6.0))) + time * 0.8);
    float core = smoothstep(0.95, 0.0, length(p));
    v = rings * 0.42 + spokes * 0.28 + core * (0.35 + beatPulse);
    accent = core;
  } else if (sceneClass < 1.5) {
    p.y += sin(p.x * (4.0 + u_mid * 6.0) + time * 0.8) * (0.18 + u_bass * 0.08);
    float curtain = 0.5 + 0.5 * sin(p.x * 8.0 + p.y * 3.0 - time * (1.2 + u_energy));
    float glow = smoothstep(1.25, -0.3, p.y) * (0.3 + beatPulse);
    float drift = 0.5 + 0.5 * sin((p.x + p.y) * 5.0 + time * 0.6);
    v = curtain * 0.4 + glow * 0.3 + drift * 0.3;
    accent = glow;
  } else if (sceneClass < 2.5) {
    p *= rot(time * 0.18);
    vec2 gp = abs(fract(p * (2.8 + u_treble * 2.0)) - 0.5);
    float grid = smoothstep(0.22, 0.0, min(gp.x, gp.y));
    float wave = 0.5 + 0.5 * sin((p.x + p.y) * 7.0 - time * (1.6 + u_treble * 1.2));
    float halo = smoothstep(1.2, 0.0, length(p));
    v = grid * 0.42 + wave * 0.3 + halo * (0.22 + beatPulse);
    accent = grid;
  } else {
    float bands = 0.5 + 0.5 * sin(p.x * (10.0 + u_treble * 8.0) + time * 1.4);
    float cross = 0.5 + 0.5 * cos(p.y * (12.0 + u_mid * 6.0) - time * 1.1);
    float bloom = smoothstep(1.1, 0.0, length(p));
    float swirl = 0.5 + 0.5 * sin(length(p) * 10.0 - atan(p.y, p.x) * 4.0 - time * 1.6);
    v = bands * 0.3 + cross * 0.3 + swirl * 0.2 + bloom * (0.2 + beatPulse);
    accent = swirl * bloom;
  }

  v = clamp(v, 0.0, 1.0);
  vec3 col = palette(v, u_theme, hue);
  col *= 0.65 + v * 0.75;
  col += accent * (0.06 + u_beat * 0.16);
  return col;
}

void main() {
  float mixValue = clamp(u_scene_mix, 0.0, 1.0);
  vec3 a = renderSafeScene(v_uv, u_prev_mode);
  vec3 b = renderSafeScene(v_uv, u_mode);
  vec3 color = mix(a, b, mixValue);
  float vignette = smoothstep(1.35, 0.25, length((v_uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0)));
  color *= 0.68 + vignette * 0.32;
  gl_FragColor = vec4(color, 1.0);
}
`;export{t as fragmentShaderSource,e as vertexShaderSource};
