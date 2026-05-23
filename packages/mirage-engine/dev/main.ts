import { Mirage } from "@/index";
import { MirageConfig } from "@/types";

const target = document.querySelector("#root") as HTMLElement;
// const container = document.querySelector("#space") as HTMLElement;

const mirageConifg: MirageConfig = {
  quality: "high",
  // mode: "duplicate",
  mode: "overlay",
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
