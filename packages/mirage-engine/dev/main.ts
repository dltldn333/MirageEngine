import { Mirage } from "@/index";
import { MirageConfig } from "@/types";



const shader = {
  uvModifier: /* glsl */ `
    float thickness_uv = 25.0; 
    float index = 1.3; 
    float base_height = thickness_uv * 1.5;

    vec2 xRadii_uv = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r_uv = mix(xRadii_uv.y, xRadii_uv.x, step(0.0, p.y));
    float d_uv = sdRoundedBox(p, halfSize, r_uv);

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

    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 refract_vec = refract(incident, normal_uv, 1.0 / index);
    
    float denom = dot(vec3(0.0, 0.0, -1.0), refract_vec);
    float refract_length = (h + base_height) / max(denom, 0.001); 
    
    vec2 offsetPx = refract_vec.xy * refract_length;
    
    vec2 pixelToUv = vec2(dFdx(screenUv.x), dFdy(screenUv.y));
    if (abs(pixelToUv.x) < 0.000001) pixelToUv.x = 1.0 / 1920.0; // 안전 장치
    if (abs(pixelToUv.y) < 0.000001) pixelToUv.y = 1.0 / 1080.0; // 안전 장치
    
    vec2 distortOffset = offsetPx * pixelToUv;

    resultUv = screenUv - distortOffset; 
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

    vec3 tintColor = vec3(0.03, 0.03, 0.8); 
    float tintStrength = 0.3; // 틴트 강도 (0.1 ~ 0.3 사이 추천)
    finalColor.rgb = mix(finalColor.rgb, tintColor, tintStrength);

    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
    finalColor.rgb += noise * 0.01; // 노이즈 강도 (너무 강하면 지저분해짐)

    float fresnel = pow(1.0 - max(dot(normal_c, vec3(0.0, 0.0, 1.0)), 0.0), 4.0);
    
    float sharpEdge = smoothstep(-5.0, 0.0, d) * smoothstep(0.0, -5.0, d); 
    
    finalColor.rgb += vec3(1.0) * (sharpEdge * 0.6 + fresnel * 0.3);
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

