/**
 * features/ai-studio/types.ts
 *
 * Public types for the Wolf Street AI House (5 creative workstations).
 */

export type AiStudioRole = 'coding' | 'image' | 'social' | 'company' | 'brand';

export interface AiStudioRoleConfig {
  title: string;
  starter: string;
  local: (prompt: string) => string;
}

export interface AiStudioState {
  role: AiStudioRole;
  baseUrl: string;
  apiKey: string;
  model: string;
  open: boolean;
}
