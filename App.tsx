import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeContext, useResolvedTheme } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemedApp />
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const theme = useResolvedTheme();
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}
