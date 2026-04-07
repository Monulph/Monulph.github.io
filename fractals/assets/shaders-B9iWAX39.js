const a=`
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,l=`
precision highp float;

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

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(7.13, 3.71);
    a *= 0.5;
  }
  return v;
}

float ridge(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    float n = noise(p);
    v += abs(n * 2.0 - 1.0) * a;
    p = p * 2.07 + vec2(2.7, -4.2);
    a *= 0.55;
  }
  return v;
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float angularCount(float count) {
  return max(1.0, floor(count + 0.5));
}

vec2 angleDir(float angle) {
  return vec2(cos(angle), sin(angle));
}

vec2 polarNoiseUv(float angle, float radius, float angularScale, float radialScale) {
  float invRadius = 1.0 / max(radius + 0.18, 0.02);
  vec2 dir = angleDir(angle);
  return dir * angularScale + vec2(invRadius * radialScale, invRadius * radialScale * 0.37);
}

vec2 aspectUv(vec2 uv, float zoom) {
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  return p * zoom;
}

vec3 palette(float t, float theme, float hueShift) {
  vec3 c;
  float hs = hueShift + u_color_shift;
  if (theme < 0.5) {
    c = 0.55 + 0.45 * cos(TAU * (vec3(0.12, 0.42, 0.72) + t + vec3(hs * 0.8, hs * 1.1, hs * 1.4)));
    c = pow(c, vec3(1.35));
  } else if (theme < 1.5) {
    c = mix(vec3(0.13, 0.08, 0.04), vec3(0.98, 0.78, 0.48), pow(t, 0.75));
  } else if (theme < 2.5) {
    c = mix(vec3(0.04, 0.08, 0.14), vec3(0.72, 0.92, 1.0), pow(t, 0.9));
  } else if (theme < 3.5) {
    c = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.12, 0.22) + t + vec3(0.02, 0.07, 0.12) + hs * 0.4));
    c *= vec3(1.1, 0.75, 0.48);
  } else if (theme < 4.5) {
    c = mix(vec3(0.06, 0.05, 0.03), vec3(1.0, 0.88, 0.55), pow(t, 0.6));
  } else if (theme < 5.5) {
    c = mix(vec3(0.06, 0.0, 0.12), vec3(0.88, 0.35, 1.0), pow(t, 0.82));
  } else if (theme < 6.5) {
    c = mix(vec3(0.03, 0.08, 0.04), vec3(0.42, 1.0, 0.72), pow(t, 0.72));
  } else if (theme < 7.5) {
    c = mix(vec3(0.08, 0.08, 0.1), vec3(0.95, 0.96, 1.0), pow(t, 0.92));
  } else if (theme < 8.5) {
    c = mix(vec3(0.0, 0.02, 0.04), vec3(0.75, 0.12, 0.95), pow(t, 0.82));
  } else if (theme < 9.5) {
    c = 0.5 + 0.5 * cos(TAU * (vec3(0.12, 0.18, 0.24) + t + vec3(0.18, 0.04, -0.05) + hs * 0.35));
    c *= vec3(1.2, 0.85, 0.7);
  } else if (theme < 10.5) {
    c = mix(vec3(0.02, 0.07, 0.11), vec3(0.5, 0.9, 1.0), pow(t, 0.7));
  } else {
    c = mix(vec3(0.06, 0.02, 0.06), vec3(1.0, 0.76, 0.9), pow(t, 0.85));
  }
  return c;
}

vec3 finishColor(float v, float hue, float lift, float sparkle) {
  vec3 col = palette(clamp(v, 0.0, 1.0), u_theme, hue) * (0.78 + clamp(v, 0.0, 1.0) * lift);
  col += sparkle;
  return col;
}

vec3 sceneJuliaField(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.02 + local * 0.08 + variant * 0.05 - u_bass * 0.18);
  p *= rot(u_time * (0.03 + local * 0.01 + variant * 0.008) + u_mid * 0.25);
  vec2 c = vec2(
    -0.78 + 0.2 * cos(u_time * (0.11 + local * 0.01) + variant * 0.21 + family * 0.17),
     0.18 * sin(u_time * (0.09 + variant * 0.008) + family * 0.12 + u_treble * 1.4)
  );
  vec2 z = p;
  float trap = 10.0;
  float glow = 0.0;
  for (int i = 0; i < 64; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    z += 0.01 * sin(vec2(z.y, z.x) * (5.0 + local + variant * 0.6) + u_time);
    glow += exp(-(4.8 + local * 0.7) * dot(z, z));
    trap = min(trap, abs(z.x * z.y));
  }
  float filament = pow(clamp(1.0 - trap * (8.0 + local * 2.0 + variant * 0.8), 0.0, 1.0), 1.8 + local * 0.2);
  float v = clamp(glow * 0.15 + filament * (0.68 + u_beat * 0.7), 0.0, 1.0);
  return finishColor(v, u_time * 0.012 + family * 0.017 + variant * 0.03, 1.4 + local * 0.1, filament * 0.05);
}

vec3 sceneNebulaCloud(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.35 + local * 0.14 + variant * 0.06);
  p *= rot(u_time * (0.01 + local * 0.004));
  vec2 q = p;
  q += vec2(fbm(q * (1.7 + local * 0.2) + u_time * 0.08), fbm(q * (2.0 + variant * 0.2) - u_time * 0.06));
  float smoke = fbm(q * (2.2 + local * 0.4) + vec2(u_time * 0.05, -u_time * 0.04));
  float smoke2 = ridge(q * (4.3 + variant * 0.4) - vec2(u_time * 0.09, 0.0));
  float stars = pow(max(noise(p * (44.0 + local * 9.0 + variant * 4.0) + u_time * 0.35) - (0.94 - local * 0.01), 0.0) * 14.0, 4.0);
  float veil = smoothstep(1.55 + local * 0.08, 0.0, length(p)) * (0.28 + u_beat * 0.4);
  float v = clamp(smoke * 0.68 + smoke2 * 0.42 + veil + stars, 0.0, 1.0);
  return finishColor(v, 0.04 + family * 0.014, 1.35 + local * 0.1, stars * (0.6 + u_treble));
}

vec3 sceneKaleidoWarp(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  p *= 1.0 + local * 0.08 + variant * 0.04;
  float r = length(p);
  float a = atan(p.y, p.x);
  float seg = angularCount(5.0 + local + variant + floor(u_mid * 8.0 + u_beat * 4.0));
  a = abs(mod(a * seg / PI + u_time * (0.1 + local * 0.02), 2.0) - 1.0);
  float rings = sin(r * (18.0 + local * 5.0 + variant * 2.0 + u_bass * 14.0) - u_time * (2.6 + local * 0.3));
  float ribbon = sin(a * PI * (6.0 + local * 2.0 + variant * 0.7 + u_treble * 10.0) + u_time * (1.1 + variant * 0.08));
  float bloom = pow(clamp(1.0 - r * (0.62 - local * 0.04), 0.0, 1.0), 2.0 + local * 0.3) * (0.35 + u_beat * 0.8);
  float v = clamp(0.5 + rings * 0.22 + ribbon * 0.24 + bloom, 0.0, 1.0);
  return finishColor(v, 0.11 + family * 0.018, 1.5 + local * 0.08, bloom * 0.08);
}

vec3 scenePlasmaTide(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.7 + local * 0.12 + variant * 0.08);
  float w1 = sin(p.x * (6.0 + local * 1.4 + u_mid * 10.0) + u_time * (1.0 + local * 0.12));
  float w2 = sin(p.y * (7.0 + variant * 1.1 + u_treble * 14.0) - u_time * (0.9 + variant * 0.1));
  float w3 = sin((p.x + p.y + length(p) * (2.2 + local * 0.35)) * (4.0 + local + u_bass * 6.0) + u_time * (0.5 + local * 0.07));
  float f = fbm(p * (2.0 + local * 0.4) + vec2(u_time * 0.04, -u_time * 0.05));
  float v = clamp(0.5 + w1 * 0.16 + w2 * 0.16 + w3 * 0.14 + (f - 0.5) * 0.68 + u_beat * 0.14, 0.0, 1.0);
  return finishColor(v, 0.18 + family * 0.014, 1.25 + local * 0.1, 0.0);
}

vec3 sceneOrbitalLattice(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.08 + local * 0.08 + variant * 0.05 - u_bass * 0.1);
  p *= rot(u_time * (0.05 + local * 0.012));
  float acc = 0.0;
  float lace = 0.0;
  vec2 q = p;
  for (int i = 0; i < 6; i++) {
    q = abs(q) / clamp(dot(q, q), 0.18, 4.0) - vec2(0.64 + local * 0.05, 0.58 + variant * 0.04);
    q *= rot(0.5 + local * 0.08 + u_mid * 0.14);
    float d = length(q);
    acc += exp(-(7.0 + local * 0.8) * d);
    lace += exp(-(22.0 + variant * 2.2) * abs(q.x * q.y));
  }
  float v = clamp(acc * 0.68 + lace * (0.3 + u_beat * 0.65), 0.0, 1.0);
  return finishColor(v, 0.24 + family * 0.013, 1.45 + local * 0.12, lace * 0.05);
}

vec3 sceneCrystalEngine(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.25 + local * 0.1 + variant * 0.05);
  p *= rot(u_time * (0.035 + local * 0.008));
  float r = length(p);
  float a = atan(p.y, p.x);
  float facets = abs(sin(a * angularCount(6.0 + local * 2.0 + variant) + r * (10.0 + local * 3.0) - u_time * (0.6 + local * 0.08)));
  float frost = ridge(p * (3.2 + local * 0.6) + vec2(u_time * 0.02, -u_time * 0.02));
  float core = pow(clamp(1.0 - r * (0.78 - local * 0.05), 0.0, 1.0), 2.0 + local * 0.3);
  float v = clamp(facets * 0.42 + frost * 0.44 + core * (0.35 + u_beat * 0.4), 0.0, 1.0);
  return finishColor(v, 0.3 + family * 0.016, 1.35 + local * 0.1, facets * 0.04);
}

vec3 sceneMandalaRift(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  float petals = abs(sin(a * angularCount(4.0 + local * 2.0 + variant * 0.5) + u_time * (0.3 + local * 0.06)));
  float ripples = sin(r * (18.0 + local * 5.0 + u_bass * 10.0) - u_time * (2.2 + local * 0.25));
  float fracture = fbm(vec2(petals * (3.0 + local), r * (4.0 + variant * 1.5)) + vec2(u_time * 0.04, 0.0));
  float voidGlow = pow(clamp(1.0 - abs(r - (0.2 + local * 0.05)), 0.0, 1.0), 6.0) * (0.7 + u_beat * 0.6);
  float v = clamp(petals * 0.34 + ripples * 0.18 + fracture * 0.42 + voidGlow, 0.0, 1.0);
  return finishColor(v, 0.36 + family * 0.014, 1.4 + local * 0.1, voidGlow * 0.08);
}

vec3 sceneAuroraCurtain(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.15 + local * 0.08 + variant * 0.04);
  p.y += sin(p.x * (2.3 + local * 0.5) + u_time * (0.4 + local * 0.04)) * (0.18 + u_bass * 0.08);
  float flowNoise = fbm(p * (2.0 + variant * 0.25) + vec2(0.0, u_time * 0.05));
  float curtain = sin(p.x * (4.0 + local) + flowNoise * 4.0 - u_time * (0.58 + local * 0.05));
  float vertical = smoothstep(0.95 + local * 0.06, -0.75, p.y);
  float shimmer = pow(max(noise(p * (24.0 + local * 5.0 + variant * 3.0) + u_time * 0.2) - 0.78, 0.0) * 2.2, 2.0) * (1.0 + u_treble * 1.2);

  if (family > 27.5 && family < 29.5) {
    vec2 q = p;
    q.y += fbm(q * 2.0 + vec2(u_time * 0.03, -u_time * 0.02)) * 0.24;
    float curtains = sin(q.x * (3.2 + local * 0.35) + q.y * 0.9 - u_time * (0.44 + local * 0.03));
    float wisps = ridge(q * (2.6 + local * 0.22) + vec2(u_time * 0.02, -u_time * 0.015));
    float haze = fbm(q * 1.6 - vec2(0.0, u_time * 0.03));
    float motes = pow(max(noise(q * 20.0 + u_time * 0.1) - 0.9, 0.0) * 4.0, 2.0);
    float lanes = smoothstep(0.92, -0.7, q.y) * 0.18;
    float v = clamp(0.18 + curtains * 0.18 + wisps * 0.26 + haze * 0.24 + lanes + motes * 0.03 + u_beat * 0.05, 0.0, 0.84);
    v = pow(v, 1.12);
    return finishColor(v, 0.42 + family * 0.01, 1.02, motes * 0.008 + wisps * 0.01);
  }

  if (family > 29.5 && family < 30.5) {
    vec2 q = p * 1.12;
    float bands = sin(q.x * 5.4 + q.y * 1.3 - u_time * 0.62 + fbm(q * 1.8) * 3.2);
    float counter = sin(q.x * -3.1 + q.y * 2.4 + u_time * 0.38);
    float tide = ridge(q * 2.2 + vec2(u_time * 0.025, -u_time * 0.035));
    float filaments = exp(-(18.0 + variant * 1.2) * abs(bands * 0.5 + counter * 0.35));
    float undertow = fbm(vec2(q.x * 1.4 - u_time * 0.04, q.y * 2.0 + u_time * 0.03));
    float v = clamp(0.12 + filaments * 0.42 + tide * 0.22 + undertow * 0.2 + vertical * 0.08 + u_beat * 0.06, 0.0, 0.88);
    v = pow(v, 1.06);
    return finishColor(v, 0.42 + family * 0.01, 1.1, filaments * 0.012);
  }

  float v = clamp(0.36 + curtain * 0.18 + vertical * 0.24 + shimmer * 0.18 + u_beat * 0.1, 0.0, 0.9);
  return finishColor(v, 0.42 + family * 0.01, 1.15 + local * 0.06, shimmer * 0.03);
}

vec3 sceneForgeStars(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.45 + local * 0.12 + variant * 0.06);
  p *= rot(u_time * (0.025 + local * 0.006));
  float forge = ridge(p * (3.0 + local * 0.5) + vec2(u_time * 0.08, -u_time * 0.04));
  float spark = pow(max(noise(p * (62.0 + local * 12.0 + variant * 6.0) - u_time * 0.6) - (0.94 - local * 0.01), 0.0) * 26.0, 3.0);
  float ring = abs(sin(length(p) * (15.0 + local * 4.0 + variant) - u_time * (2.1 + local * 0.16)));
  float v = clamp(forge * 0.62 + spark * (0.32 + u_treble * 0.4) + ring * 0.24 + u_beat * 0.14, 0.0, 1.0);
  vec3 col = finishColor(v, 0.48 + family * 0.012, 1.36 + local * 0.08, 0.0);
  col += vec3(spark * 0.8, spark * 0.55, spark * 0.2);
  return col;
}

vec3 sceneGridHymn(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.22 + local * 0.1 + variant * 0.04);
  p *= rot(u_time * (0.02 + local * 0.008));
  vec2 gp = abs(fract(p * (2.6 + local * 0.45 + variant * 0.12)) - 0.5);
  float lines = exp(-16.0 * min(gp.x, gp.y) * (1.0 + local * 0.12));
  float waves = sin((p.x + p.y) * (6.0 + local * 1.6) + u_time * (1.0 + variant * 0.1));
  float pulses = sin(length(p) * (10.0 + local * 2.4) - u_time * (1.7 + local * 0.1));
  float v = clamp(lines * 0.48 + waves * 0.18 + pulses * 0.2 + fbm(p * (2.0 + local * 0.35)) * 0.25 + u_beat * 0.1, 0.0, 1.0);
  return finishColor(v, 0.55 + family * 0.012, 1.24 + local * 0.07, lines * 0.04);
}

vec3 sceneGardenVortex(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  float swirl = sin(a * angularCount(5.0 + local * 1.6) + r * (14.0 + local * 3.2 + variant) - u_time * (1.3 + local * 0.12));
  float petals = abs(sin(a * angularCount(3.0 + local + variant * 0.4) - u_time * (0.28 + local * 0.04)));
  float moss = fbm(vec2(cos(a), sin(a)) * (3.5 + local * 0.5) + p * (2.0 + variant * 0.2) + vec2(u_time * 0.04, -u_time * 0.03));
  float heart = pow(clamp(1.0 - r * (0.8 - local * 0.04), 0.0, 1.0), 1.8 + local * 0.2);
  float v = clamp(swirl * 0.22 + petals * 0.28 + moss * 0.38 + heart * (0.18 + u_beat * 0.25), 0.0, 1.0);
  return finishColor(v, 0.61 + family * 0.01, 1.32 + local * 0.1, heart * 0.03);
}

vec3 sceneBurnShip(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.0 + local * 0.08 + variant * 0.04 - u_bass * 0.12);
  p *= rot(u_time * (0.015 + local * 0.004));
  vec2 c = vec2(-0.42 + 0.18 * cos(u_time * (0.09 + local * 0.01) + family), -0.58 + 0.18 * sin(u_time * (0.07 + variant * 0.01)));
  vec2 z = p;
  float trap = 10.0;
  float glow = 0.0;
  for (int i = 0; i < 58; i++) {
    z = abs(z);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    glow += exp(-(5.5 + local * 0.6) * dot(z, z));
    trap = min(trap, abs(z.x + z.y));
  }
  float ember = pow(clamp(1.0 - trap * (2.2 + local * 0.4 + variant * 0.2), 0.0, 1.0), 2.0);
  float v = clamp(glow * 0.18 + ember * (0.62 + u_beat * 0.45), 0.0, 1.0);
  return finishColor(v, 0.68 + family * 0.011, 1.45 + local * 0.08, ember * 0.06);
}

vec3 scenePolarBloom(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  vec2 q = polarNoiseUv(a, r, 3.0 + local * 0.8, 0.5 + variant * 0.08);
  if (family > 45.5 && family < 46.5) {
    vec2 reefUv = p * (1.05 + variant * 0.03);
    float branches = ridge(reefUv * 2.4 + vec2(u_time * 0.02, -u_time * 0.015));
    float coral = fbm(reefUv * 3.8 + vec2(-u_time * 0.015, u_time * 0.03));
    float fans = exp(-(14.0 + variant * 0.9) * abs(abs(reefUv.x) - (1.36 - 0.22 * coral)));
    float lattice = exp(-(22.0 + variant * 0.9) * abs(coral - (0.42 + 0.08 * sin(reefUv.y * 2.6 + u_time * 0.2))));
    float spores = pow(max(noise(reefUv * 18.0 + u_time * 0.08) - 0.91, 0.0) * 5.0, 2.0);
    float v = clamp(branches * 0.24 + coral * 0.28 + fans * 0.14 + lattice * 0.18 + spores * 0.03 + u_beat * 0.04, 0.0, 0.86);
    return finishColor(pow(v, 1.08), 0.74 + family * 0.01, 1.04, spores * 0.012 + lattice * 0.008);
  }
  float n = fbm(q + vec2(u_time * 0.08, -u_time * 0.04));
  float rosette = abs(sin(a * angularCount(6.0 + local * 2.0 + variant * 0.4) + u_time * (0.4 + local * 0.05)));
  float rings = sin(r * (22.0 + local * 4.0) - u_time * (2.0 + variant * 0.14));
  float core = pow(clamp(1.0 - r * (0.72 - local * 0.03), 0.0, 1.0), 2.2 + local * 0.25);
  float v = clamp(n * 0.4 + rosette * 0.28 + rings * 0.16 + core * (0.22 + u_beat * 0.28), 0.0, 1.0);
  return finishColor(v, 0.74 + family * 0.01, 1.34 + local * 0.1, core * 0.05);
}

vec3 sceneTempleNoise(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.25 + local * 0.1);
  if (family > 27.5 && family < 28.5) {
    float bands = sin(p.x * (3.4 + variant * 0.2) + fbm(p * 2.2 + vec2(0.0, u_time * 0.05)) * 3.5 - u_time * 0.5);
    float wisps = ridge(p * 3.0 + vec2(u_time * 0.04, -u_time * 0.03));
    float motes = pow(max(noise(p * 24.0 + u_time * 0.14) - 0.9, 0.0) * 5.5, 2.0);
    float v = clamp(0.26 + bands * 0.22 + wisps * 0.34 + motes * 0.08 + u_beat * 0.06, 0.0, 0.92);
    return finishColor(pow(v, 1.1), 0.81 + family * 0.008, 1.14, motes * 0.025);
  }
  vec2 cell = floor(p * (3.2 + local * 0.4 + variant * 0.12));
  vec2 fracp = fract(p * (3.2 + local * 0.4 + variant * 0.12)) - 0.5;
  float blocks = exp(-12.0 * min(abs(fracp.x), abs(fracp.y)));
  float rune = noise(cell + floor(u_time * (0.5 + local * 0.08)));
  float wave = sin((p.x * p.y) * (10.0 + local * 2.0) + u_time * (1.1 + variant * 0.1));
  float dust = pow(max(noise(p * (30.0 + local * 5.0)) - 0.86, 0.0) * 6.0, 2.0);
  float v = clamp(blocks * 0.42 + rune * 0.28 + wave * 0.14 + dust * 0.2 + u_beat * 0.08, 0.0, 1.0);
  return finishColor(v, 0.81 + family * 0.008, 1.22 + local * 0.08, dust * 0.08);
}

vec3 sceneAttractorField(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.45 + local * 0.1 + variant * 0.05);
  vec2 z = p;
  float acc = 0.0;
  float line = 0.0;
  float a = 1.2 + local * 0.25 + u_bass * 0.3;
  float b = 1.9 + variant * 0.08 + u_mid * 0.4;
  float c = 0.8 + local * 0.16;
  for (int i = 0; i < 22; i++) {
    z = vec2(sin(a * z.y) - cos(b * z.x), sin(c * z.x) - cos(a * z.y));
    float d = length(z - p * 0.35);
    acc += exp(-(6.0 + local * 0.6) * d);
    line += exp(-(20.0 + variant * 1.5) * abs(z.x * 0.6 + z.y));
  }
  float v = clamp(acc * 0.08 + line * 0.18 + u_beat * 0.08, 0.0, 1.0);
  return finishColor(v, 0.87 + family * 0.01, 1.55 + local * 0.08, line * 0.05);
}

vec3 sceneMandelbarGlow(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 0.95 + local * 0.06 + variant * 0.03 - u_bass * 0.12);
  vec2 c = vec2(-0.24 + 0.24 * cos(u_time * 0.08 + family * 0.1), 0.0 + 0.28 * sin(u_time * 0.06 + variant));
  vec2 z = p;
  float glow = 0.0;
  float trap = 10.0;
  for (int i = 0; i < 54; i++) {
    z.y = -z.y;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    glow += exp(-(4.6 + local * 0.5) * dot(z, z));
    trap = min(trap, abs(z.x - z.y));
  }
  float braid = pow(clamp(1.0 - trap * (2.6 + local * 0.4), 0.0, 1.0), 2.0 + variant * 0.1);
  float v = clamp(glow * 0.18 + braid * (0.55 + u_beat * 0.5), 0.0, 1.0);
  return finishColor(v, 0.92 + family * 0.008, 1.48 + local * 0.1, braid * 0.04);
}

vec3 sceneDomainFlare(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 1.18 + local * 0.08 + variant * 0.04);
  p *= rot(u_time * (0.03 + local * 0.005));
  vec2 q = vec2(
    sin(p.x * (4.0 + local) + u_time * (0.6 + variant * 0.05)) + cos(p.y * (3.0 + variant * 0.4)),
    sin(p.y * (5.0 + local * 0.8) - u_time * (0.5 + local * 0.04)) + cos(p.x * (2.0 + variant * 0.3))
  );
  float angle = atan(q.y, q.x);
  float angleBand = 0.5 + 0.5 * cos(angle);
  float mag = length(q);
  float bands = sin(mag * (12.0 + local * 3.0 + variant) - u_time * (1.8 + local * 0.15));
  float flare = pow(clamp(1.0 / (0.25 + mag * (2.0 + local * 0.4)) - 0.1, 0.0, 1.0), 1.6);
  float v = clamp(0.38 + angleBand * 0.24 + bands * 0.18 + flare * (0.22 + u_beat * 0.25), 0.0, 1.0);
  return finishColor(v, angleBand * 0.22 + family * 0.012, 1.3 + local * 0.08, flare * 0.06);
}

vec3 sceneCathedralSdf(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  p *= 1.0 + local * 0.08;
  p *= rot(u_time * (0.02 + local * 0.004));
  vec2 gp = abs(p);
  float arch = length(max(gp - vec2(0.2 + local * 0.03, 0.55 + variant * 0.03), 0.0));
  float column = length(max(gp - vec2(0.05 + variant * 0.01, 0.8), 0.0));
  float rose = abs(length(p) - (0.24 + local * 0.03));
  float stained = fbm(p * (4.0 + local * 0.6) + vec2(u_time * 0.03, -u_time * 0.02));
  float edges = exp(-(16.0 + local * 2.0) * min(min(arch, column), rose));
  float v = clamp(edges * 0.62 + stained * 0.34 + u_beat * 0.08, 0.0, 1.0);
  return finishColor(v, 0.14 + family * 0.015, 1.28 + local * 0.08, edges * 0.08);
}



vec3 sceneArcLantern(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 0.92 + variant * 0.018);
  p *= rot(0.18 + 0.08 * sin(u_time * 0.08 + variant * 0.25));

  float radius = length(p);
  float angle = atan(p.y, p.x);
  float arch = abs(abs(p.x) - (0.58 + 0.08 * sin(p.y * 1.4 + u_time * 0.18)));
  float lantern = exp(-(18.0 + variant) * abs(radius - (0.72 + 0.05 * sin(angle * 3.0 + u_time * 0.12))));
  float filaments = 0.0;
  vec2 z = p * 0.9 + vec2(-0.78, 0.08);
  for (int i = 0; i < 40; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + vec2(-0.742, 0.118 + 0.03 * sin(u_time * 0.04 + variant * 0.12));
    float m2 = dot(z, z);
    filaments += exp(-(14.0 + local * 1.6) * abs(length(z) - (0.42 + 0.05 * sin(float(i) * 0.3))));
    if (m2 > 64.0) break;
  }
  filaments /= 40.0;

  float glow = exp(-(9.0 + local * 0.8) * arch) + lantern * 0.5;
  float haze = fbm(p * 2.4 + vec2(u_time * 0.02, -u_time * 0.015));
  float dust = pow(max(noise(p * 26.0 + u_time * 0.06) - 0.92, 0.0) * 5.0, 2.0);

  if (local < 0.5) {
    float dome = exp(-(18.0 + variant * 0.8) * abs(radius - (0.64 + 0.03 * sin(angle * 6.0 + u_time * 0.16))));
    float ribs = pow(max(0.0, cos(angle * angularCount(6.0 + variant * 0.18) - u_time * 0.14)), 6.0) * smoothstep(1.15, 0.02, radius);
    float window = exp(-(34.0 + variant * 1.2) * abs(abs(p.x) - (0.28 + 0.02 * sin(u_time * 0.24 + p.y * 2.4)))) * smoothstep(0.9, -0.2, abs(p.y - 0.02));
    float veil = ridge(angleDir(angle) * 1.4 + vec2(radius * 5.5 + u_time * 0.05, -u_time * 0.04));
    float v = clamp(glow * 0.22 + dome * 0.34 + ribs * 0.26 + window * 0.24 + filaments * 0.28 + haze * 0.10 + veil * 0.12 + dust * 0.04 + u_beat * 0.03, 0.0, 0.82);
    v = smoothstep(0.08, 0.74, v);
    vec3 col = finishColor(v, 0.11 + family * 0.01, 1.02, dust * 0.008 + filaments * 0.018 + window * 0.01);
    col *= 0.74 + 0.16 * dome + 0.10 * ribs;
    return col;
  }

  float v = clamp(glow * 0.26 + filaments * 0.24 + haze * 0.12 + dust * 0.04 + u_beat * 0.03, 0.0, 0.84);
  v = smoothstep(0.06, 0.76, v);
  vec3 col = finishColor(v, 0.11 + family * 0.01, 1.02, dust * 0.01 + filaments * 0.02);
  col *= 0.8 + 0.12 * lantern + 0.08 * exp(-(20.0 + variant) * abs(radius - 0.72));
  return col;
}

vec3 sceneSignalCathedral(vec2 uv, float variant, float family) {
  float local = mod(family, 5.0);
  vec2 p = aspectUv(uv, 0.9 + variant * 0.025);
  float zoom = 1.05 + 0.18 * sin(u_time * 0.08 + variant * 0.3 + family * 0.2);
  p *= zoom;
  p *= rot(0.08 * sin(u_time * 0.09 + family * 0.17));

  float angle = atan(p.y, p.x);
  float radius = length(p);
  vec2 q = polarNoiseUv(angle, radius, 2.0 + variant * 0.12, 0.42 + local * 0.06);

  float arches = pow(max(0.0, cos(angle * (4.0 + local) + u_time * 0.18)), 3.0);
  float nave = smoothstep(0.82, 0.18, abs(p.x)) * smoothstep(1.3, 0.12, abs(p.y + 0.05));
  float ribs = 1.0 - smoothstep(0.0, 0.018 + variant * 0.0015, abs(fract(q.x * (3.0 + local * 0.7)) - 0.5));
  float glass = fbm(q + vec2(u_time * 0.03, -u_time * 0.02));
  float dust = fbm(p * 6.0 + vec2(0.0, u_time * 0.08));

  float structure = arches * 0.34 + nave * 0.42 + ribs * 0.18 + glass * 0.16;
  float v = clamp(structure * (0.72 + u_energy * 0.18) + dust * 0.05, 0.0, 0.68);
  vec3 col = finishColor(v, 0.135 + family * 0.012, 0.92 + local * 0.04, dust * 0.012);
  col *= 0.78 + 0.08 * arches + 0.06 * nave;
  return col;
}

vec3 scenePass1Mandelbrot(vec2 uv, float variant, float family) {
  float local = family - 62.0;
  float t = u_time;
  vec2 p = aspectUv(uv, 1.0);

  vec2 center;
  float zoomBase;
  if (local < 0.5) {
    center = vec2(-0.55, 0.0);
    zoomBase = 0.92 + variant * 0.012;
  } else if (local < 1.5) {
    center = vec2(-0.748, 0.108);
    zoomBase = 0.33 + variant * 0.008;
  } else if (local < 2.5) {
    center = vec2(0.282, 0.011);
    zoomBase = 0.55 + variant * 0.01;
  } else {
    center = vec2(-1.255, 0.032);
    zoomBase = 0.22 + variant * 0.006;
  }

  float zoomBreath = 1.0 - u_bass * 0.06 - u_beat * 0.025 + 0.035 * sin(t * (0.06 + local * 0.008) + variant * 0.3);
  p *= zoomBase * zoomBreath;
  p *= rot(0.06 * sin(t * (0.04 + local * 0.005) + variant * 0.2));
  p += center;
  p += vec2(0.012 * sin(t * (0.07 + local * 0.01) + variant), 0.01 * cos(t * (0.05 + local * 0.008) + variant * 0.6));

  vec2 c = p;
  vec2 z = vec2(0.0);
  float trapLine = 10.0;
  float trapCircle = 10.0;
  float trapPoint = 10.0;
  float orbitGlow = 0.0;
  float edgeFog = 0.0;
  float nu = 0.0;
  float escaped = 0.0;
  for (int i = 0; i < 110; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    float m2 = dot(z, z);
    float r = sqrt(m2);
    trapLine = min(trapLine, abs(z.x * 0.65 + z.y * 0.35));
    trapCircle = min(trapCircle, abs(r - (0.36 + 0.05 * sin(float(i) * 0.33 + local))));
    trapPoint = min(trapPoint, length(z - vec2(-0.18, 0.04)));
    orbitGlow += exp(-(13.0 + local * 1.4) * abs(r - (0.48 + 0.04 * sin(float(i) * 0.24 + variant))));
    edgeFog += exp(-(6.0 + local * 0.8) * m2);
    if (m2 > 256.0) {
      float log_zn = 0.5 * log(m2);
      nu = float(i) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
      escaped = 1.0;
      break;
    }
  }

  float smoothEscape = escaped > 0.5 ? clamp(nu / 110.0, 0.0, 1.0) : 0.0;
  float shell = smoothstep(0.02, 0.92, smoothEscape) * (1.0 - smoothstep(0.72, 1.0, smoothEscape));
  float lineArt = pow(clamp(1.0 - trapLine * (12.0 + local * 1.4), 0.0, 1.0), 1.7 + local * 0.15);
  float haloArt = pow(clamp(1.0 - trapCircle * (9.0 + variant * 0.2), 0.0, 1.0), 1.5 + local * 0.18);
  float pointArt = pow(clamp(1.0 - trapPoint * 4.5, 0.0, 1.0), 2.0);
  float interior = pow(clamp(edgeFog * 0.05, 0.0, 1.0), 1.3);
  float drift = fbm((c - center) * (5.0 + local * 0.6) + vec2(t * 0.012, -t * 0.01));

  float v = clamp(interior * 0.22 + shell * 0.52 + lineArt * 0.2 + haloArt * 0.16 + pointArt * 0.08 + orbitGlow * 0.02 + drift * 0.05 + u_beat * 0.025, 0.0, 0.95);
  v = pow(v, 1.14);

  float hue = 0.18 + family * 0.008 + smoothEscape * 0.14 + variant * 0.004;
  vec3 col = finishColor(v, hue, 1.04 + local * 0.06, lineArt * 0.008 + haloArt * 0.01 + pointArt * 0.008);
  col *= 0.8 + 0.12 * shell + 0.08 * haloArt;
  col = mix(col, vec3(dot(col, vec3(0.333))), 0.08 + 0.05 * local);
  return col;
}

vec3 scenePass1Julia(vec2 uv, float variant, float family) {
  float local = family - 66.0;
  vec2 p = aspectUv(uv, 1.06 + local * 0.06 + variant * 0.024 - u_bass * 0.16);
  p *= rot(u_time * (0.035 + local * 0.01));
  vec2 c = vec2(
    -0.72 + 0.18 * cos(u_time * (0.12 + local * 0.018) + local * 0.9 + variant * 0.09),
     0.22 * sin(u_time * (0.09 + variant * 0.01) + local * 1.4)
  );
  if (local > 2.5) {
    p = abs(p);
  }
  vec2 z = p;
  float trap = 10.0;
  float halo = 0.0;
  float lace = 0.0;
  for (int i = 0; i < 72; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (local > 0.5) {
      z += 0.015 * sin(vec2(z.y, z.x) * (4.0 + local + variant * 0.2) + u_time * 0.5);
    }
    float m2 = dot(z, z);
    trap = min(trap, abs(length(z) - (0.45 + 0.1 * local)));
    halo += exp(-(5.2 + local * 0.7) * abs(m2 - (0.6 + local * 0.22)));
    lace += exp(-(18.0 + local * 2.0 + variant) * abs(z.x * z.y));
    if (m2 > 48.0) break;
  }
  float ring = pow(clamp(1.0 - trap * (5.6 + variant * 0.2), 0.0, 1.0), 1.8 + local * 0.15);
  float cathedral = local > 2.5 ? exp(-(14.0 + variant) * abs(abs(p.x) - (0.22 + 0.05 * sin(u_time * 0.2)))) : 0.0;
  float v = clamp(halo * 0.18 + lace * 0.34 + ring * (0.52 + u_beat * 0.45) + cathedral * 0.32, 0.0, 1.0);
  return finishColor(v, 0.27 + family * 0.01 + local * 0.02, 1.46 + local * 0.08, ring * 0.04 + cathedral * 0.05);
}

vec3 scenePass1BurningShip(vec2 uv, float variant, float family) {
  float local = family - 70.0;
  vec2 p = aspectUv(uv, 0.86 + local * 0.06 + variant * 0.014 - u_bass * 0.08);
  if (local > 1.5) {
    p *= rot(0.22 * sin(u_time * 0.05));
  }
  vec2 c = vec2(-0.46 + 0.09 * cos(u_time * 0.08 + variant * 0.06), -0.57 + 0.11 * sin(u_time * 0.05 + local));
  vec2 z = p;
  float glow = 0.0;
  float trap = 10.0;
  float tide = 0.0;
  float ridges = 0.0;
  float escape = 0.0;
  for (int i = 0; i < 76; i++) {
    z = abs(z);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    float m2 = dot(z, z);
    glow += exp(-(7.5 + local * 0.8) * m2);
    trap = min(trap, abs(z.x + z.y * (0.8 + local * 0.24)));
    tide += exp(-(30.0 + variant * 1.2) * abs(z.y - sin(z.x * (2.4 + local * 0.6)) * 0.15));
    ridges += exp(-(42.0 + local * 3.0) * abs(abs(z.x) - abs(z.y) * (0.6 + local * 0.1)));
    if (m2 > 60.0) {
      float sm = float(i) + 1.0 - log2(max(1.0, log2(max(m2, 1.0001))));
      escape = sm / 76.0;
      break;
    }
  }
  float ember = pow(clamp(1.0 - trap * (3.0 + local * 0.55 + variant * 0.06), 0.0, 1.0), 2.2 + local * 0.2);
  float shell = smoothstep(0.06, 0.82, escape) * (1.0 - smoothstep(0.86, 1.0, escape));
  if (family > 71.5 && family < 72.5) {
    float crest = pow(clamp(1.0 - trap * (2.2 + variant * 0.06), 0.0, 1.0), 1.8);
    float v = clamp(glow * 0.045 + ember * 0.18 + ridges * 0.42 + shell * 0.26 + tide * 0.14 + crest * 0.12 + u_beat * 0.03, 0.0, 0.92);
    v = pow(v, 1.26);
    vec3 col = finishColor(v, 0.46 + family * 0.009, 1.02, ridges * 0.012 + tide * 0.008);
    col *= 0.82 + 0.12 * ridges;
    return col;
  }
  float v = clamp(glow * 0.08 + ember * 0.34 + ridges * 0.32 + shell * 0.42 + tide * (local > 1.5 ? 0.07 : 0.03) + u_beat * 0.035, 0.0, 1.0);
  v = pow(v, 1.22);
  vec3 col = finishColor(v, 0.46 + family * 0.009, 1.12 + local * 0.05, ember * 0.02 + ridges * 0.012);
  if (local > 1.5) {
    col += vec3(0.025, 0.018, 0.01) * tide;
  }
  return col;
}

vec3 scenePass1OrbitTrap(vec2 uv, float variant, float family) {
  float local = family - 73.0;
  vec2 p = aspectUv(uv, 0.98 + local * 0.06 + variant * 0.02);
  p *= rot(u_time * (0.02 + local * 0.006));

  vec2 z = p;
  float acc = 0.0;
  float trap = 10.0;
  float shell = 0.0;
  float escape = 0.0;

  for (int i = 0; i < 54; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y)
      + vec2(-0.68, 0.15 * sin(u_time * 0.12 + variant * 0.1));

    float t;
    if (local < 0.5) {
      t = min(abs(z.x), abs(z.y));
    } else if (local < 1.5) {
      t = abs(length(z) - (0.48 + 0.04 * sin(float(i) * 0.5 + variant)));
    } else {
      float cross = min(abs(z.x), abs(z.y));
      float diag = abs(abs(z.x) - abs(z.y)) * 0.75;
      t = min(cross, diag);
    }

    trap = min(trap, t);
    acc += exp(-(18.0 + local * 4.0 + variant * 0.5) * t);
    shell += exp(-(14.0 + local * 2.5) * abs(dot(z, z) - (0.72 + 0.08 * local)));

    float m2 = dot(z, z);
    if (m2 > 48.0) {
      float sm = float(i) + 1.0 - log2(max(1.0, log2(max(m2, 1.0001))));
      escape = sm / 54.0;
      break;
    }
  }

  acc /= 54.0;
  shell /= 54.0;

  float symbol = pow(clamp(1.0 - trap * (8.0 + local * 1.6), 0.0, 1.0), 2.2 + 0.16 * local);
  float field = smoothstep(0.05, 0.76, escape) * (1.0 - smoothstep(0.84, 1.0, escape));
  float haze = fbm(p * (2.2 + local * 0.25) + vec2(u_time * 0.02, -u_time * 0.015)) * 0.5 + 0.5;
  float dust = ridge(p * (3.0 + local * 0.35) + vec2(-u_time * 0.018, u_time * 0.022));

  float orbitRing = exp(-(18.0 + local * 2.0) * abs(length(p) - (0.46 + 0.05 * sin(atan(p.y, p.x) * angularCount(4.0 + local) + u_time * 0.12))));
  float core = exp(-(8.0 + variant * 0.5) * length(p));

  float v;
  if (local < 0.5) {
    v = clamp(
      acc * 0.30 +
      symbol * 0.34 +
      shell * 0.16 +
      field * 0.18 +
      orbitRing * 0.14 +
      dust * 0.08 +
      core * 0.06 +
      u_beat * 0.025,
      0.0, 0.82
    );
    v = smoothstep(0.10, 0.76, v);
  } else if (local < 1.5) {
    v = clamp(
      acc * 0.26 +
      symbol * 0.24 +
      shell * 0.28 +
      field * 0.16 +
      orbitRing * 0.22 +
      haze * 0.08 +
      core * 0.05 +
      u_beat * 0.025,
      0.0, 0.82
    );
    v = smoothstep(0.08, 0.74, v);
  } else {
    v = clamp(
      acc * 0.28 +
      symbol * 0.32 +
      shell * 0.16 +
      field * 0.16 +
      orbitRing * 0.16 +
      dust * 0.10 +
      haze * 0.06 +
      u_beat * 0.025,
      0.0, 0.82
    );
    v = smoothstep(0.09, 0.75, v);
  }

  return finishColor(v, 0.62 + family * 0.01, 1.04 + local * 0.04, symbol * 0.016 + orbitRing * 0.012);
}

vec3 scenePass1Filigree(vec2 uv, float variant, float family) {
  float local = family - 76.0;
  vec2 p = aspectUv(uv, 1.22 + local * 0.08 + variant * 0.025);
  p *= rot(u_time * (0.02 + local * 0.006));
  vec2 z = p;
  float veil = 0.0;
  float stalk = 0.0;
  float halo = 0.0;
  float thread = 10.0;
  for (int i = 0; i < 54; i++) {
    z = abs(z) / clamp(dot(z, z), 0.16, 3.5) - vec2(0.76 + local * 0.08, 0.48 + variant * 0.02);
    z *= rot(0.55 + local * 0.12 + u_mid * 0.18);
    float d = length(z);
    veil += exp(-(8.0 + local * 1.2) * d);
    stalk += exp(-(22.0 + variant * 1.2) * abs(z.x + 0.35 * sin(z.y * (4.0 + local))));
    halo += exp(-(18.0 + local * 2.2) * abs(d - (0.38 + 0.06 * local)));
    thread = min(thread, abs(z.x * z.y));
  }

  veil /= 54.0;
  stalk /= 54.0;
  halo /= 54.0;

  float filigree = pow(clamp(1.0 - thread * (14.0 + variant * 0.3), 0.0, 1.0), 1.6 + local * 0.25);
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float radialHalo = exp(-(18.0 + local * 2.0 + variant * 0.4) * abs(radius - (0.46 + 0.06 * sin(angle * angularCount(5.0 + local + variant * 0.12) + u_time * 0.16))));
  float spokes = pow(max(0.0, cos(angle * angularCount(4.0 + local + variant * 0.1) - u_time * (0.12 + local * 0.02))), 4.0) * smoothstep(1.2, 0.04, radius);
  float dust = ridge(p * (2.6 + local * 0.4) + vec2(u_time * 0.03, -u_time * 0.02));

  if (family > 77.5 && family < 78.5) {
    float v = clamp(veil * 0.38 + stalk * 0.44 + halo * 0.50 + filigree * 0.32 + radialHalo * 0.34 + spokes * 0.16 + dust * 0.12 + u_beat * 0.04, 0.0, 0.84);
    v = smoothstep(0.10, 0.78, v);
    return finishColor(v, 0.78 + family * 0.009, 1.0, filigree * 0.024 + radialHalo * 0.016);
  }

  float v = clamp(veil * 0.42 + stalk * (local < 0.5 ? 0.50 : 0.34) + halo * (local > 0.5 ? 0.54 : 0.24) + filigree * 0.38 + radialHalo * 0.28 + spokes * 0.14 + dust * 0.10 + u_beat * 0.05, 0.0, 0.86);
  v = smoothstep(0.08, 0.80, v);
  return finishColor(v, 0.78 + family * 0.009, 1.16 + local * 0.06, filigree * 0.028 + radialHalo * 0.018);
}

vec3 scenePass2RecursiveCurves(vec2 uv, float variant, float family) {
  float local = family - 79.0;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  p *= 1.08 + local * 0.06 + variant * 0.03;
  p *= rot(u_time * (0.02 + local * 0.006));

  float angle = atan(p.y, p.x);
  float radius = length(p);
  float folds = 0.0;
  float edge = 0.0;
  float snow = 0.0;
  vec2 q = p;
  for (int i = 0; i < 6; i++) {
    q = abs(q);
    q = q * rot(0.55 + local * 0.08) - vec2(0.58 + 0.06 * sin(float(i) + local), 0.0);
    float d = length(q);
    folds += exp(-(8.0 + local * 1.3) * d);
    edge += exp(-(34.0 + variant * 1.4) * abs(q.y));
    snow += exp(-(28.0 + local * 3.0) * abs(abs(q.x) + abs(q.y) - (0.36 + 0.04 * local)));
  }

  folds /= 6.0;
  edge /= 6.0;
  snow /= 6.0;

  float ribbon = 0.5 + 0.5 * sin(angle * angularCount(6.0 + local * 1.7 + variant * 0.3) + radius * (9.0 + local * 1.8) - u_time * (0.9 + local * 0.08));
  float coast = ridge(p * (2.6 + local * 0.35) + vec2(u_time * 0.03, -u_time * 0.02));
  float curve = 1.0 - smoothstep(0.0, 0.02 + variant * 0.0015, abs(fract((angle / TAU + 0.5) * angularCount(3.0 + local * 0.8)) - 0.5));

  if (local < 0.5) {
    float snowflakeRing = exp(-(24.0 + variant * 1.2) * abs(radius - (0.48 + 0.06 * sin(angle * angularCount(6.0) + u_time * 0.16))));
    float crystalSpokes = pow(max(0.0, cos(angle * angularCount(6.0) - u_time * 0.12)), 8.0) * smoothstep(1.2, 0.04, radius);
    float lace = 1.0 - smoothstep(0.0, 0.024 + variant * 0.001, abs(fract((angle / TAU + 0.5) * angularCount(12.0)) - 0.5));
    float v = clamp(folds * 0.26 + edge * 0.28 + snow * 0.34 + coast * 0.14 + snowflakeRing * 0.28 + crystalSpokes * 0.24 + lace * 0.14 + u_beat * 0.04, 0.0, 0.86);
    v = smoothstep(0.10, 0.80, v);
    return finishColor(v, 0.08 + family * 0.008 + variant * 0.004, 1.12, snow * 0.022 + crystalSpokes * 0.018);
  }

  float v = clamp(folds * 0.24 + edge * 0.24 + snow * 0.28 + coast * 0.16 + ribbon * 0.16 + curve * 0.16 + u_beat * 0.04, 0.0, 0.88);
  v = smoothstep(0.08, 0.82, v);
  return finishColor(v, 0.08 + family * 0.008 + variant * 0.004, 1.16 + local * 0.04, snow * 0.02 + edge * 0.016);
}

vec3 scenePass2Sierpinski(vec2 uv, float variant, float family) {
  float local = family - 84.0;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  p *= 1.18 + local * 0.08 + variant * 0.02;
  p *= rot(local < 1.5 ? 0.0 : PI * 0.166 + 0.08 * sin(u_time * 0.2));

  float tri = 0.0;
  float grid = 0.0;
  vec2 q = p;
  for (int i = 0; i < 7; i++) {
    q = abs(q);
    if (local < 0.5) {
      if (q.x + q.y > 1.0) q = vec2(1.0 - q.y, 1.0 - q.x);
      tri += exp(-(18.0 + variant) * abs(q.x + q.y - 0.72));
      q = q * 2.0 - vec2(0.8, 0.46);
    } else if (local < 1.5) {
      vec2 cell = abs(fract(q * (1.5 + float(i) * 0.35)) - 0.5);
      float hole = max(cell.x, cell.y);
      grid += exp(-(26.0 + variant * 1.2) * abs(hole - 0.22));
      q = q * 3.0 - vec2(1.0);
    } else {
      float band = abs(q.y + abs(q.x) * 0.5);
      tri += exp(-(24.0 + variant) * band);
      q = q * rot(PI / 3.0) * 1.85 - vec2(0.85, 0.0);
    }
  }
  float voids = local < 1.5 ? max(0.0, 1.0 - max(abs(p.x), abs(p.y)) * 0.9) : max(0.0, 1.0 - length(p) * 0.8);
  float v = clamp(tri * 0.38 + grid * 0.34 + voids * 0.18 + u_beat * 0.04, 0.0, 1.0);
  return finishColor(v, 0.16 + family * 0.007, 1.22 + local * 0.06, (tri + grid) * 0.018);
}

vec3 scenePass2Labyrinth(vec2 uv, float variant, float family) {
  float local = family - 87.0;
  vec2 p = aspectUv(uv, 1.12 + local * 0.04 + variant * 0.018);
  p *= rot(local < 0.5 ? 0.0 : 0.06 * sin(u_time * 0.12));

  if (family > 86.5 && family < 87.5) {
    vec2 q = p * (1.55 + variant * 0.03);
    q *= rot(0.12 * sin(u_time * 0.08 + variant * 0.35));

    float traces = 0.0;
    float turns = 0.0;
    float chambers = 0.0;
    vec2 t = q;
    for (int i = 0; i < 5; i++) {
      float scale = exp2(float(i));
      vec2 cellUv = fract(t * scale + vec2(float(i) * 0.17, float(i) * 0.11)) - 0.5;
      vec2 cellId = floor(t * scale + vec2(float(i) * 0.17, float(i) * 0.11));
      float orient = mod(cellId.x + cellId.y + float(i), 2.0);
      float lane = 1.0 - smoothstep(0.018, 0.07 + variant * 0.001,
        min(abs(cellUv.x), abs(cellUv.y + (orient < 0.5 ? 0.0 : 0.12 * sin(u_time * 0.08 + float(i))))));
      float turnA = exp(-(36.0 + float(i) * 4.0) * length(cellUv - vec2(orient < 0.5 ? 0.18 : -0.18, 0.18)));
      float turnB = exp(-(36.0 + float(i) * 4.0) * length(cellUv - vec2(orient < 0.5 ? -0.18 : 0.18, -0.18)));
      float room = exp(-(18.0 + float(i) * 3.0) * abs(max(abs(cellUv.x), abs(cellUv.y)) - 0.34));
      traces += lane / (1.0 + float(i) * 0.55);
      turns += (turnA + turnB) / (1.0 + float(i) * 0.65);
      chambers += room / (1.0 + float(i) * 0.9);
    }

    float drift = ridge(q * 1.1 + vec2(u_time * 0.02, -u_time * 0.016));
    float depth = smoothstep(1.35, 0.12, length(q)) * (0.16 + u_bass * 0.08);
    float pulse = exp(-(14.0 + variant) * abs(sin((q.x - q.y) * 2.4 - u_time * 0.42)));
    float v = clamp(traces * 0.42 + turns * 0.32 + chambers * 0.18 + drift * 0.12 + depth + pulse * 0.08 + u_beat * 0.05, 0.0, 0.92);
    v = pow(v, 1.06);
    return finishColor(v, 0.24 + family * 0.006, 1.18, traces * 0.012 + turns * 0.018 + chambers * 0.008);
  }

  vec2 q = p * (2.0 + local * 0.48);
  vec2 g = abs(fract(q) - 0.5);
  float corridors = min(g.x, g.y);
  float lanes = 1.0 - smoothstep(0.04, 0.11 + variant * 0.002, corridors);
  float bends = 1.0 - smoothstep(0.08, 0.18, abs(fract((q.x + q.y) * 0.5) - 0.5));
  float field = fbm(p * (2.0 + local * 0.3) + vec2(u_time * 0.05, -u_time * 0.03));
  float depth = smoothstep(1.3, 0.06, length(p)) * (0.24 + u_bass * 0.16);
  float v = clamp(lanes * 0.34 + bends * 0.18 + field * 0.18 + depth * 0.18 + u_beat * 0.04, 0.0, 0.88);
  return finishColor(v, 0.24 + family * 0.006, 1.08 + local * 0.04, lanes * 0.014);
}

vec3 scenePass2Borderlands(vec2 uv, float variant, float family) {
  float local = family - 89.0;
  vec2 p = aspectUv(uv, 1.16 + local * 0.08 + variant * 0.025);
  p *= rot(u_time * (0.02 + local * 0.008));
  float coast = ridge(p * (2.8 + local * 0.4) + vec2(u_time * 0.04, 0.0));
  float tiles = fbm(p * (5.0 + variant * 0.4) - vec2(0.0, u_time * 0.03));
  float border = exp(-(24.0 + local * 4.0) * abs(coast - (0.48 + local * 0.05)));
  float bite = exp(-(40.0 + variant * 1.5) * abs(fract((p.x + p.y) * (1.6 + local * 0.35)) - 0.5));
  float v = clamp(border * 0.45 + tiles * 0.2 + bite * 0.28 + u_beat * 0.04, 0.0, 1.0);
  v = pow(v, 1.12);
  return finishColor(v, 0.31 + family * 0.007, 1.22 + local * 0.05, border * 0.02 + bite * 0.015);
}

vec3 scenePass2Ornamental(vec2 uv, float variant, float family) {
  float local = family - 91.0;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  p *= 1.0 + local * 0.08 + variant * 0.02;
  float r = length(p);
  float a = atan(p.y, p.x);
  float petals = abs(sin(a * angularCount(5.0 + local * 1.2 + variant * 0.2) + u_time * (0.3 + local * 0.05)));
  float ribbon = abs(sin((p.x - p.y) * (6.0 + local * 1.5) + u_time * (0.5 + variant * 0.05)));
  float weave = 1.0 - smoothstep(0.0, 0.035 + variant * 0.002, abs(fract((a / TAU + 0.5) * angularCount(8.0 + local * 1.3)) - 0.5));
  float bloom = pow(clamp(1.0 - r * (0.72 - local * 0.03), 0.0, 1.0), 2.0 + local * 0.25);
  float dust = fbm(p * (3.2 + local * 0.25) + vec2(u_time * 0.03, u_time * 0.01));
  float v = clamp(petals * 0.28 + ribbon * 0.22 + weave * 0.24 + bloom * 0.24 + dust * 0.1 + u_beat * 0.06, 0.0, 1.0);
  return finishColor(v, 0.42 + family * 0.006 + local * 0.01, 1.3 + local * 0.06, weave * 0.02 + bloom * 0.02);
}

vec3 scenePass2Corridor(vec2 uv, float variant, float family) {
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float z = 1.0 / max(0.12, abs(p.y) + 0.22 + 0.08 * sin(u_time * 0.18));
  float lane = abs(fract((p.x * z * 0.75) + u_time * 0.1) - 0.5);
  float walls = 1.0 - smoothstep(0.08, 0.22, abs(abs(p.x) - (0.22 + 0.16 * z)));
  float cross = 1.0 - smoothstep(0.02, 0.06 + variant * 0.002, lane);
  float echo = 1.0 - smoothstep(0.0, 0.025, abs(fract(z * (1.1 + variant * 0.04) - u_time * 0.05) - 0.5));
  float haze = fbm(vec2(p.x * z, z) * 0.8 + vec2(0.0, u_time * 0.05));
  float depth = smoothstep(0.4, 3.2, z);
  float v = clamp(walls * 0.36 + cross * 0.26 + echo * 0.24 + haze * 0.12 + depth * 0.16 + u_beat * 0.06, 0.0, 1.0);
  v = pow(v, 1.06);
  return finishColor(v, 0.54 + family * 0.005 + variant * 0.004, 1.34, cross * 0.018 + echo * 0.015);
}


vec3 scenePass3Ferns(vec2 uv, float variant, float family) {
  float local = family - 96.0;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  p *= 1.1 + local * 0.06 + variant * 0.02;
  p *= rot(0.08 * sin(u_time * 0.09 + local * 0.4));
  vec2 z = p;
  float fern = 0.0;
  float sparkle = 0.0;
  for (int i = 0; i < 48; i++) {
    float h = hash11(float(i) * 3.17 + local * 17.0 + variant * 0.9);
    if (h < 0.03 + local * 0.01) {
      z = vec2(0.0, 0.16 * z.y);
    } else if (h < 0.86 - local * 0.02) {
      z = mat2(0.85, 0.04, -0.04, 0.85) * z + vec2(0.0, 0.16 + 0.01 * local);
    } else if (h < 0.93) {
      z = mat2(0.2 + local * 0.02, -0.26, 0.23, 0.22 + 0.01 * variant) * z + vec2(0.0, 0.16);
    } else {
      z = mat2(-0.15, 0.28, 0.26, 0.24) * z + vec2(0.0, 0.044);
    }
    vec2 q = z - p * vec2(0.12 + local * 0.03, 0.18 + 0.02 * variant);
    float d = length(vec2(q.x * (1.25 + local * 0.08), q.y * (0.7 + 0.05 * local)));
    fern += exp(-(8.0 + local * 1.6) * d);
    sparkle += exp(-(32.0 + variant) * abs(q.x * q.y));
  }
  float trunk = exp(-(10.0 + variant * 0.6) * abs(p.x)) * smoothstep(1.0, -0.25, p.y);
  float dust = pow(max(noise(p * (16.0 + local * 2.0) + u_time * 0.08) - 0.9, 0.0) * 4.0, 2.0);
  float v = clamp(fern * (0.11 + local * 0.015) + trunk * 0.18 + sparkle * 0.12 + dust * 0.03 + u_beat * 0.05, 0.0, 0.92);
  v = pow(v, 1.08);
  return finishColor(v, 0.58 + family * 0.004, 1.16 + local * 0.04, sparkle * 0.008 + dust * 0.01);
}

vec3 scenePass3Growth(vec2 uv, float variant, float family) {
  float local = family - 100.0;
  vec2 p = aspectUv(uv, 1.22 + local * 0.08 + variant * 0.02);
  p *= rot(0.12 * sin(u_time * 0.12 + local));
  float branches = ridge(p * (2.4 + local * 0.35) + vec2(u_time * 0.02, -u_time * 0.015));
  float coral = fbm(p * (3.1 + variant * 0.2) + vec2(-u_time * 0.012, u_time * 0.026));
  float lattice = exp(-(20.0 + variant) * abs(branches - (0.38 + local * 0.08)));
  float veins = exp(-(26.0 + local * 2.0) * abs(coral - 0.52));
  float glow = pow(max(noise(p * (20.0 + local * 3.0) - u_time * 0.04) - 0.92, 0.0) * 5.5, 2.0);
  float bloom = smoothstep(1.2, 0.1, length(p)) * (0.1 + u_bass * 0.06);
  float v = clamp(branches * 0.22 + coral * 0.24 + lattice * 0.18 + veins * 0.18 + bloom + glow * 0.03 + u_beat * 0.04, 0.0, 0.9);
  v = pow(v, 1.06);
  return finishColor(v, 0.64 + family * 0.004, 1.18 + local * 0.04, glow * 0.01 + lattice * 0.008);
}

vec3 scenePass3Canopy(vec2 uv, float variant, float family) {
  float local = family - 104.0;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  float petals = abs(sin(a * angularCount(4.0 + local * 1.3 + variant * 0.2) + u_time * (0.22 + local * 0.05)));
  float halo = exp(-(18.0 + local * 2.0) * abs(r - (0.38 + local * 0.06 + 0.05 * sin(u_time * 0.14))));
  float leaves = fbm(vec2(cos(a), sin(a)) * (3.5 + local * 0.4) + p * (2.0 + variant * 0.15) + vec2(u_time * 0.03, -u_time * 0.02));
  float roots = ridge(vec2(p.x * (1.2 + local * 0.08), p.y * (2.2 + local * 0.2)) + vec2(0.0, u_time * 0.02));
  float crown = pow(clamp(1.0 - r * (0.78 - local * 0.04), 0.0, 1.0), 2.0 + local * 0.25);
  float v = clamp(petals * 0.22 + halo * 0.22 + leaves * 0.3 + roots * 0.18 + crown * (0.14 + u_beat * 0.12), 0.0, 0.92);
  return finishColor(v, 0.7 + family * 0.004, 1.2 + local * 0.05, halo * 0.01 + crown * 0.012);
}

vec3 scenePass3Atmos(vec2 uv, float variant, float family) {
  float local = family - 108.0;
  vec2 p = aspectUv(uv, 1.1 + local * 0.06 + variant * 0.015);
  p *= rot(u_time * (0.01 + local * 0.004));
  float clouds = fbm(p * (2.1 + local * 0.3) + vec2(0.0, u_time * 0.03));
  float spores = pow(max(noise(p * (22.0 + local * 4.0 + variant * 2.0) + u_time * 0.12) - (0.91 - local * 0.01), 0.0) * 5.0, 2.2);
  float veil = ridge(p * (3.0 + local * 0.35) - vec2(u_time * 0.02, 0.0));
  float arches = exp(-(16.0 + local * 2.0) * abs(abs(p.x) - (0.62 - 0.08 * clouds + local * 0.04)));
  float tendrils = abs(sin((p.x + p.y) * (4.0 + local) + clouds * 4.0 - u_time * (0.38 + local * 0.05)));
  float core = smoothstep(1.25, 0.0, length(p)) * (0.12 + u_bass * 0.05);
  float v = clamp(clouds * 0.28 + veil * 0.18 + spores * 0.06 + arches * 0.16 + tendrils * 0.18 + core + u_beat * 0.05, 0.0, 0.9);
  v = pow(v, 1.04);
  return finishColor(v, 0.76 + family * 0.004, 1.22 + local * 0.04, spores * 0.018 + arches * 0.008);
}


vec3 scenePass4Cathedral(vec2 uv, float variant, float family) {
  float local = family - 112.0;
  vec2 p = aspectUv(uv, 0.92 + variant * 0.02 + local * 0.04 - u_bass * 0.08);
  p *= rot(u_time * (0.012 + local * 0.004));
  vec3 mandel = scenePass1Mandelbrot(uv, variant, 62.0 + mod(local, 4.0));
  float r = length(p);
  float a = atan(p.y, p.x);
  float rose = exp(-(18.0 + variant) * abs(r - (0.33 + 0.05 * sin(a * angularCount(4.0 + local) + u_time * 0.18))));
  float arches = exp(-(16.0 + local * 2.0) * abs(abs(p.x) - (0.52 - 0.12 * smoothstep(0.0, 1.2, abs(p.y)))));
  float nave = exp(-(14.0 + variant * 0.6) * abs(p.y + 0.22));
  float dust = pow(max(noise(p * (14.0 + local * 2.0) + u_time * 0.05) - 0.9, 0.0) * 4.0, 2.0);
  float v = clamp(rose * 0.24 + arches * 0.22 + nave * 0.14 + dust * 0.06 + length(mandel) * 0.72, 0.0, 1.0);
  vec3 col = finishColor(v, 0.82 + family * 0.004, 1.28, rose * 0.03 + dust * 0.01);
  return mix(col, mandel, 0.42);
}

vec3 scenePass4Hybrid(vec2 uv, float variant, float family) {
  float local = family - 116.0;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  float kale = abs(sin(a * angularCount(5.0 + local + variant * 0.3) + u_time * (0.22 + local * 0.04)));
  float rings = exp(-(20.0 + variant) * abs(r - (0.28 + 0.12 * sin(u_time * 0.12 + local))));
  float coast = ridge(p * (2.3 + local * 0.3) + vec2(u_time * 0.04, -u_time * 0.02));
  float frost = exp(-(26.0 + variant) * abs(coast - (0.42 + 0.06 * sin(a * 3.0))));
  float choir = smoothstep(1.15, 0.02, r) * (0.16 + u_beat * 0.14);
  float v = clamp(kale * 0.18 + rings * 0.22 + coast * 0.24 + frost * 0.18 + choir, 0.0, 1.0);
  return finishColor(v, 0.88 + family * 0.004, 1.24, frost * 0.02 + rings * 0.015);
}

vec3 scenePass4Cosmic(vec2 uv, float variant, float family) {
  float local = family - 120.0;
  vec2 p = aspectUv(uv, 1.08 + local * 0.08 + variant * 0.02);
  p *= rot(u_time * (0.018 + local * 0.004));
  float spiral = atan(p.y, p.x) + length(p) * (2.0 + local * 0.4);
  float lanes = sin(spiral * angularCount(3.5 + local) - u_time * (0.35 + local * 0.06));
  float neb = fbm(p * (2.1 + local * 0.25) + vec2(u_time * 0.03, -u_time * 0.025));
  float reef = ridge(p * (3.0 + variant * 0.2) - vec2(0.0, u_time * 0.02));
  float stars = pow(max(noise(p * (24.0 + local * 4.0 + variant) + u_time * 0.11) - 0.93, 0.0) * 6.0, 2.8);
  float v = clamp((lanes * 0.5 + 0.5) * 0.16 + neb * 0.3 + reef * 0.18 + stars * 0.12 + smoothstep(1.2, 0.0, length(p)) * (0.16 + u_beat * 0.12), 0.0, 1.0);
  return finishColor(v, 0.94 + family * 0.004, 1.26, stars * 0.08);
}

vec3 scenePass4Finale(vec2 uv, float variant, float family) {
  vec3 a = scenePass4Cathedral(uv, variant, 112.0 + mod(family, 4.0));
  vec3 b = scenePass4Hybrid(uv, variant, 116.0 + mod(family, 4.0));
  vec3 c = scenePass4Cosmic(uv, variant, 120.0 + mod(family, 4.0));
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float z = 1.0 / max(0.18, abs(p.y) + 0.18 + 0.05 * sin(u_time * 0.2));
  float tunnel = 1.0 - smoothstep(0.05, 0.22, abs(abs(p.x) - (0.2 + 0.18 * z)));
  float echo = 1.0 - smoothstep(0.0, 0.03, abs(fract(z * (1.0 + variant * 0.05) - u_time * 0.06) - 0.5));
  vec3 col = mix(mix(a, b, 0.35), c, 0.35) + vec3((tunnel * 0.08 + echo * 0.05) * (1.0 + u_beat));
  return col;
}


float haloRing(float radius, float center, float width) {
  return exp(-abs(radius - center) * width);
}

float angularSweep(float angle, float count, float offset) {
  return 0.5 + 0.5 * cos(angle * count + offset);
}

vec3 scenePass5WhisperHalo(vec2 uv, float variant, float family) {
  float local = family - 128.0;
  vec2 p = aspectUv(uv, 1.08 + variant * 0.018);
  float r = length(p);
  float a = atan(p.y, p.x);
  float drift = u_time * (0.16 + variant * 0.012);
  float breath = 0.5 + 0.5 * sin(u_time * (0.34 + variant * 0.018) + r * 12.0);
  float rings = 0.0;
  float ghosts = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float center = 0.16 + fi * (0.12 + 0.003 * variant) + 0.015 * sin(drift * (0.8 + fi * 0.13) + fi * 1.7);
    float width = 34.0 + fi * 7.0 + variant * 1.6;
    rings += haloRing(r, center, width) * (0.48 + 0.12 * sin(drift * 0.6 + fi * 2.1));
    ghosts += haloRing(r, center + 0.05 * sin(a * (2.0 + fi) + drift * 0.4), width * 0.32) * 0.12;
  }
  float choir = angularSweep(a, angularCount(6.0 + variant * 0.35), drift * 0.7) * haloRing(r, 0.52 + 0.02 * sin(drift), 18.0);
  float haze = fbm(p * (2.0 + variant * 0.08) + vec2(drift * 0.18, -drift * 0.14));
  float core = exp(-(10.0 + variant) * r * r) * (0.16 + 0.12 * breath);
  float scint = pow(max(noise(angleDir(a) * 4.0 + vec2(r * 40.0 + drift * 0.5, drift * 0.13)) - 0.91, 0.0) * 6.0, 2.0) * 0.06;
  float v = clamp(rings * 0.42 + ghosts + choir * 0.16 + haze * 0.18 + core + scint + u_beat * 0.05, 0.0, 1.0);
  vec3 col = finishColor(pow(v, 1.12), 0.96 + variant * 0.008, 1.04, scint);
  col *= 0.84 + 0.22 * breath;
  return col;
}

vec3 scenePass5EchoBasin(vec2 uv, float variant, float family) {
  vec2 p = aspectUv(uv, 1.02 + variant * 0.022);
  float r = length(p);
  float a = atan(p.y, p.x);
  float drift = u_time * (0.24 + variant * 0.014);
  float boundary = 0.82 + 0.03 * sin(drift * 0.7);
  float pulseA = sin(r * (22.0 + variant * 1.5) - drift * (2.0 + 0.12 * variant));
  float pulseB = sin((boundary - r) * (18.0 + variant) - drift * (1.45 + 0.08 * variant));
  float outward = exp(-abs(pulseA) * (6.0 + variant * 0.5));
  float inward = exp(-abs(pulseB) * (5.2 + variant * 0.4)) * smoothstep(boundary + 0.08, boundary - 0.18, r);
  float basin = haloRing(r, boundary, 26.0 + variant * 1.5) * (0.38 + 0.18 * sin(a * 3.0 + drift));
  float echoShells = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float center = 0.2 + fi * 0.14 + 0.01 * sin(drift * (1.0 + fi * 0.21) + fi * 1.1);
    echoShells += haloRing(r, center, 22.0 + fi * 3.0) * (0.16 + 0.04 * cos(drift + fi));
  }
  float shimmer = ridge(angleDir(a) * 1.5 + vec2(r * 5.0 + drift * 0.08, -drift * 0.05)) * 0.12;
  float core = exp(-14.0 * r * r) * 0.1;
  float v = clamp(outward * 0.28 + inward * 0.34 + basin * 0.22 + echoShells * 0.25 + shimmer + core + u_beat * 0.06, 0.0, 1.0);
  return finishColor(pow(v, 1.06), 1.02 + variant * 0.007, 1.08, shimmer * 0.03);
}

vec3 scenePass5ApertureRing(vec2 uv, float variant, float family) {
  vec2 p = aspectUv(uv, 1.0 + variant * 0.02);
  float r = length(p);
  float a = atan(p.y, p.x);
  float drift = u_time * (0.2 + variant * 0.01);
  float aperture = 0.16 + 0.03 * sin(drift * (1.0 + variant * 0.08)) + 0.012 * sin(drift * 2.7 + variant);
  float iris = smoothstep(aperture + 0.015, aperture - 0.01, r);
  float irisEdge = haloRing(r, aperture, 80.0 + variant * 3.0);
  float resonance = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float center = aperture + 0.08 + fi * 0.11 + 0.016 * sin(drift * (0.75 + fi * 0.18) - fi * 1.4);
    resonance += haloRing(r, center, 20.0 + fi * 4.0) * (0.28 + 0.08 * cos(a * (3.0 + fi) + drift * 0.6));
  }
  float choir = pow(angularSweep(a, angularCount(8.0 + variant * 0.3), drift * 0.45), 3.0) * haloRing(r, 0.58, 16.0);
  float haze = fbm(p * (2.4 + variant * 0.08) + vec2(drift * 0.16, drift * -0.12)) * 0.16;
  float bloom = exp(-(7.0 + variant * 0.4) * abs(r - (aperture + 0.18))) * (0.18 + u_beat * 0.12);
  float v = clamp((1.0 - iris) * 0.06 + irisEdge * 0.42 + resonance * 0.42 + choir * 0.18 + haze + bloom + u_beat * 0.07, 0.0, 1.0);
  vec3 col = finishColor(pow(v, 1.03), 1.08 + variant * 0.006, 1.12, bloom * 0.03);
  col *= 0.9 + 0.14 * sin(drift * 0.8);
  return col;
}

vec3 scenePass5IndexDisc(vec2 uv, float variant, float family) {
  vec2 p = aspectUv(uv, 0.94 + variant * 0.015);
  float r = length(p);
  float a = atan(p.y, p.x);
  float drift = u_time * (0.11 + variant * 0.006);
  float disc = smoothstep(0.92, 0.06, r);
  float ring = haloRing(r, 0.74 + 0.012 * sin(drift * 1.3), 34.0);
  float inner = haloRing(r, 0.38 + 0.01 * sin(drift * 0.8 + 1.2), 22.0);
  float ticks = 0.0;
  float count = 14.0 + variant;
  float angular = abs(sin(a * count + drift * 0.9));
  ticks = pow(1.0 - angular, 14.0) * smoothstep(0.84, 0.52, r) * smoothstep(0.2, 0.44, r);
  float minorTicks = pow(1.0 - abs(sin(a * count * 2.0 - drift * 0.4)), 20.0) * smoothstep(0.9, 0.62, r) * 0.6;
  float spokes = pow(angularSweep(a, 6.0 + variant * 0.2, drift * 0.5), 2.4) * smoothstep(0.78, 0.0, r) * 0.18;
  float flares = exp(-abs(sin(a * (count * 0.5) - drift * 1.1)) * 18.0) * haloRing(r, 0.78, 44.0) * 0.24;
  float haze = ridge(p * (2.5 + variant * 0.06) + vec2(drift * 0.08, -drift * 0.06)) * 0.1;
  float core = exp(-(11.0 + variant * 0.6) * r * r) * 0.14;
  float v = clamp(disc * 0.1 + ring * 0.34 + inner * 0.22 + ticks * 0.28 + minorTicks * 0.12 + spokes + flares + haze + core + u_beat * 0.05, 0.0, 1.0);
  vec3 col = finishColor(pow(v, 1.02), 0.12 + variant * 0.004, 1.12, flares * 0.05);
  col *= mix(0.9, 1.08, disc);
  return col;
}

vec3 renderFamily(float family, float variant, vec2 uv) {
  if (family < 3.5) return sceneJuliaField(uv, variant, family);
  if (family < 7.5) return sceneNebulaCloud(uv, variant, family);
  if (family < 11.5) return sceneKaleidoWarp(uv, variant, family);
  if (family < 15.5) return scenePlasmaTide(uv, variant, family);
  if (family < 18.5) return sceneOrbitalLattice(uv, variant, family);
  if (family < 22.5) return sceneCrystalEngine(uv, variant, family);
  if (family < 26.5) return sceneMandalaRift(uv, variant, family);
  if (family < 30.5) return sceneAuroraCurtain(uv, variant, family);
  if (family < 34.5) return sceneForgeStars(uv, variant, family);
  if (family < 38.5) return sceneGridHymn(uv, variant, family);
  if (family < 42.5) return sceneGardenVortex(uv, variant, family);
  if (family < 43.5) return sceneBurnShip(uv, variant, family);
  if (family < 44.5) return sceneSignalCathedral(uv, variant, family);
  if (family < 45.5) return sceneBurnShip(uv, variant, family);
  if (family < 46.5) return sceneArcLantern(uv, variant, family);
  if (family < 50.5) return scenePolarBloom(uv, variant, family);
  if (family < 54.5) return sceneTempleNoise(uv, variant, family);
  if (family < 57.5) return sceneAttractorField(uv, variant, family);
  if (family < 59.5) return sceneMandelbarGlow(uv, variant, family);
  if (family < 61.5) return sceneDomainFlare(uv, variant, family);
  if (family < 62.5) return sceneDomainFlare(uv, variant, family) + sceneCathedralSdf(uv, variant, family) * 0.55;
  if (family < 66.5) return scenePass1Mandelbrot(uv, variant, family);
  if (family < 70.5) return scenePass1Julia(uv, variant, family);
  if (family < 73.5) return scenePass1BurningShip(uv, variant, family);
  if (family < 76.5) return scenePass1OrbitTrap(uv, variant, family);
  if (family < 79.5) return scenePass1Filigree(uv, variant, family);
  if (family < 84.5) return scenePass2RecursiveCurves(uv, variant, family);
  if (family < 87.5) return scenePass2Sierpinski(uv, variant, family);
  if (family < 89.5) return scenePass2Labyrinth(uv, variant, family);
  if (family < 91.5) return scenePass2Borderlands(uv, variant, family);
  if (family < 95.5) return scenePass2Ornamental(uv, variant, family);
  if (family < 96.5) return scenePass2Corridor(uv, variant, family);
  if (family < 100.5) return scenePass3Ferns(uv, variant, family);
  if (family < 104.5) return scenePass3Growth(uv, variant, family);
  if (family < 108.5) return scenePass3Canopy(uv, variant, family);
  if (family < 112.5) return scenePass3Atmos(uv, variant, family);
  if (family < 116.5) return scenePass4Cathedral(uv, variant, family);
  if (family < 120.5) return scenePass4Hybrid(uv, variant, family);
  if (family < 124.5) return scenePass4Cosmic(uv, variant, family);
  if (family < 128.5) return scenePass4Finale(uv, variant, family);
  if (family < 129.5) return scenePass5WhisperHalo(uv, variant, family);
  if (family < 130.5) return scenePass5EchoBasin(uv, variant, family);
  if (family < 131.5) return scenePass5ApertureRing(uv, variant, family);
  return scenePass5IndexDisc(uv, variant, family);
}

vec3 renderScene(float mode, vec2 uv) {
  float variant = mod(mode, 10.0);
  float family = floor(mode / 10.0);
  return renderFamily(family, variant, uv);
}

void main() {
  vec2 uv = v_uv;
  vec3 prevCol = renderScene(u_prev_mode, uv);
  vec3 nextCol = renderScene(u_mode, uv);
  float mixT = smoothstep(0.0, 1.0, u_scene_mix);
  vec3 col = mix(prevCol, nextCol, mixT);

  vec3 prevPal = palette(length(prevCol) * 0.22, u_prev_theme, u_time * 0.01);
  vec3 nextPal = palette(length(nextCol) * 0.22, u_theme, u_time * 0.01);
  col *= mix(prevPal, nextPal, mixT) * 0.76 + 0.6;

  float vignette = smoothstep(1.15, 0.18, length((uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0)));
  float scan = 0.985 + 0.015 * sin(uv.y * u_resolution.y * 0.5 + u_time * 8.0);
  col *= vignette * scan * (1.0 + u_beat * 0.08 + u_energy * 0.04);
  col = 1.0 - exp(-col * (1.24 + u_energy * 0.8));
  col = pow(col, vec3(0.92));

  gl_FragColor = vec4(col, 1.0);
}
`;export{l as fragmentShaderSource,a as vertexShaderSource};
