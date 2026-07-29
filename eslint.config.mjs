import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** Next 16 removed `next lint`, so ESLint is configured and invoked directly. */
const config = [
  ...coreWebVitals,
  ...typescript,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
