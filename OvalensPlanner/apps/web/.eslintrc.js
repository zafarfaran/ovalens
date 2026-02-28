module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  plugins: ["@typescript-eslint"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
