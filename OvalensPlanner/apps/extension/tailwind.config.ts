import type { Config } from "tailwindcss";
import preset from "@helio/config/tailwind/preset";

const config: Config = {
  presets: [preset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
