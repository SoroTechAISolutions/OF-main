# 00 - PROJECT OVERVIEW

**Last Updated:** November 24, 2025
**Version:** 1.0

## Executive Summary

We are building an AI-powered chatting platform for OnlyFans agencies that automates fan communication while keeping human operators in control. This is a direct competitor to OnlyMonster with significant improvements in speed, intelligence, and usability.

**Contract Value:** $9,500 USD (MVP)
**Timeline:** ~10 weeks (accelerated from original plan)
**Delivery:** Working MVP tested with real models, ready to scale

## Business Context

### The Problem
- OF agencies manage multiple models
- Each model has dozens/hundreds of fans sending messages
- Manual chatting is time-consuming and expensive
- Current tools (OnlyMonster) are slow and clunky
- Operators need 2-3x faster tools to be profitable

### Our Solution
AI-powered platform that:
- Generates contextual, personalized responses instantly
- Learns each model's personality and style
- Prioritizes high-value fans (whales)
- Provides revenue optimization (PPV intelligence)
- Clean, fast, intuitive operator interface

### Key Benefits vs OnlyMonster
- ✅ 2-3x faster response times
- ✅ Smarter AI that learns model personality
- ✅ Better analytics for revenue optimization
- ✅ Cleaner, more intuitive interface
- ✅ PPV Intelligence (knows when to upsell)

## MVP Scope

### 1. AI Chatbot Engine
**Core Features:**
- AI-powered response generation (GPT-4 Turbo)
- Personality profiling for each model
- Context awareness (conversation history)
- PPV Intelligence (suggests paid content at right time)

**Tech:** OpenAI GPT-4 Turbo, LangChain, Pinecone vector DB

### 2. Operator Dashboard
**Interface:**
- WhatsApp-style chat inbox
- All OF chats in one place
- Priority queue (high-spenders first)
- Unread message counters

**One-Click AI:**
- Click fan message → AI generates 3-5 options
- Edit if needed → Send
- Response time tracking

**Fan Mini-CRM:**
- Spending history (tips, PPV, subscriptions)
- Custom notes per fan (content preferences)
- Operator notes
- Tags: "whale", "new", "ghosted", etc.
- Last interaction date

**Quick Actions:**
- Send PPV content (one click)
- Send free teaser
- Schedule follow-up
- Mark as VIP

**Design:** Clean, fast, mobile-responsive (desktop browsers)

### 3. OnlyFans Integration
**Options:**
- **Option A:** Chrome Extension (seamless, more complex)
- **Option B:** Manual Bridge (faster to build, requires copy-paste)

**Features:**
- Connect OF account (semi-automated for MVP)
- Sync messages every 30-60 seconds + manual refresh
- Send messages from dashboard → appears on OF
- Support text + image/video messages

**Safety:**
- No full automation that violates OF terms
- Always requires operator approval before sending
- Manual verification for sensitive actions

**Note:** For MVP we prioritize working reliably over full automation. Chrome extension can be upgraded in Phase 2 if needed.

### 4. Analytics & Reporting
**Revenue Tracking:**
- Tips received
- PPV sales
- Subscription revenue
- Per model and aggregate
- Total per day/week/month

**Operator Performance:**
- Messages sent per shift
- Average response time
- Revenue generated per operator
- Conversion rates (message → sale)

## Legal Structure (Post-MVP)

### Technology Ownership
**Intellectual Property:**
- Upon full payment ($9,500), client receives perpetual exclusive license
- License covers OnlyFans model agency operations only
- Client cannot: resell, sublicense, reverse-engineer, or use outside OF business
- Ivan retains rights to underlying libraries, frameworks, and methodologies

### Phase 2 Transition
- This agreement covers MVP development only
- After MVP delivery, parties may negotiate ongoing support
- If no ongoing arrangement, client retains license with no support obligations

### Confidentiality
- Both parties keep proprietary business information confidential
- Ivan will not disclose client's business strategies, model lists, revenue figures
- Client will not disclose Ivan's involvement in adult content industry
- Obligation survives termination

## Post-MVP Partnership Options

### VARIANT A: Tech-Only (CTO Role)
**Ivan's Responsibilities:**
- Platform development and maintenance
- Bug fixes and optimization
- New features
- System scaling
- Managing developers if needed

**Allen's Responsibilities:**
- Recruiting chatters
- Training operators
- Managing chatter performance
- Quality control
- Operator scheduling

**Compensation:**
- Monthly retainer: $4,000
- Revenue share: 5% of agency gross monthly revenue
- Work: ~40-60 hours/month

### VARIANT B: Tech + Operations (CTO + Head of Ops)
**Ivan's Additional Responsibilities:**
- Recruiting chatters
- Training & onboarding (1-2 weeks per person)
- Performance management
- Quality control
- Team coordination & scheduling
- Building team culture

**Allen's Focus:**
- Business growth (recruiting models, partnerships, sales)

**Compensation:**
- Monthly retainer: $6,000 ($4k tech + $2k ops)
- Revenue share: 8% of agency gross monthly revenue (5% tech + 3% ops)
- Work: ~80-100 hours/month

## Critical Success Factors

1. **Chrome Extension Reliability** - Must work consistently with OF without detection
2. **AI Quality** - Responses must be natural, engaging, and on-brand
3. **Speed** - Operators must be 2-3x faster than current tools
4. **Compliance** - Never violate OF Terms of Service
5. **Security** - Protect model data and fan information

## Key Stakeholders

- **Allen** - Client, Agency Owner, Business Driver
- **Ivan (SoroTech AI Solutions)** - Lead Developer, Technical Architect, Project Manager
- **Other Contractors** - AI models & face-swap for live calls (separate workstream, no integration required for MVP)

## Success Metrics (End of MVP)

1. ✅ Chrome Extension successfully reads/writes OF messages
2. ✅ AI generates 3-5 quality response options in < 3 seconds
3. ✅ Dashboard handles 10+ simultaneous chats smoothly
4. ✅ System tested with real model accounts
5. ✅ Allen approves for production use with first clients

## Next Steps

See `CURRENT-TASKS.md` for active development work.
