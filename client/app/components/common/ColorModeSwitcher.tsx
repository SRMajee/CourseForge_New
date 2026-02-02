import { IconButton } from "@chakra-ui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";

export function ColorModeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 1. Wait for client-side hydration to avoid mismatch errors
  useEffect(() => {
    setMounted(true);
    setTheme("dark"); // Set default theme to light on mount
  }, []);

  if (!mounted) return null; // Or return a Skeleton/placeholder

  const isDark = theme === "dark";
  // console.log("Current theme:", theme);

  return (
    <IconButton
      aria-label="Toggle color mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      variant="ghost"
      colorPalette="gray" // v3 uses 'colorPalette' instead of 'colorScheme' often
      rounded="full"
    >
      {isDark ? <FaSun /> : <FaMoon />}
    </IconButton>
  );
}
