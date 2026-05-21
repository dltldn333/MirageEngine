import { Mirage } from "@/index";
import { MirageConfig } from "@/types";

const target = document.querySelector("#root") as HTMLElement;
const container = document.querySelector("#space") as HTMLElement;

const mirageConifg: MirageConfig = {
  quality: "high",
  // mode: "duplicate",
  mode: "overlay",
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
