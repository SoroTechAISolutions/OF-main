// ============================================
// Prompt Builder Service
// Builds dynamic system prompts from persona JSONs
// ============================================

import * as fs from 'fs';
import * as path from 'path';

// Persona interface matching our JSON structure
interface PersonaConfig {
  persona_id: string;
  name: string;
  description: string;
  archetype: string;
  tone: {
    primary: string;
    secondary: string[];
    energy: string;
    formality: string;
  };
  voice: {
    emoji_frequency: string;
    emoji_style: string[];
    punctuation_style: string;
    message_length: string;
    use_pet_names: boolean;
    pet_names: string[];
  };
  personality_traits: string[];
  conversation_rules: {
    messages_before_first_ppv: number;
    messages_between_ppv: number;
    price_escalation: number[];
    max_ppv_per_day: number;
  };
  enslavement_techniques: {
    primary: string[];
    examples: Record<string, string>;
  };
  message_templates: Record<string, string>;
  forbidden: {
    topics: string[];
    words: string[];
    behaviors: string[];
  };
}

// Cache for loaded personas
const personaCache: Map<string, PersonaConfig> = new Map();

// Path to personas directory
const PERSONAS_DIR = path.join(__dirname, '../../config/personas');

/**
 * Load persona config from JSON file
 */
export function loadPersona(personaId: string): PersonaConfig | null {
  // Check cache first
  if (personaCache.has(personaId)) {
    return personaCache.get(personaId)!;
  }

  const filePath = path.join(PERSONAS_DIR, `${personaId}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Persona file not found: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const persona = JSON.parse(content) as PersonaConfig;

    // Cache it
    personaCache.set(personaId, persona);

    return persona;
  } catch (error) {
    console.error(`Error loading persona ${personaId}:`, error);
    return null;
  }
}

/**
 * Get list of available personas
 */
export function getAvailablePersonas(): string[] {
  try {
    const files = fs.readdirSync(PERSONAS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

/**
 * Build system prompt from persona config
 */
export function buildSystemPrompt(
  persona: PersonaConfig,
  modelName?: string,
  customizations?: {
    additionalTraits?: string[];
    customRules?: string[];
  }
): string {
  const name = modelName || 'the creator';

  // Build personality section
  const traits = persona.personality_traits.join(', ');
  const tone = `${persona.tone.primary}, with ${persona.tone.secondary.join(', ')} undertones`;

  // Build emoji guidance
  const emojiGuidance = persona.voice.emoji_frequency === 'high'
    ? `Use emojis frequently (2-3 per message). Preferred: ${persona.voice.emoji_style.slice(0, 5).join(' ')}`
    : persona.voice.emoji_frequency === 'medium'
    ? `Use emojis moderately (1-2 per message). Preferred: ${persona.voice.emoji_style.slice(0, 5).join(' ')}`
    : `Use emojis sparingly (0-1 per message). Preferred: ${persona.voice.emoji_style.slice(0, 3).join(' ')}`;

  // Build pet names guidance
  const petNames = persona.voice.use_pet_names
    ? `Use pet names like: ${persona.voice.pet_names.slice(0, 4).join(', ')}`
    : 'Avoid using pet names';

  // Build forbidden topics
  const forbidden = persona.forbidden.topics.slice(0, 5).join(', ');
  const forbiddenWords = persona.forbidden.words.slice(0, 10).join(', ');

  // Build PPV guidance
  const ppvRules = `Wait at least ${persona.conversation_rules.messages_before_first_ppv} messages before mentioning PPV. Price range: $${persona.conversation_rules.price_escalation[0]}-$${persona.conversation_rules.price_escalation[3]}`;

  // Build enslavement techniques (subtle psychological hooks)
  const techniques = persona.enslavement_techniques.primary.join(', ');

  // Construct the full prompt
  const systemPrompt = `You are ${name}, a ${persona.archetype} persona on OnlyFans/Fanvue.

PERSONALITY:
- Core traits: ${traits}
- Tone: ${tone}
- Energy level: ${persona.tone.energy}
- Message style: ${persona.voice.message_length} messages, ${persona.voice.punctuation_style} punctuation

VOICE & STYLE:
- ${emojiGuidance}
- ${petNames}
- Be ${persona.tone.formality.replace('_', ' ')}

ENGAGEMENT TECHNIQUES:
- Use these psychological hooks naturally: ${techniques}
- Build emotional connection through personalization
- Remember details the fan shares and reference them later

SALES APPROACH:
- ${ppvRules}
- Never be pushy or desperate
- Frame content as exclusive and special

STRICT RULES:
- ALWAYS respond in English only (this is critical!)
- NEVER discuss: ${forbidden}
- NEVER use words like: ${forbiddenWords}
- NEVER break character or admit being AI
- NEVER share personal info (address, phone, real name)
- NEVER agree to meet in person
- Keep responses short (1-3 sentences unless deeper conversation needed)

${customizations?.customRules ? `CUSTOM RULES:\n- ${customizations.customRules.join('\n- ')}` : ''}

Remember: You're building a genuine-feeling connection while monetizing attention. Be authentic within your persona.`;

  return systemPrompt;
}

/**
 * Build prompt for specific persona by ID
 */
export function buildPromptForPersona(
  personaId: string,
  modelName?: string,
  customizations?: {
    additionalTraits?: string[];
    customRules?: string[];
  }
): string | null {
  const persona = loadPersona(personaId);

  if (!persona) {
    return null;
  }

  return buildSystemPrompt(persona, modelName, customizations);
}

/**
 * Get default fallback prompt (used when no persona specified)
 */
export function getDefaultPrompt(): string {
  return `You are a flirty OnlyFans creator chatting with a fan. Be playful, engaging, and encourage tips/PPV purchases. Keep responses short (1-3 sentences). Never break character. ALWAYS respond in English only.

STRICT RULES:
- ALWAYS respond in English only (this is critical!)
- NEVER discuss meeting in person, phone numbers, other platforms
- NEVER mention minors, violence, illegal activities
- NEVER break character or admit being AI
- Be warm but maintain mystery
- Tease content without being explicit in chat`;
}

/**
 * Clear persona cache (useful for hot-reloading)
 */
export function clearPersonaCache(): void {
  personaCache.clear();
}

/**
 * Get persona details for API response
 */
export function getPersonaDetails(personaId: string): {
  id: string;
  name: string;
  archetype: string;
  description: string;
  traits: string[];
} | null {
  const persona = loadPersona(personaId);

  if (!persona) {
    return null;
  }

  return {
    id: persona.persona_id,
    name: persona.name,
    archetype: persona.archetype,
    description: persona.description,
    traits: persona.personality_traits
  };
}
