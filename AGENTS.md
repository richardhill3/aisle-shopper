# AGENTS.md

## Project Type

This is an Expo React Native app using TypeScript, Expo Router, React Native core components, and Expo APIs.

The app architecture follows the pattern: screens live under `src/app`, reusable UI lives under `src/components`, persistence logic lives under `src/storage`, shared styles live under `src/styles`, and platform/service helpers live under `src/utils`.

## Non-Negotiable Rules

- Use TypeScript for all new code.
- Use function components only.
- Use Expo Router for navigation.
- Use React Native components, not HTML elements.
- Use `StyleSheet.create` for styles.
- Do not scatter hard-coded theme colors through the app.
- Do not access `AsyncStorage` directly from screens or UI components.
- Do not introduce global state unless the app has clearly outgrown prop-based state flow.
- Prefer simple, readable code over abstraction.

## Folder Conventions

Use this structure:

```txt
src/
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      create-list.tsx
      lists.tsx
  components/
    HomeHeader.tsx
    ListItem.tsx
  storage/
    lists.ts
  styles/
    global.ts
  utils/
    notifications.ts
```

````

## Navigation

The root layout owns the stack. The tab group owns tab navigation.

- `src/app/_layout.tsx` should render the `(tabs)` stack screen.
- `src/app/(tabs)/_layout.tsx` should define bottom tabs.
- File names define routes.
- Use `(tabs)` as a route group, not a visible route.
- Keep the root stack header hidden unless a screen specifically needs it.

Example:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
</Stack>
```

## Screen Rules

Screens should compose components and coordinate state.

Screens may:

- Load data.
- Own screen-level state.
- Pass data and callbacks to child components.
- Navigate after successful actions.

Screens should not:

- Contain large reusable UI blocks.
- Directly manipulate storage details.
- Duplicate logic if a component/helper already exists.

Use `useFocusEffect` with `useCallback` when a screen must refresh data whenever the user returns to it.

## Component Rules

Components should be small and purpose-specific.

Use this pattern:

```tsx
type ComponentNameProps = {
  value: string;
  onAction?: () => void;
};

export default function ComponentName({ value, onAction }: ComponentNameProps) {
  return null;
}
```

Rules:

- Define prop types above the component.
- Use default exports for components.
- Keep component-local styles in the same file.
- Use `globalStyles` only for shared layout/text patterns.
- Use `colors` from `src/styles/global.ts` for theme values.

## Styling

All shared colors and reusable styles belong in `src/styles/global.ts`.

Use:

```tsx
import { colors, globalStyles } from "@/styles/global";
```

Use local `StyleSheet.create` for styles that are only used by one component.

Avoid inline styles except for tiny one-off dynamic values, such as:

```tsx
<View style={[styles.card, { borderLeftColor: color }]} />
```

## Forms

Use controlled inputs.

- Store form input values as strings.
- Use `keyboardType="numeric"` for numeric fields.
- Validate before calling storage.
- Use `Alert.alert` for simple errors and success messages.
- Clear form state after successful submit.
- Navigate back to home with `router.push("/")`.

## UX Conventions

Use native-feeling controls:

- `TouchableOpacity` for buttons.
- `Alert.alert` for confirmations.
- Long press may be used for destructive item actions.
- Use destructive confirmation before deleting.
- Use haptics after successful add/delete actions where available.

## Expo APIs

Use Expo install commands for Expo packages:

```bash
npx expo install <package>
```

Use:

- `expo-haptics` for success feedback.
- React Native `Share` API for sharing.
- `expo-clipboard` for copy-summary actions.
- `expo-notifications` for local reminders.
- `AsyncStorage` for persisted local app data.

Notifications should be isolated in `src/utils/notifications.ts`.

Do not put notification scheduling logic directly inside UI components.

## Platform Notes

- iOS simulator requires macOS and Xcode.
- Android emulator requires Android Studio.
- Web is useful for layout testing, but native APIs may not behave the same.
- Test notifications and haptics on a physical device.

## Naming

Use PascalCase for components:

```txt
Item.tsx
ListItem.tsx
ReminderToggle.tsx
```

Use camelCase for functions:

```ts
getLists;
createList;
deleteList;
```

Use `Screen` suffix for screen component names:

```tsx
export default function AddListScreen() {}
export default function AllListsScreen() {}
```

## Imports

Prefer path aliases:

```tsx
import { colors, globalStyles } from "@/styles/global";
import { Meal, getMeals } from "@/storage/meals";
```

Use relative imports only for nearby sibling components when it improves clarity.

## When Adding New Features

Follow this order:

1. Add or update storage/helper functions first.
2. Add reusable components under `src/components`.
3. Compose the feature inside the relevant screen.
4. Keep state in the screen unless multiple unrelated screens require shared ownership.
5. Add styles locally unless they are clearly reusable.
6. Test on web plus at least one native target when native APIs are involved.

## Do Not Do This

- Do not create large monolithic screen files.
- Do not duplicate theme constants.
- Do not bypass storage handlers.
- Do not add Redux/Zustand/Context without a strong reason.
- Do not use web-only APIs.
- Do not use HTML tags.
- Do not introduce styling libraries unless explicitly requested.
- Do not hide business logic inside UI event handlers when it belongs in storage or utils.
````
