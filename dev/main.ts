import { Mirage } from "@/index";

const target = document.querySelector("#root") as HTMLElement;
// const container = document.querySelector("document.body") as HTMLElement;

// const mirage = new Mirage(target, container);
const mirage = new Mirage(target, {
  textQuality: "low",
  mode: "overlay",
});

mirage.start();

// setTimeout(() => {
//   mirage.stop();
// }, 5000);

function stopMirage() {
  mirage.stop();
}
