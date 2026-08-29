import base from "./base.js";
import nextVitals from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
export default [...base, ...nextVitals];
