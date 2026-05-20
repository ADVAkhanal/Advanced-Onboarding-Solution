import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cleanops: {
          navy: "#031224",
          blue: "#006ef5",
          cyan: "#00b7ff",
          green: "#15a85b",
          amber: "#f59e0b",
          red: "#ef2d2d"
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
