import { Mirage } from "mirage-engine";
import { MirageConfig } from "mirage-engine";

const shader = {
  uvModifier: /* glsl */ `
    float textureZoom = 1.0;

    vec2 xRadii_uv = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r_uv = mix(xRadii_uv.y, xRadii_uv.x, step(0.0, p.y));
    float d_uv = sdRoundedBox(p, halfSize, r_uv);

    // 계단 현상 방지용 중앙 차분법 (유지)
    vec2 e = vec2(0.5, 0.0);
    float dx_uv = sdRoundedBox(p + e.xy, halfSize, r_uv) - sdRoundedBox(p - e.xy, halfSize, r_uv);
    float dy_uv = sdRoundedBox(p + e.yx, halfSize, r_uv) - sdRoundedBox(p - e.yx, halfSize, r_uv);
    vec2 grad = normalize(vec2(dx_uv, dy_uv)); 
    if (length(grad) < 0.001) grad = normalize(p);

    float edgeDist = max(-d_uv, 0.0);
    
    float bevelWidth = 20.0; 
    float maxDepth = 40.0;  

    // ==========================================================
    // 1. [붙여지는 부분: 0 ~ 7] 거울처럼 뒤집힌 반사
    // ==========================================================
    float mask1 = step(0.0, edgeDist) * step(edgeDist, bevelWidth);
    float t1 = edgeDist / bevelWidth; 

    // [핵심 해결] 곡선을 반대로 뒤집었습니다!
    // 가장자리(t1=0)에서 가파르게 이미지를 당겨와 넓게 퍼지게 만들고,
    // 만나는 지점(t1=1)으로 갈수록 완만해져서 자연스럽게 이어집니다.
    float curve1 = pow(1.0 - t1, 3.0); 

    float target1 = bevelWidth + (maxDepth - bevelWidth) * curve1;
    float push1 = ((target1 - edgeDist) + (t1 * 3.0)) * mask1;

    // ==========================================================
    // 2. [복사되는 부분: 7 ~ 15] 볼록 렌즈 굴절
    // ==========================================================
    float mask2 = step(bevelWidth, edgeDist) * step(edgeDist, maxDepth);
    float t2 = (edgeDist - bevelWidth) / (maxDepth - bevelWidth); 
    float curve2 = pow(1.0 - t2, 3.0); 
    float push2 = curve2 * 3.0 * mask2;

    float pushDist = push1 + push2;

    vec2 pixelToUv = vec2(dFdx(screenUv.x), dFdy(screenUv.y));
    if (abs(pixelToUv.x) < 0.000001) pixelToUv.x = 1.0 / 1920.0;
    if (abs(pixelToUv.y) < 0.000001) pixelToUv.y = 1.0 / 1080.0;

    // [Fix] 박스 중심(p=0)을 기준으로 줌 오프셋 계산
    // 1.0/textureZoom - 1.0 은 확대될수록 음수가 되어 중심 방향으로 UV를 당겨옵니다.
    vec2 zoomOffset = p * pixelToUv * (1.0 / textureZoom - 1.0);
    vec2 distortOffset = -grad * pushDist * pixelToUv;
    resultUv = screenUv + zoomOffset + distortOffset; 
  `,
  colorModifier: /* glsl */ `
      float thickness_c = 30.0;
      float dx_c = dFdx(d);
      float dy_c = dFdy(d);
      if (abs(dx_c) < 0.001 && abs(dy_c) < 0.001) {
          vec2 fallbackDir = normalize(p);
          dx_c = fallbackDir.x; dy_c = fallbackDir.y;
      }
      float n_cos_c = max(thickness_c + d, 0.0) / max(thickness_c, 0.001);
      float n_sin_c = sqrt(max(1.0 - n_cos_c * n_cos_c, 0.0));
      vec3 normal_c = normalize(vec3(dx_c * n_cos_c, dy_c * n_cos_c, n_sin_c));

      float edgeReflection = smoothstep(-1.5, 0.0, d) * smoothstep(0.0, -1.5, d);
      float fresnel = pow(1.0 - max(dot(normal_c, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);

      // 파이프라인에서 이미 합성된 색상 위에 유리 특유의 반사광과 프레넬 효과만 더해줍니다.
      finalColor.rgb += vec3(1.0) * (edgeReflection * 0.4 + fresnel * 0.5);
  `,
};

const traveler = document.querySelector("#box2") as HTMLElement;
const traveler2 = document.querySelector("#box-z") as HTMLElement;

traveler.dataset.mirageShader = JSON.stringify(shader);
traveler2.dataset.mirageShader = JSON.stringify(shader);


const target = document.querySelector("#root") as HTMLElement;
// const container = document.querySelector("#space") as HTMLElement;

const mirageConifg: MirageConfig = {
  quality: "high",
  // mode: "duplicate",
  mode: "overlay",
  travelerClipArea: "50px",
  // resizeDebounce: {
  //   delay: 200,
  //   onStart: () => {
  //     document.querySelector("canvas")!.style.display = "none";
  //     // (document.querySelector("#loading") as HTMLElement).style.display = "flex";
  //   },
  //   onEnd: () => {
  //     document.querySelector("canvas")!.style.display = "block";
  //     // (document.querySelector("#loading") as HTMLElement).style.display = "none";
  //   },
  // },
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

// const box2 = document.querySelector("#box2");

mirage.test();
