import AsyncStorage from "@react-native-async-storage/async-storage";

import { ColorPaletteKey, defaultPaletteKey, palettes } from "@/styles/global";

const selectedPaletteKey = "aisle-shopper:selected-palette";

export async function getSelectedPaletteKey(): Promise<ColorPaletteKey> {
  const value = await AsyncStorage.getItem(selectedPaletteKey);

  if (value && value in palettes) {
    return value as ColorPaletteKey;
  }

  return defaultPaletteKey;
}

export async function saveSelectedPaletteKey(
  paletteKey: ColorPaletteKey,
): Promise<void> {
  await AsyncStorage.setItem(selectedPaletteKey, paletteKey);
}
