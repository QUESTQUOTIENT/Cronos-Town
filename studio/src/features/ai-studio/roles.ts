/**
 * features/ai-studio/roles.ts — the 5 workstation configs (pure).
 *
 * Behavior-preserving port of `AI_STUDIO_ROLES` from index.html, including the
 * exact local-draft template copy for each of the 5 workstations.
 */
import type { AiStudioRole, AiStudioRoleConfig } from './types';

export const AI_STUDIO_ROLES: Record<AiStudioRole, AiStudioRoleConfig> = {
  coding: {
    title: 'CODING PC · APP + WEBSITE BUILDER',
    starter: 'Build a clear technical brief for a Cronos app or website.',
    local: (prompt) =>
      `CODING PLAN\n\nProject brief: ${prompt || 'a Cronos community app'}\n\n1. Define the user journey and wallet actions.\n2. Use chain ID 25 and same-origin RPC calls.\n3. Build a small responsive interface with loading and error states.\n4. Add contract tests before asking users to sign transactions.\n5. Ship a simple first version, then improve it from user feedback.`,
  },
  image: {
    title: 'IMAGE PC · ASSET + LOGO STUDIO',
    starter: 'Describe a logo, character, collection, or brand image.',
    local: (prompt) =>
      `IMAGE BRIEF\n\nSubject: ${prompt || 'a friendly Wolf Street logo'}\nStyle: crisp pixel-art, readable silhouette, transparent background\nPalette: three main colors plus one highlight\nDeliverables: square logo, transparent asset, small favicon, social banner\nCheck: make sure the design is recognizable at 32 × 32 pixels.`,
  },
  social: {
    title: 'SOCIAL PC · POST IDEA GENERATOR',
    starter: 'Describe the launch, update, or community moment you want to share.',
    local: (prompt) =>
      `SOCIAL POST IDEAS\n\n1. Teaser: ${prompt || 'Wolf Street is opening its next builder station'} — invite the community to follow the journey.\n2. Builder story: show the problem, the Cronos solution, and one clear benefit.\n3. Community question: ask holders and creators what they want to build next.\n\nKeep every post honest, useful, and easy to understand. Avoid promises of profit.`,
  },
  company: {
    title: 'COMPANY PC · BUILDING GUIDE',
    starter: 'Describe the company, product, or creator project you want to build.',
    local: (prompt) =>
      `COMPANY BUILD GUIDE\n\nProject: ${prompt || 'a Cronos creator company'}\n\n1. Write the one-sentence mission.\n2. Identify the first user and the problem you solve.\n3. Build one small product users can try this week.\n4. Track feedback, retention, costs, and safety.\n5. Create simple roles for product, engineering, design, and community.\n6. Grow only after the first version is useful.`,
  },
  brand: {
    title: 'BRAND PC · ASSET BRAND STRATEGY',
    starter: 'Describe the feeling and audience for your asset brand.',
    local: (prompt) =>
      `BRAND STARTER\n\nAudience: ${prompt || 'Cronos builders and collectors'}\n\nName direction: memorable, easy to say, and distinct.\nVisual language: choose one mascot, one shape language, and a small palette.\nVoice: friendly, specific, and transparent.\nAsset system: logo, avatar, banner, icon, character, and 32-pixel version.\nCommunity loop: publish progress, invite feedback, and credit collaborators.`,
  },
};

export const AI_STUDIO_ROLE_IDS: AiStudioRole[] = ['coding', 'image', 'social', 'company', 'brand'];

export function normalizeRole(role: string): AiStudioRole {
  return (AI_STUDIO_ROLE_IDS as string[]).includes(role) ? (role as AiStudioRole) : 'coding';
}
