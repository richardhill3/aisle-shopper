import { StyleSheet } from "react-native";

export type ColorPalette = {
  background: string;
  header: string;
  surface: string;
  primary: string;
  text: string;
  textSecondary: string;
  alert: string;
};

export const palettes = {
  default: {
    background: "#1a1a2e",
    header: "#242444",
    surface: "#2a2a4a",
    primary: "#4fc3f7",
    text: "#ffffff",
    textSecondary: "#a0a0b0",
    alert: "#ff5252",
  },
  fresh: {
    background: "#f5fbf8",
    header: "#dcefe6",
    surface: "#ffffff",
    primary: "#2f9e73",
    text: "#17332a",
    textSecondary: "#587268",
    alert: "#d94848",
  },
  market: {
    background: "#fff8ec",
    header: "#ffe4b8",
    surface: "#ffffff",
    primary: "#d97706",
    text: "#332414",
    textSecondary: "#7c654c",
    alert: "#c2410c",
  },
  slate: {
    background: "#f4f6fb",
    header: "#e3e8f2",
    surface: "#ffffff",
    primary: "#3b66c4",
    text: "#1d2433",
    textSecondary: "#667085",
    alert: "#d92d20",
  },
} satisfies Record<string, ColorPalette>;

export type ColorPaletteKey = keyof typeof palettes;

export const defaultPaletteKey: ColorPaletteKey = "default";

export const paletteLabels: Record<ColorPaletteKey, string> = {
  default: "Default",
  fresh: "Fresh",
  market: "Market",
  slate: "Slate",
};

export const colors = palettes[defaultPaletteKey];

export function createGlobalStyles(themeColors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
      paddingTop: 60,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: themeColors.text,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: themeColors.textSecondary,
      marginTop: 30,
      marginBottom: 16,
    },
    empty: {
      color: themeColors.textSecondary,
      fontSize: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 4,
      marginBottom: 30,
    },
    date: {
      fontSize: 14,
      color: themeColors.textSecondary,
    },
  });
}

export const globalStyles = createGlobalStyles(colors);
