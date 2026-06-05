import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cleanops: {
          navy:   "#1C1917",   /* Advanced Charcoal (was blue-navy) */
          blue:   "#C8202E",   /* Advanced Red — primary action (was blue) */
          cyan:   "#D64A54",   /* Lighter Advanced Red — secondary accent */
          green:  "#15a85b",   /* status: healthy (unchanged) */
          amber:  "#f59e0b",   /* status: warning (unchanged) */
          red:    "#ef2d2d"    /* status: danger / error (unchanged) */
        }
      },
      borderRadius: {
        card: "8px"
      }
    }
  },
  plugins: []
};

export default config;
