// dev/devShader.ts

export const isTraveler = true; 

export const glassHooks = {
  uvModifier: /* glsl */ `
    float thickness_uv = min(uSize.x, uSize.y) * 0.4; 
    float index = 1.2; 
    float base_height = thickness_uv * 2.0;

    // UV용 로컬 SDF 계산
    vec2 xRadii_uv = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r_uv = mix(xRadii_uv.y, xRadii_uv.x, step(0.0, p.y));
    float d_uv = sdRoundedBox(p, halfSize, r_uv);

    // UV용 3D 곡면 법선 계산
    float dx_uv = dFdx(d_uv);
    float dy_uv = dFdy(d_uv);
    if (abs(dx_uv) < 0.001 && abs(dy_uv) < 0.001) {
        vec2 fallbackDir = normalize(p);
        dx_uv = fallbackDir.x; dy_uv = fallbackDir.y;
    }

    float n_cos_uv = max(thickness_uv + d_uv, 0.0) / max(thickness_uv, 0.001);
    float n_sin_uv = sqrt(max(1.0 - n_cos_uv * n_cos_uv, 0.0));
    vec3 normal_uv = normalize(vec3(dx_uv * n_cos_uv, dy_uv * n_cos_uv, n_sin_uv));

    float h = 0.0;
    if (d_uv < -thickness_uv) {
        h = thickness_uv;
    } else if (d_uv < 0.0) {
        float x = thickness_uv + d_uv;
        h = sqrt(max(thickness_uv * thickness_uv - x * x, 0.0));
    }

    // 굴절 적용
    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 refract_vec = refract(incident, normal_uv, 1.0 / index);
    
    float denom = dot(vec3(0.0, 0.0, -1.0), refract_vec);
    float refract_length = (h + base_height) / max(denom, 0.001); 
    
    vec2 distortOffset = (refract_vec.xy * refract_length) / max(uSize.x, 1.0); 

    resultUv = screenUv - distortOffset; 
  `,
  
  colorModifier: /* glsl */ `
    // 텍스처 유무와 상관없이 독립적으로 작동하도록 Normal 자체 계산
    // (BoxGenerator 템플릿의 전역 변수 'd'와 'p' 활용)
    float thickness_c = min(uSize.x, uSize.y) * 0.4;
    
    float dx_c = dFdx(d);
    float dy_c = dFdy(d);
    if (abs(dx_c) < 0.001 && abs(dy_c) < 0.001) {
        vec2 fallbackDir = normalize(p);
        dx_c = fallbackDir.x; dy_c = fallbackDir.y;
    }

    float n_cos_c = max(thickness_c + d, 0.0) / max(thickness_c, 0.001);
    float n_sin_c = sqrt(max(1.0 - n_cos_c * n_cos_c, 0.0));
    vec3 normal_c = normalize(vec3(dx_c * n_cos_c, dy_c * n_cos_c, n_sin_c));

    // 가장자리 반사광 + 프레넬(Fresnel) 반사 추가
    float edgeReflection = smoothstep(-15.0, 0.0, d) * smoothstep(0.0, -15.0, d); 
    float fresnel = pow(1.0 - max(dot(normal_c, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    
    finalColor.rgb += vec3(1.0) * (edgeReflection * 0.4 + fresnel * 0.6);
  `
};