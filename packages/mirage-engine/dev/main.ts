import { Mirage } from "@/index";

const target = document.querySelector("#root") as HTMLElement;
const container = document.querySelector("#space") as HTMLElement;

const mirage = new Mirage(target, {
  textQuality: "high",
  mode: "duplicate",
  container: container,
});

mirage.start();

// setTimeout(() => {
//   mirage.stop();
// }, 5000);

// function stopMirage() {
//   mirage.stop();
// }
