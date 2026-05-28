import { Mirage } from "@/index";
import { MirageConfig } from "@/types";

const shader = {
  uvModifier: /* glsl */ `
   // 1. 로컬 SDF 계산
    vec2 xRadii_uv = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r_uv = mix(xRadii_uv.y, xRadii_uv.x, step(0.0, p.y));
    float d_uv = sdRoundedBox(p, halfSize, r_uv);

    // 2. 표면 기울기(Gradient) 도출: 바깥 테두리를 향하는 방향 벡터
    float dx_uv = dFdx(d_uv);
    float dy_uv = dFdy(d_uv);
    if (abs(dx_uv) < 0.001 && abs(dy_uv) < 0.001) {
        vec2 fallbackDir = normalize(p);
        dx_uv = fallbackDir.x; dy_uv = fallbackDir.y;
    }
    vec2 grad = normalize(vec2(dx_uv, dy_uv)); 

    // 안쪽으로 들어간 픽셀 거리 (0: 테두리 끝, 양수: 박스 안쪽)
    float edgeDist = max(-d_uv, 0.0);

    // 3. 분석하신 '내부 전반사' 구간 매핑 (0 ~ 15px 구간)
    float reflectMask = step(0.0, edgeDist) * step(edgeDist, 5.0);

    // x가 0일 때 35를, x가 15일 때 15를 바라보게 만드는 1차 방정식 (뒤집힌 반사)
    float targetDist = 15.0 - (10.0 / 5.0) * edgeDist;

    // 현재 위치(edgeDist)에서 목표 위치(targetDist)까지 더 안쪽으로 당겨와야 할 거리
    float pushDist = (targetDist - edgeDist) * reflectMask;

    vec2 pixelToUv = vec2(dFdx(screenUv.x), dFdy(screenUv.y));
    if (abs(pixelToUv.x) < 0.000001) pixelToUv.x = 1.0 / 1920.0;
    if (abs(pixelToUv.y) < 0.000001) pixelToUv.y = 1.0 / 1080.0;

    // grad가 바깥을 향하므로, -grad 방향(안쪽)으로 픽셀을 당겨옴
    vec2 distortOffset = -grad * pushDist * pixelToUv;

    // 최종 UV에 적용
    resultUv = screenUv + distortOffset; 
  `,

  colorModifier: /* glsl */ `
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

      float edgeReflection = smoothstep(-5.0, 0.0, d) * smoothstep(0.0, -5.0, d);
      float fresnel = pow(1.0 - max(dot(normal_c, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);

      finalColor.rgb += vec3(1.0) * (edgeReflection * 0.4 + fresnel * 0.5);
      finalColor.rgb = mix(finalColor.rgb, vec3(1.0, 1.0, 1.0), 0.2);
  `,
};

const traveler = document.querySelector("#box2") as HTMLElement;
traveler.dataset.mirageShader = JSON.stringify(shader);

const target = document.querySelector("#root") as HTMLElement;
// const container = document.querySelector("#space") as HTMLElement;

const mirageConifg: MirageConfig = {
  quality: "high",
  // mode: "duplicate",
  mode: "overlay",
  travelerClipArea: "50px",
  resizeDebounce: {
    delay: 200,
    onStart: () => {
      document.querySelector("canvas")!.style.display = "none";
      // (document.querySelector("#loading") as HTMLElement).style.display = "flex";
    },
    onEnd: () => {
      document.querySelector("canvas")!.style.display = "block";
      // (document.querySelector("#loading") as HTMLElement).style.display = "none";
    },
  },
  // container: container,
  // filter: {
  //   excludeTree: ["exclude"],
  // },
};
const mirage = new Mirage(target, mirageConifg);
// console.log(mirageConifg.filter);

mirage.start();
// while (true) {
//   setTimeout(() => {
//     mirage.destroy();
//   }, 5000);
// }

// setTimeout(() => {
//   mirage.stop();
// }, 5000);

// function stopMirage() {
//   mirage.stop();
// }

// const testId = document.querySelector("#box2") as HTMLElement;

// // data attribute filtering test
// setTimeout(() => {
//   testId.style.backgroundColor = "purple";
//   testId.dataset.mirageFilter = "";
// } , 3000);
