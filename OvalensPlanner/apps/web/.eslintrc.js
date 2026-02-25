module.exports = {
  root: true,
  extends: ["@helio/config/eslint/next"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
