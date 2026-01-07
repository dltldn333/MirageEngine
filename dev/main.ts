import { Mirage } from "@/index";

const engine = new Mirage("#root");

engine.start();

// setTimeout(() => {
//   engine.stop();
// }, 5000);
