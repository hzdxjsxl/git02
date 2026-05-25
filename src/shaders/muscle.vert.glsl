uniform float uTime;
uniform float uTension;
uniform float uInflateAmount;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vTension;
varying float vInflation;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vTension = uTension;

  float inflation = uTension * uInflateAmount;
  vInflation = inflation;

  vec3 inflatedPosition = position + normal * inflation;

  float pulse = sin(uTime * 3.0) * 0.1;
  inflatedPosition += normal * pulse * uTension * 0.3;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(inflatedPosition, 1.0);
}
