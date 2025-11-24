# 05 - AI INTEGRATION STRATEGY

**Last Updated:** November 24, 2025

## Overview

AI is the core differentiator of our platform. We use GPT-4 Turbo to generate contextual, personalized responses that match each model's personality.

**Key Goals:**
1. Generate 3-5 response options in <3 seconds
2. Maintain consistent personality across conversations
3. Maximize conversion (message → PPV sale)
4. Learn from operator edits (future)

---

## AI Architecture

```
┌─────────────────────────────────────────────────────┐
│                 AI Service Layer                     │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  1. Receive Request                          │  │
│  │     - Current message                         │  │
│  │     - Fan ID                                  │  │
│  │     - Model ID                                │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  2. Load Context                             │  │
│  │     - Fetch last 20 messages from DB         │  │
│  │     - Fetch model personality profile        │  │
│  │     - Fetch fan spending tier & tags         │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  3. Semantic Search (Pinecone)               │  │
│  │     - Find similar past conversations        │  │
│  │     - Retrieve successful responses          │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  4. Build Prompt (LangChain)                 │  │
│  │     - System instructions                     │  │
│  │     - Personality injection                   │  │
│  │     - Conversation context                    │  │
│  │     - Fan profile                             │  │
│  │     - Current message                         │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  5. Call GPT-4 Turbo                         │  │
│  │     - Temperature: 0.7 (creative but stable) │  │
│  │     - Max tokens: 200 (short responses)      │  │
│  │     - Generate 3-5 options                    │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  6. Post-Process                             │  │
│  │     - Validate responses (no policy violations) │
│  │     - Rank by relevance                       │  │
│  │     - Add metadata (PPV suggestion flag)     │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  7. Return to Backend                        │  │
│  │     - Array of 3-5 response options          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Prompt Engineering

### System Prompt Template

```
You are an AI assistant helping an OnlyFans model named {MODEL_NAME} chat with fans.

MODEL PERSONALITY:
{PERSONALITY_PROFILE}

IMPORTANT RULES:
1. Respond as if YOU are {MODEL_NAME} (first person)
2. Keep responses under 200 characters (OF chat style)
3. Be flirty, engaging, and authentic
4. Match the model's tone, emoji usage, and writing style
5. NEVER mention you are an AI
6. Stay within OnlyFans content policy (no explicit content in messages)
7. When appropriate, suggest PPV content (see guidelines below)

FAN CONTEXT:
- Name: {FAN_NAME}
- Spending Tier: {SPENDING_TIER}
- Total Spent: ${TOTAL_SPENT}
- Tags: {FAN_TAGS}
- Notes: {OPERATOR_NOTES}

CONVERSATION HISTORY (last 10 messages):
{CONVERSATION_HISTORY}

CURRENT FAN MESSAGE:
"{FAN_MESSAGE}"

PPV SUGGESTION GUIDELINES:
- Only suggest PPV if fan is a Whale or Regular spender
- Only if conversation context is appropriate (fan is engaged)
- Be subtle, not pushy (e.g., "Just posted something special 🔥 wanna see?")
- If fan has bought PPV before, reference that ("You loved my last video, got another one for you 😘")

TASK:
Generate 3-5 response options. Each should:
1. Be under 200 characters
2. Match {MODEL_NAME}'s personality
3. Feel natural in the conversation flow
4. One option should include a PPV suggestion if appropriate

OUTPUT FORMAT (JSON):
{
  "responses": [
    {
      "text": "Response text here",
      "includes_ppv": false,
      "reasoning": "Why this response works"
    },
    ...
  ]
}
```

---

## Personality Profile Structure

Each model has a personality profile (stored as JSONB in PostgreSQL):

```json
{
  "model_id": "uuid",
  "model_name": "Emily Rose",
  "of_username": "@emilyrose",
  "personality": {
    "tone": "flirty, playful, witty",
    "emoji_usage": "frequent (🔥😘💕✨)",
    "writing_style": "casual, lowercase, short sentences",
    "signature_phrases": [
      "hey babe",
      "you're so sweet",
      "just for you"
    ],
    "topics_to_emphasize": [
      "fitness",
      "yoga",
      "travel"
    ],
    "topics_to_avoid": [
      "politics",
      "religion"
    ],
    "ppv_strategy": "subtle, casual mentions",
    "response_length": "short (20-50 words)"
  },
  "example_messages": [
    "hey babe! just finished my yoga session 🧘‍♀️ how's your day going?",
    "you're so sweet 😘 wanna see what i'm up to tonight?",
    "omg that's hilarious 😂 you always make me laugh"
  ],
  "created_at": "2025-11-24T00:00:00Z",
  "updated_at": "2025-11-24T00:00:00Z"
}
```

---

## Context Management

### Conversation History

**Problem:** GPT-4 Turbo has 128k token context, but long conversations are expensive and slow.

**Solution:** Use a sliding window approach

```javascript
const getConversationContext = async (fanId, modelId) => {
  // Fetch last 20 messages (enough for context, not too much)
  const messages = await db.messages.findMany({
    where: {
      fanId,
      modelId
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  // Format for prompt
  return messages.reverse().map(msg => ({
    role: msg.direction === 'incoming' ? 'fan' : 'model',
    content: msg.content,
    timestamp: msg.createdAt
  }));
};
```

### Semantic Memory (Pinecone)

**Goal:** Remember important context across long time periods

**Example:**
- Fan: "My dog just died"
- Model: "I'm so sorry to hear that 💔"
- *2 weeks later*
- Fan: "Hey"
- Model (with Pinecone): "Hey babe, how are you holding up? 💕" (remembers dog)

**Implementation:**

```javascript
const embedAndStore = async (fanId, modelId, message) => {
  // Generate embedding
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: message
  });

  // Store in Pinecone
  await pinecone.upsert({
    vectors: [{
      id: `${fanId}-${Date.now()}`,
      values: embedding.data[0].embedding,
      metadata: {
        fanId,
        modelId,
        message,
        timestamp: new Date().toISOString()
      }
    }]
  });
};

const retrieveRelevantContext = async (fanId, modelId, currentMessage) => {
  // Generate embedding for current message
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: currentMessage
  });

  // Search Pinecone for similar past conversations
  const results = await pinecone.query({
    vector: embedding.data[0].embedding,
    topK: 5,
    filter: { fanId, modelId }
  });

  return results.matches.map(match => match.metadata.message);
};
```

---

## PPV Intelligence

**Goal:** Detect when fan is likely to purchase, suggest appropriate PPV content

### Signals for PPV Opportunity

1. **Fan Engagement High**
   - Responding quickly (within 5 minutes)
   - Using flirty language/emojis
   - Asking about model's activities

2. **Spending Tier: Whale or Regular**
   - Has purchased PPV before
   - Sends tips frequently

3. **Conversation Flow**
   - Natural segue exists (e.g., "what are you up to?" → "just shot something special")
   - Not immediately after subscription renewal (too pushy)

4. **Time of Day**
   - Evening hours (fans more relaxed, likely to purchase)

### PPV Suggestion Strategy

**Subtle Examples:**
- "Just posted something special 🔥 check your DMs"
- "You loved my last video, made another one thinking of you 😘"
- "Feeling naughty tonight, wanna see? 😈"

**Aggressive (only for whales):**
- "Got a custom video for you, it's $50 but you'll love it 💕"

### Implementation

```javascript
const detectPPVOpportunity = (fanProfile, conversationHistory) => {
  const lastMessages = conversationHistory.slice(-5);

  // Check engagement
  const fanResponses = lastMessages.filter(m => m.role === 'fan');
  const avgResponseTime = calculateAvgResponseTime(fanResponses);
  const isEngaged = avgResponseTime < 300; // 5 minutes

  // Check spending tier
  const isSpender = ['whale', 'regular'].includes(fanProfile.spendingTier);

  // Check recent PPV purchases
  const daysSinceLastPPV = daysSince(fanProfile.lastPpvPurchase);
  const notRecentlyPurchased = daysSinceLastPPV > 3;

  // Suggest PPV if conditions met
  return isEngaged && isSpender && notRecentlyPurchased;
};
```

---

## Response Ranking

**Goal:** Present best responses first

### Ranking Criteria

1. **Relevance** (35%)
   - Does it directly address fan's message?
   - Is it contextually appropriate?

2. **Personality Match** (25%)
   - Does it sound like the model?
   - Uses signature phrases/emojis?

3. **Engagement Potential** (20%)
   - Likely to keep conversation going?
   - Asks a question or creates intrigue?

4. **Conversion Potential** (20%)
   - Leads toward PPV sale?
   - Appropriate for fan's spending tier?

### Implementation

```javascript
const rankResponses = (responses, fanProfile, modelPersonality) => {
  return responses.map(response => {
    const relevance = calculateRelevance(response);
    const personalityMatch = calculatePersonalityMatch(response, modelPersonality);
    const engagement = calculateEngagement(response);
    const conversion = calculateConversion(response, fanProfile);

    const score =
      relevance * 0.35 +
      personalityMatch * 0.25 +
      engagement * 0.20 +
      conversion * 0.20;

    return { ...response, score };
  }).sort((a, b) => b.score - a.score);
};
```

---

## Learning from Operator Edits (Future)

**Goal:** Improve AI over time by learning from operator's edits

### Data Collection

```javascript
const logOperatorEdit = async (aiResponse, operatorEdit, fanId, modelId) => {
  await db.aiLearning.create({
    data: {
      modelId,
      fanId,
      aiSuggestion: aiResponse,
      operatorEdit: operatorEdit,
      editDistance: calculateLevenshtein(aiResponse, operatorEdit),
      editType: classifyEdit(aiResponse, operatorEdit), // tone, length, content
      timestamp: new Date()
    }
  });
};
```

### Fine-Tuning (Phase 2)

After collecting 1000+ operator edits:
1. Export training data
2. Fine-tune GPT-4 on model-specific responses
3. Deploy fine-tuned model
4. Monitor improvement

---

## Error Handling

### OpenAI API Errors

```javascript
const generateAIResponse = async (context) => {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: buildPrompt(context),
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0].message.content;

    } catch (error) {
      attempt++;

      if (error.status === 429) {
        // Rate limit - wait and retry
        await sleep(2000 * attempt);
      } else if (error.status === 500) {
        // OpenAI server error - retry
        await sleep(1000);
      } else {
        // Other error - log and return fallback
        console.error('OpenAI error:', error);
        return getFallbackResponse(context);
      }
    }
  }

  // All retries failed
  return getFallbackResponse(context);
};

const getFallbackResponse = (context) => {
  // Generic responses if AI fails
  return [
    { text: "Hey babe! 😘", includes_ppv: false },
    { text: "Miss you 💕", includes_ppv: false },
    { text: "How's your day going?", includes_ppv: false }
  ];
};
```

---

## Performance Optimization

### Caching

**Cache model personality profiles:**
```javascript
const getModelPersonality = async (modelId) => {
  const cacheKey = `personality:${modelId}`;

  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from DB
  const personality = await db.models.findUnique({
    where: { id: modelId },
    select: { personalityProfile: true }
  });

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(personality));

  return personality;
};
```

### Parallel Processing

```javascript
const generateSuggestions = async (fanId, modelId, message) => {
  // Fetch all context in parallel
  const [
    conversationHistory,
    modelPersonality,
    fanProfile,
    semanticContext
  ] = await Promise.all([
    getConversationHistory(fanId, modelId),
    getModelPersonality(modelId),
    getFanProfile(fanId),
    retrieveRelevantContext(fanId, modelId, message)
  ]);

  // Build prompt and call AI
  const prompt = buildPrompt({
    conversationHistory,
    modelPersonality,
    fanProfile,
    semanticContext,
    currentMessage: message
  });

  return await generateAIResponse(prompt);
};
```

---

## Cost Optimization

### Current Costs (see 02-TECH-STACK.md)

**GPT-4 Turbo:**
- Input: $0.01 per 1M tokens
- Output: $0.03 per 1M tokens
- **Estimated: ~$3-5/month for MVP**

### Optimization Strategies

1. **Reduce Context Window**
   - Only send last 20 messages (not full history)
   - Summarize old conversations (future)

2. **Cache Common Responses**
   - Generic greetings ("hey", "hi babe") → cached responses
   - No API call needed for simple messages

3. **Batch Requests (Future)**
   - Process multiple fan messages in one API call
   - Use GPT-4 Turbo batch API (50% discount)

---

## Content Policy Compliance

**OnlyFans Rules:**
- No explicit sexual content in messages (save for PPV)
- No harassment or hate speech
- No illegal content

**Implementation:**

```javascript
const validateResponse = (response) => {
  const forbiddenPatterns = [
    /\b(explicit word 1)\b/i,
    /\b(explicit word 2)\b/i,
    // ... more patterns
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(response)) {
      return { valid: false, reason: 'Content policy violation' };
    }
  }

  return { valid: true };
};

const filterResponses = (responses) => {
  return responses.filter(r => validateResponse(r.text).valid);
};
```

---

## Testing Strategy

### Unit Tests
- Prompt generation
- Response ranking
- PPV opportunity detection

### Integration Tests
- End-to-end AI flow
- Error handling
- Performance benchmarks (<3s response time)

### A/B Testing (Future)
- Test different prompt variations
- Measure conversion rates
- Optimize based on data

---

**Status:** Week 3 implementation
**Dependencies:** Backend API, PostgreSQL, OpenAI API key, Pinecone account
