import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#e3f2fd" },
          500: { value: "#2196f3" },
          600: { value: "#1e88e5" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Define semantic colors that adapt to the mode
        bg: {
          DEFAULT: {
            value: { base: "{colors.gray.50}", _dark: "{colors.gray.900}" },
          },
          panel: { value: { base: "white", _dark: "{colors.gray.800}" } },
        },
        fg: {
          DEFAULT: {
            value: { base: "{colors.gray.800}", _dark: "{colors.gray.100}" },
          },
          muted: {
            value: { base: "{colors.gray.600}", _dark: "{colors.gray.400}" },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
