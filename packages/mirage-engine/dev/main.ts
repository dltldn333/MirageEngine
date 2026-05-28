import { Mirage } from "@/index";
import { MirageConfig } from "@/types";

const shader = {
  uvModifier: /* glsl */ `
    vec2 xRadii_uv = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r_uv = mix(xRadii_uv.y, xRadii_uv.x, step(0.0, p.y));
    float d_uv = sdRoundedBox(p, halfSize, r_uv);

    float dx_uv = dFdx(d_uv);
    float dy_uv = dFdy(d_uv);
    if (abs(dx_uv) < 0.001 && abs(dy_uv) < 0.001) {
        vec2 fallbackDir = normalize(p);
        dx_uv = fallbackDir.x; dy_uv = fallbackDir.y;
    }
    vec2 grad = normalize(vec2(dx_uv, dy_uv)); 

    float edgeDist = max(-d_uv, 0.0);
    
    float bevelWidth = 7.0; // 만나는 지점
    float maxDepth = 15.0;  // 끝 지점

    // ==========================================================
    // 1. [붙여지는 부분: 0 ~ 7] 거울처럼 뒤집힌 반사 (곡선 적용)
    // ==========================================================
    float mask1 = step(0.0, edgeDist) * step(edgeDist, bevelWidth);
    float t1 = edgeDist / bevelWidth; // 0.0(끝점) ~ 1.0(만나는 지점)

    // [핵심] 비율을 곱하는 대신 3차 곡선(pow 3)을 사용합니다.
    // 끝점(0)에서는 변화율이 0이 되어 텍스처가 아주 넓게 펴지고, 
    // 만나는 지점(1)으로 갈수록 급격히 좁아집니다.
    float curve1 = 1.0 - pow(t1, 3.0); 

    // 곡선을 이용해 목표 위치를 15에서 7로 부드럽게 이동시킵니다.
    float target1 = bevelWidth + (maxDepth - bevelWidth) * curve1;
    float push1 = (target1 - edgeDist) * mask1;


    // ==========================================================
    // 2. [복사되는 부분: 7 ~ 15] 볼록 렌즈 굴절
    // ==========================================================
    float mask2 = step(bevelWidth, edgeDist) * step(edgeDist, maxDepth);
    float t2 = (edgeDist - bevelWidth) / (maxDepth - bevelWidth); // 0.0 ~ 1.0

    // 안쪽 영역도 끊기지 않게 2차 곡선으로 부드럽게 평면으로 가라앉힙니다.
    float curve2 = pow(1.0 - t2, 2.0); 
    
    // 2.5는 안쪽 렌즈의 왜곡 강도입니다. (조절 가능)
    float push2 = curve2 * 2.0 * mask2;


    // 양쪽 영역의 왜곡을 합산
    float pushDist = push1 + push2;

    vec2 pixelToUv = vec2(dFdx(screenUv.x), dFdy(screenUv.y));
    if (abs(pixelToUv.x) < 0.000001) pixelToUv.x = 1.0 / 1920.0;
    if (abs(pixelToUv.y) < 0.000001) pixelToUv.y = 1.0 / 1080.0;

    // grad가 바깥쪽을 향하므로, -grad를 곱해 "안쪽"으로 픽셀을 당겨옵니다.
    vec2 distortOffset = -grad * pushDist * pixelToUv;
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

      float edgeReflection = smoothstep(-1.0, 0.0, d) * smoothstep(0.0, -1.0, d);
      float fresnel = pow(1.0 - max(dot(normal_c, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
      finalColor.rgb = mix(finalColor.rgb, vec3(0.0, 0.0, 0.0), 0.2);
      
      finalColor.rgb += vec3(1.0) * (edgeReflection * 0.4 + fresnel * 0.5);

      // 텍스쳐의 투명도(0.0)와 유리의 투명도(1.0) 중 큰 값을 취해 빈 공간을 어두운 유리로 채웁니다.

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
