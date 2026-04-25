import {
  ColorPaletteKey,
  createGlobalStyles,
  defaultPaletteKey,
  palettes,
} from "@/styles/global";
import { getSelectedPaletteKey, saveSelectedPaletteKey } from "@/storage/theme";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeContextValue = {
  colors: (typeof palettes)[ColorPaletteKey];
  globalStyles: ReturnType<typeof createGlobalStyles>;
  selectedPaletteKey: ColorPaletteKey;
  setSelectedPaletteKey: (paletteKey: ColorPaletteKey) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [selectedPaletteKey, setPaletteKey] =
    useState<ColorPaletteKey>(defaultPaletteKey);

  useEffect(() => {
    let isMounted = true;

    async function loadPalette() {
      const paletteKey = await getSelectedPaletteKey();

      if (isMounted) {
        setPaletteKey(paletteKey);
      }
    }

    loadPalette();

    return () => {
      isMounted = false;
    };
  }, []);

  const colors = palettes[selectedPaletteKey];
  const globalStyles = useMemo(() => createGlobalStyles(colors), [colors]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      globalStyles,
      selectedPaletteKey,
      setSelectedPaletteKey: async (paletteKey: ColorPaletteKey) => {
        await saveSelectedPaletteKey(paletteKey);
        setPaletteKey(paletteKey);
      },
    }),
    [colors, globalStyles, selectedPaletteKey],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return theme;
}
