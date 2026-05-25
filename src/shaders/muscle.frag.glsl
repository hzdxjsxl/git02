uniform float uTension;
uniform vec3 uBaseColor;
uniform vec3 uTensionColor;
uniform float uAmbientStrength;
uniform float uLightIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vTension;
varying float vInflation;

void main() {
  vec3 normal = normalize(vNormal);

  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
  float diff = max(dot(normal, lightDir), 0.0);

  vec3 ambient = uBaseColor * uAmbientStrength;
  vec3 diffuse = uBaseColor * diff * uLightIntensity;

  float tensionMix = smoothstep(0.0, 1.0, vTension);
  vec3 tensionColor = mix(uBaseColor, uTensionColor, tensionMix);

  float inflationGlow = vInflation * 2.0;
  tensionColor += uTensionColor * inflationGlow * 0.5;

  vec3 finalColor = mix(ambient + diffuse, tensionColor, tensionMix * 0.7);

  float rim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
  rim = pow(rim, 2.0);
  finalColor += uTensionColor * rim * tensionMix * 0.3;

  gl_FragColor = vec4(finalColor, 1.0);
}
