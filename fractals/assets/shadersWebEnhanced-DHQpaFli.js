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

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float softGrid(vec2 p, float scale) {
  vec2 g = abs(fract(p * scale) - 0.5);
  return 1.0 - smoothstep(0.12, 0.28, min(g.x, g.y));
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

vec3 renderScene(vec2 uv, float mode, float theme) {
  vec2 p = aspectUv(uv, 1.02 + u_energy * 0.18);
  float sceneClass = mod(floor(mode), 8.0);
  float time = u_time;
  float pulse = u_beat * 0.5 + u_energy * 0.22;
  float hue = 0.017 * floor(mode);
  float v = 0.0;
  float accent = 0.0;

  if (sceneClass < 0.5) {
    p *= rot(time * 0.18 + u_mid * 0.45);
    float rings = 0.5 + 0.5 * sin(length(p) * (16.0 + u_bass * 10.0) - time * 2.4);
    float spokes = 0.5 + 0.5 * cos(atan(p.y, p.x) * (8.0 + mod(mode, 7.0)) + time * 0.9);
    float halo = smoothstep(1.15, 0.0, length(p));
    v = rings * 0.42 + spokes * 0.26 + halo * (0.26 + pulse);
    accent = halo;
  } else if (sceneClass < 1.5) {
    vec2 q = p;
    q.y += sin(q.x * (5.0 + u_mid * 6.0) + time * 0.9) * (0.16 + u_bass * 0.09);
    float curtains = 0.5 + 0.5 * sin(q.x * 9.0 + q.y * 2.5 - time * (1.4 + u_energy));
    float haze = 0.5 + 0.5 * sin((q.x + q.y) * 6.0 + time * 0.5);
    float glow = smoothstep(1.35, -0.3, q.y) * (0.3 + pulse);
    v = curtains * 0.42 + haze * 0.24 + glow * 0.34;
    accent = glow;
  } else if (sceneClass < 2.5) {
    vec2 q = p * rot(time * 0.15);
    float grid = softGrid(q, 3.6 + u_treble * 2.2);
    float wave = 0.5 + 0.5 * sin((q.x + q.y) * 8.0 - time * (1.7 + u_treble));
    float halo = smoothstep(1.2, 0.05, length(q));
    v = grid * 0.4 + wave * 0.28 + halo * (0.22 + pulse);
    accent = grid * halo;
  } else if (sceneClass < 3.5) {
    vec2 q = p * rot(-time * 0.12);
    float petals = abs(sin(atan(q.y, q.x) * (5.0 + floor(mod(mode, 4.0))) + time * 1.1));
    float radius = 0.5 + 0.5 * cos(length(q) * (12.0 + u_bass * 8.0) - time * 2.0);
    float core = smoothstep(0.65, 0.0, length(q));
    v = petals * 0.34 + radius * 0.34 + core * (0.18 + pulse);
    accent = core + petals * 0.2;
  } else if (sceneClass < 4.5) {
    vec2 q = p;
    q *= rot(0.35 * sin(time * 0.25));
    float bands = 0.5 + 0.5 * sin(q.x * (12.0 + u_treble * 7.0) + time * 1.5);
    float cross = 0.5 + 0.5 * cos(q.y * (10.0 + u_mid * 4.0) - time * 1.1);
    float glow = smoothstep(1.0, 0.05, length(q));
    v = bands * 0.34 + cross * 0.24 + glow * (0.26 + pulse);
    accent = glow * bands;
  } else if (sceneClass < 5.5) {
    vec2 q = p * 1.15;
    float tunnel = 0.5 + 0.5 * cos(length(q) * 14.0 - time * 2.1);
    float arcs = 0.5 + 0.5 * sin(atan(q.y, q.x) * 7.0 + time * 0.9 + length(q) * 3.0);
    float vignette = smoothstep(1.3, 0.12, length(q));
    v = tunnel * 0.36 + arcs * 0.28 + vignette * (0.2 + pulse);
    accent = arcs * vignette;
  } else if (sceneClass < 6.5) {
    vec2 cell = floor((p + 1.6) * (2.4 + u_mid * 1.8));
    float id = hash21(cell + floor(mode));
    float points = smoothstep(0.86, 1.0, 0.5 + 0.5 * sin(time * (0.8 + id) + id * 8.0));
    float mask = 1.0 - smoothstep(0.16, 0.34, length(fract((p + 1.6) * (2.4 + u_mid * 1.8)) - 0.5));
    float haze = 0.5 + 0.5 * sin((p.x - p.y) * 5.0 - time * 0.7);
    v = points * mask * 0.46 + haze * 0.26 + mask * 0.16;
    accent = mask;
  } else {
    vec2 q = p * rot(time * 0.08);
    float ray = 0.5 + 0.5 * cos(atan(q.y, q.x) * 10.0 - time * 1.0);
    float ripple = 0.5 + 0.5 * sin(length(q) * (18.0 + u_bass * 8.0) - time * 2.3);
    float grid = softGrid(q * rot(0.4), 2.8 + u_treble * 1.6);
    v = ray * 0.26 + ripple * 0.34 + grid * 0.22 + pulse * 0.15;
    accent = ripple * grid;
  }

  v = clamp(v, 0.0, 1.0);
  vec3 col = palette(v, theme, hue);
  col *= 0.7 + v * 0.82;
  col += accent * (0.05 + u_beat * 0.16);
  return col;
}

void main() {
  float mixValue = clamp(u_scene_mix, 0.0, 1.0);
  vec3 a = renderScene(v_uv, u_prev_mode, u_prev_theme);
  vec3 b = renderScene(v_uv, u_mode, u_theme);
  vec3 color = mix(a, b, mixValue);
  vec2 centered = (v_uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  float vignette = smoothstep(1.45, 0.18, length(centered));
  color *= 0.62 + vignette * 0.38;
  color += 0.02 * vec3(0.7, 0.85, 1.0) * (0.5 + 0.5 * sin(u_time * 0.35 + centered.x * 4.0));
  gl_FragColor = vec4(color, 1.0);
}
`;export{t as fragmentShaderSource,e as vertexShaderSource};
