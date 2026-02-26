// moldClaw Configuration Types
// OpenClaw 공식 형식 준수

// Messenger types - includes all supported messengers
export type MessengerType = 'telegram' | 'discord' | 'whatsapp' | 'slack' | 'mattermost' | 'googlechat';
export type Messenger = MessengerType | null;

export type AIProvider = 
  | 'anthropic' | 'openai' | 'google' 
  | 'openrouter' | 'groq' | 'mistral' | 'together' | 'cerebras'
  | 'xai' | 'perplexity' | 'deepgram' | 'voyage'
  | 'minimax' | 'moonshot' | 'qwen' | 'venice';

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

export interface MessengerConfig {
  type: Messenger;
  token: string;
  dmPolicy: 'pairing' | 'allowlist' | 'open';
  allowFrom: string[];
  groupPolicy: 'allowlist' | 'open' | 'disabled';
  groupAllowFrom: string[];
  requireMention: boolean;
}

export interface GatewayConfig {
  port: number;
  bind: 'loopback' | 'lan' | 'tailnet' | 'auto';
  authMode: 'token' | 'password';
  token: string;
  password: string;
}

export interface IntegrationConfig {
  [key: string]: string;
}

export interface TTSConfig {
  enabled: boolean;
  provider: 'elevenlabs' | 'openai' | null;
  apiKey: string;
  voice?: string;
}

export interface GmailConfig {
  enabled: boolean;
  credentialsPath: string;
}

export interface FullConfig {
  model: ModelConfig | null;
  messenger: MessengerConfig;
  gateway: GatewayConfig;
  integrations: IntegrationConfig;
  tts?: TTSConfig;
  gmail?: GmailConfig;
}

// Onboarding state (변수로 저장, 파일 X)
export interface OnboardingState {
  currentStep: OnboardingStep;
  model: ModelConfig | null;
  messenger: MessengerConfig;
  isComplete: boolean;
}

export type OnboardingStep = 'model' | 'messenger' | 'messenger-connect' | 'summary';

// Settings page state
export type SettingsSection = 'general' | 'model' | 'messenger' | 'skills' | 'tools' | 'tts' | 'gmail' | 'browser';

export type SettingsMode = 'normal' | 'advanced';

// Dashboard state
export type GatewayStatus = 'checking' | 'starting' | 'running' | 'stopped' | 'error';

// App navigation state  
export type AppView = 
  | 'loading'
  | 'onboarding'
  | 'dashboard'
  | 'settings'
  | 'notifications'
  | 'files'
  | 'logs'
  | 'guide';

// Provider/Messenger definitions
export interface ProviderInfo {
  id: AIProvider;
  name: string;
  icon: string;
  iconSlug?: string;  // Simple Icons slug for @iconify/react
  iconColor?: string; // Brand color
  logo?: string;  // 실제 서비스 로고 URL (fallback)
  color: string;
  models: {
    id: string;
    name: string;
    desc: string;
  }[];
  keyPlaceholder: string;
  keyUrl: string;
}

export interface MessengerInfo {
  id: Messenger;
  name: string;
  icon: string;
  iconSlug?: string;  // Simple Icons slug for @iconify/react
  iconColor?: string; // Brand color
  logo?: string;  // 실제 서비스 로고 URL (fallback)
  desc: string;
  difficulty: 1 | 2 | 3;
  pros: string[];
  cons: string[];
  recommended?: boolean;
  needsToken: boolean;
  needsQr: boolean;
  tokenLabel?: string;
  tokenPlaceholder?: string;
  guideUrl?: string;
  guideSteps: string[];
  allowFromPlaceholder?: string;
  allowFromHelp?: string;
}

// Default configs
export const defaultMessengerConfig: MessengerConfig = {
  type: null,
  token: '',
  dmPolicy: 'pairing',
  allowFrom: [],
  groupPolicy: 'allowlist',
  groupAllowFrom: [],
  requireMention: true,
};

export const defaultGatewayConfig: GatewayConfig = {
  port: 18789,
  bind: 'loopback',
  authMode: 'token',
  token: '',
  password: '',
};

export const defaultFullConfig: FullConfig = {
  model: null,
  messenger: defaultMessengerConfig,
  gateway: defaultGatewayConfig,
  integrations: {},
};

export const defaultOnboardingState: OnboardingState = {
  currentStep: 'model',
  model: null,
  messenger: defaultMessengerConfig,
  isComplete: false,
};
