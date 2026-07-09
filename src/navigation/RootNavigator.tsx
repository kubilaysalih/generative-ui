// Native-stack navigator: Home + generated screens. Each Gen route renders a
// cached screen by id, so Back pops to an already-rendered tree instantly.

import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { GenScreen } from '../screens/GenScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ModelPickerScreen } from '../screens/ModelPickerScreen';
import type { RootStackParamList } from './types';
import { useTheme } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors } = useTheme();
  // Modals get no native "back" (iOS hides it in modal presentation), so we
  // supply an explicit close (X) button in the header that dismisses the sheet.
  const closeButton =
    (navigation: { goBack: () => void }) =>
    () => (
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={26} color={colors.text} />
      </Pressable>
    );
  const modalHeaderOptions = {
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.text },
    headerBackVisible: false,
  } as const;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Gen" component={GenScreen} />
      <Stack.Screen
        name="GenSheet"
        component={GenScreen}
        options={({ navigation }) => ({
          ...modalHeaderOptions,
          title: '',
          presentation: 'modal',
          gestureEnabled: true,
          headerLeft: closeButton(navigation),
        })}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...modalHeaderOptions,
          title: 'Settings',
          presentation: 'modal',
          headerLeft: closeButton(navigation),
        })}
      />
      <Stack.Screen
        name="ModelPicker"
        component={ModelPickerScreen}
        options={({ navigation }) => ({
          ...modalHeaderOptions,
          title: 'Choose a model',
          presentation: 'modal',
          headerLeft: closeButton(navigation),
        })}
      />
    </Stack.Navigator>
  );
}
