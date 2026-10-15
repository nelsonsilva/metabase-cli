import { defineCommandGroup } from "../group";

export default defineCommandGroup({
  name: "sandbox",
  description: "Read row and column security policies",
  subCommands: {
    list: () => import("./list").then((mod) => mod.default),
  },
});
