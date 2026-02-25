module.exports = {
  root: true,
  extends: ["@helio/config/eslint/react"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    webextensions: true,
  },
};
