// AI Provider definitions
// 지원 제외: Ollama, AWS Bedrock, GitHub Copilot

import type { ProviderInfo } from '../types/config';

// 기본 표시 (온보딩 기본 보기)
export const BASIC_PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🟣',
    color: '#9B59B6',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', desc: '추천 - 균형잡힌 성능' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', desc: '빠르고 저렴' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', desc: '최고 성능' },
    ],
    keyPlaceholder: 'sk-ant-api03-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    color: '#10A37F',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', desc: '최신 멀티모달' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: '빠르고 저렴' },
      { id: 'o1', name: 'o1', desc: '추론 특화' },
      { id: 'o1-mini', name: 'o1-mini', desc: '빠른 추론' },
    ],
    keyPlaceholder: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'google',
    name: 'Google',
    icon: '🔵',
    color: '#4285F4',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: '빠른 응답' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: '긴 컨텍스트' },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', desc: '최신 프로 모델' },
    ],
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
];

// 더 많은 프로바이더 (더 보기 클릭 시)
export const ADDITIONAL_PROVIDERS: ProviderInfo[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    color: '#6366F1',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', desc: 'OpenAI 모델 경유' },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (via OpenRouter)', desc: 'Anthropic 모델 경유' },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', desc: 'Meta 오픈 모델' },
    ],
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    color: '#F97316',
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', desc: '빠른 오픈소스' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: '초경량 모델' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', desc: 'MoE 모델' },
    ],
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    icon: '🔷',
    color: '#FF7000',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', desc: '최고 성능' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', desc: '균형' },
      { id: 'mistral-small-latest', name: 'Mistral Small', desc: '빠르고 저렴' },
    ],
    keyPlaceholder: '...',
    keyUrl: 'https://console.mistral.ai/api-keys/',
  },
  {
    id: 'together',
    name: 'Together AI',
    icon: '🤝',
    color: '#0EA5E9',
    models: [
      { id: 'meta-llama/Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo', desc: '빠른 Llama' },
      { id: 'meta-llama/Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo', desc: '최대 Llama' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', desc: 'Alibaba 모델' },
    ],
    keyPlaceholder: '...',
    keyUrl: 'https://api.together.ai/settings/api-keys',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    icon: '🧠',
    color: '#00D4AA',
    models: [
      { id: 'llama3.1-70b', name: 'Llama 3.1 70B', desc: '초고속 추론' },
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B', desc: '경량 모델' },
    ],
    keyPlaceholder: 'csk-...',
    keyUrl: 'https://cloud.cerebras.ai/',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    icon: '✖️',
    color: '#000000',
    models: [
      { id: 'grok-2', name: 'Grok 2', desc: '최신 Grok' },
      { id: 'grok-2-mini', name: 'Grok 2 Mini', desc: '경량 버전' },
    ],
    keyPlaceholder: 'xai-...',
    keyUrl: 'https://console.x.ai/',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🔍',
    color: '#20B2AA',
    models: [
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large', desc: '검색 특화' },
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small', desc: '빠른 검색' },
    ],
    keyPlaceholder: 'pplx-...',
    keyUrl: 'https://www.perplexity.ai/settings/api',
  },
  {
    id: 'deepgram',
    name: 'Deepgram',
    icon: '🎤',
    color: '#13EF93',
    models: [
      { id: 'nova-2', name: 'Nova 2', desc: '음성 인식' },
    ],
    keyPlaceholder: '...',
    keyUrl: 'https://console.deepgram.com/',
  },
  {
    id: 'voyage',
    name: 'Voyage',
    icon: '🚀',
    color: '#7C3AED',
    models: [
      { id: 'voyage-3', name: 'Voyage 3', desc: '임베딩 모델' },
      { id: 'voyage-3-lite', name: 'Voyage 3 Lite', desc: '경량 임베딩' },
    ],
    keyPlaceholder: 'pa-...',
    keyUrl: 'https://dash.voyageai.com/',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    icon: '🤖',
    color: '#8B5CF6',
    models: [
      { id: 'abab6.5s-chat', name: 'abab6.5s', desc: '고성능 모델' },
      { id: 'abab6-chat', name: 'abab6', desc: '범용 모델' },
    ],
    keyPlaceholder: 'eyJ...',
    keyUrl: 'https://api.minimax.chat/',
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    icon: '🌙',
    color: '#1E40AF',
    models: [
      { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', desc: '긴 컨텍스트' },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K', desc: '표준' },
    ],
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.moonshot.cn/',
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    icon: '☁️',
    color: '#FF6A00',
    models: [
      { id: 'qwen-max', name: 'Qwen Max', desc: '최고 성능' },
      { id: 'qwen-plus', name: 'Qwen Plus', desc: '균형' },
      { id: 'qwen-turbo', name: 'Qwen Turbo', desc: '빠른 응답' },
    ],
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://dashscope.console.aliyun.com/',
  },
  {
    id: 'venice',
    name: 'Venice AI',
    icon: '🏛️',
    color: '#DC2626',
    models: [
      { id: 'llama-3.1-405b', name: 'Llama 3.1 405B', desc: '프라이버시 중심' },
    ],
    keyPlaceholder: '...',
    keyUrl: 'https://venice.ai/',
  },
];

export const ALL_PROVIDERS = [...BASIC_PROVIDERS, ...ADDITIONAL_PROVIDERS];
