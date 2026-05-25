uniform float uTension;
uniform vec3 uBaseColor;
uniform vec3 uTensionColor;
uniform vec3 uLightDir1;
uniform vec3 uLightDir2;
uniform vec3 uLightColor1;
uniform vec3 uLightColor2;
uniform float uAmbientIntensity;
uniform float uShininess;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vTension;
varying float vInflation;
varying float vEdgeFactor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  vec3 ambient = uBaseColor * uAmbientIntensity;

  vec3 lightDir1 = normalize(uLightDir1);
  float diff1 = max(dot(normal, lightDir1), 0.0);
  vec3 halfDir1 = normalize(lightDir1 + viewDir);
  float spec1 = pow(max(dot(normal, halfDir1), 0.0), uShininess);
  vec3 diffuse1 = uBaseColor * diff1 * uLightColor1;
  vec3 specular1 = uLightColor1 * spec1 * 0.3;

  vec3 lightDir2 = normalize(uLightDir2);
  float diff2 = max(dot(normal, lightDir2), 0.0);
  vec3 diffuse2 = uBaseColor * diff2 * uLightColor2 * 0.5;

  vec3 litColor = ambient + diffuse1 + diffuse2 + specular1;

  float tensionMix = smoothstep(0.0, 0.8, vTension);
  vec3 tensionHue = mix(uBaseColor, uTensionColor, tensionMix * 0.7);

  vec3 finalColor = litColor;
  finalColor = mix(finalColor, tensionHue * (ambient + diffuse1 + diffuse2), tensionMix * 0.5);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
  vec3 rimGlow = uTensionColor * fresnel * tensionMix * 0.6;
  finalColor += rimGlow;

  float subsurface = pow(max(dot(-viewDir, -normal), 0.0), 2.0);
  vec3 sss = uTensionColor * subsurface * tensionMix * 0.25;
  finalColor += sss;

  float inflationGlow = vInflation * 2.0;
  finalColor += uTensionColor * inflationGlow * tensionMix * 0.15;

  finalColor = mix(finalColor, uTensionColor, tensionMix * vEdgeFactor * 0.3);

  gl_FragColor = vec4(finalColor, 1.0);
}
