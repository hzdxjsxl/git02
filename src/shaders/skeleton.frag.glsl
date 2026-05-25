uniform vec3 uBoneColor;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
  float diff = max(dot(normal, lightDir), 0.0);

  vec3 ambient = uBoneColor * 0.3;
  vec3 diffuse = uBoneColor * diff * 0.7;

  vec3 finalColor = ambient + diffuse;

  gl_FragColor = vec4(finalColor, uOpacity);
}
