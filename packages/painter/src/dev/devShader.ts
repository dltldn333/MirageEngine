export const isTraveler = true;

export const glassHooks = {
  uvModifier: /* glsl */ `
    // 1. 박스 크기에 비례한 두께감
    // float thickness_uv = min(uSize.x, uSize.y) * 0.5; 
    float thickness_uv = 25.0; 
    float index = 1.3; // 굴절률 (공기: 1.0, 유리: 1.5~1.9)
    float base_height = thickness_uv * 1.5;

    // 2. 로컬 SDF 계산 (p는 픽셀 단위)
    vec2 xRadii_uv = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r_uv = mix(xRadii_uv.y, xRadii_uv.x, step(0.0, p.y));
    float d_uv = sdRoundedBox(p, halfSize, r_uv);

    // 3. 3D 노말(Normal) 계산
    float dx_uv = dFdx(d_uv);
    float dy_uv = dFdy(d_uv);
    if (abs(dx_uv) < 0.001 && abs(dy_uv) < 0.001) {
        vec2 fallbackDir = normalize(p);
        dx_uv = fallbackDir.x; dy_uv = fallbackDir.y;
    }
    float n_cos_uv = max(thickness_uv + d_uv, 0.0) / max(thickness_uv, 0.001);
    float n_sin_uv = sqrt(max(1.0 - n_cos_uv * n_cos_uv, 0.0));
    vec3 normal_uv = normalize(vec3(dx_uv * n_cos_uv, dy_uv * n_cos_uv, n_sin_uv));

    // 4. Z 높이 계산
    float h = 0.0;
    if (d_uv < -thickness_uv) {
        h = thickness_uv;
    } else if (d_uv < 0.0) {
        float x = thickness_uv + d_uv;
        h = sqrt(max(thickness_uv * thickness_uv - x * x, 0.0));
    }

    // 5. 굴절(Refraction) 적용
    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 refract_vec = refract(incident, normal_uv, 1.0 / index);
    
    float denom = dot(vec3(0.0, 0.0, -1.0), refract_vec);
    float refract_length = (h + base_height) / max(denom, 0.001); 
    
    // offsetPx는 '박스 내부의 픽셀 단위' 왜곡 거리입니다.
    vec2 offsetPx = refract_vec.xy * refract_length;
    
    // [다시 복구!] 큰 배경 텍스쳐를 자르기 위해 screenUv를 사용
    // 화면 1픽셀이 전체 screenUv(0~1)에서 차지하는 비율을 편미분으로 동적 계산
    vec2 pixelToUv = vec2(dFdx(screenUv.x), dFdy(screenUv.y));
    if (abs(pixelToUv.x) < 0.000001) pixelToUv.x = 1.0 / 1920.0; // 안전 장치
    if (abs(pixelToUv.y) < 0.000001) pixelToUv.y = 1.0 / 1080.0; // 안전 장치
    
    // 픽셀 오프셋을 화면 UV 오프셋으로 변환
    vec2 distortOffset = offsetPx * pixelToUv;

    // vUv 대신 screenUv에서 왜곡값을 빼서 최종 배경 픽셀을 당겨옵니다.
    resultUv = screenUv - distortOffset; 
  `,

  //   colorModifier: /* glsl */ `
  //     // float thickness_c = min(uSize.x, uSize.y) * 0.5;
  //     float thickness_c = 25.0;
  //     float dx_c = dFdx(d);
  //     float dy_c = dFdy(d);
  //     if (abs(dx_c) < 0.001 && abs(dy_c) < 0.001) {
  //         vec2 fallbackDir = normalize(p);
  //         dx_c = fallbackDir.x; dy_c = fallbackDir.y;
  //     }
  //     float n_cos_c = max(thickness_c + d, 0.0) / max(thickness_c, 0.001);
  //     float n_sin_c = sqrt(max(1.0 - n_cos_c * n_cos_c, 0.0));
  //     vec3 normal_c = normalize(vec3(dx_c * n_cos_c, dy_c * n_cos_c, n_sin_c));

  //     float edgeReflection = smoothstep(-5.0, 0.0, d) * smoothstep(0.0, -5.0, d);
  //     float fresnel = pow(1.0 - max(dot(normal_c, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);

  //     finalColor.rgb += vec3(1.0) * (edgeReflection * 0.4 + fresnel * 0.5);
  //   `,
  colorModifier: /* glsl */ `
    // 1. 노말 계산 (기존과 동일)
    float thickness_c = 25.0;
    float dx_c = dFdx(d);
    float dy_c = dFdy(d);
    if (abs(dx_c) < 0.001 && abs(dy_c) < 0.001) {
        vec2 fallbackDir = normalize(p);
        dx_c = fallbackDir.x; dy_c = fallbackDir.y;
    }
    float n_cos_c = max(thickness_c + d, 0.0) / max(thickness_c, 0.001);
    float n_sin_c = sqrt(max(1.0 - n_cos_c * n_cos_c, 0.0));
    vec3 normal_c = normalize(vec3(dx_c * n_cos_c, dy_c * n_cos_c, n_sin_c));

    // ==========================================
    // [애플 스타일 리퀴드 글래스 틴트 & 질감 추가]
    // ==========================================

    // A. 틴트(Tint) 조작
    // 밝은 테마라면 vec3(1.0), 어두운 테마라면 vec3(0.1) 등을 사용
    vec3 tintColor = vec3(0.03, 0.03, 0.8); 
    float tintStrength = 0.3; // 틴트 강도 (0.1 ~ 0.3 사이 추천)
    finalColor.rgb = mix(finalColor.rgb, tintColor, tintStrength);

    // B. 프로스트 글래스 노이즈 (시각적 밀도감)
    // vUv를 이용한 간단한 난수 생성으로 화면 픽셀 단위의 미세한 질감을 줌
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
    finalColor.rgb += noise * 0.01; // 노이즈 강도 (너무 강하면 지저분해짐)

    // C. 프레넬(Fresnel) 및 날카로운 단면 반사광
    float fresnel = pow(1.0 - max(dot(normal_c, vec3(0.0, 0.0, 1.0)), 0.0), 4.0);
    
    // 기존의 두꺼운 15px 빛 맺힘 대신 1.5px~2px 수준의 예리한 테두리 하이라이트
    float sharpEdge = smoothstep(-5.0, 0.0, d) * smoothstep(0.0, -5.0, d); 
    
    // 빛 합성 (테두리가 살짝 빛나며 유리 질감을 완성)
    finalColor.rgb += vec3(1.0) * (sharpEdge * 0.6 + fresnel * 0.3);
  `,
};
