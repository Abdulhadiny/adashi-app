// eslint-config-next 16 ships native flat config, so we import the arrays
// directly (FlatCompat + the legacy validator crash on ESLint 9 + these plugins).
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: ["legacy/**", "apps/**", ".next/**", "node_modules/**"] },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
