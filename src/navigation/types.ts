// Route param types for the native stack. Each generated screen is one Gen
// route, identified by a screenId that points at its cached record.

export type RootStackParamList = {
  Home: undefined;
  Gen: { screenId: string };
  /** Same generated screen, presented as a modal sheet (present() primitive). */
  GenSheet: { screenId: string };
  Settings: undefined;
  ModelPicker: { provider: 'openrouter' | 'openai' | 'anthropic' };
};
