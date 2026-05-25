uniform float uTime;
uniform float uTension;
uniform float uMaxInflate;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vTension;
varying float vInflation;
varying float vEdgeFactor;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vTension = uTension;

  float tensionSmooth = smoothstep(0.0, 1.0, uTension);

  float inflation = tensionSmooth * uMaxInflate;
  inflation = min(inflation, uMaxInflate);

  float edgeFactor = pow(1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0))), 2.0);
  float edgeInflation = inflation * edgeFactor * 0.3;
  inflation += edgeInflation;

  vInflation = inflation;
  vEdgeFactor = edgeFactor;

  vec3 inflatedPosition = position + normal * inflation;

  float subtlePulse = sin(uTime * 2.0 + position.y * 2.0) * 0.015;
  inflatedPosition += normal * subtlePulse * tensionSmooth;

  vec4 worldPos = modelMatrix * vec4(inflatedPosition, 1.0);
  vWorldPos = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
