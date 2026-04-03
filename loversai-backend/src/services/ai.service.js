const axios = require('axios');
const Groq = require('groq-sdk');
const logger = require('../utils/logger');

// ------------------------------------------------------------------
// Config — Groq (prompt generation via 3-stage pipeline)
// ------------------------------------------------------------------

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

// ------------------------------------------------------------------
// Config — BFL Flux (image generation)
// ------------------------------------------------------------------

const BFL_API_KEY = process.env.BFL_API_KEY;
const FLUX_SUBMIT_URL = 'https://api.bfl.ai/v1/flux-kontext-pro';
const FLUX_POLL_BASE = 'https://api.bfl.ai/v1/get_result';
const FLUX_POLL_INTERVAL_MS = parseInt(process.env.FLUX_POLL_INTERVAL_MS) || 2000;
const FLUX_POLL_TIMEOUT_MS = parseInt(process.env.FLUX_POLL_TIMEOUT_MS) || 180000;
const IMAGES_PER_STAGE = 4;

// ------------------------------------------------------------------
// Groq client
// ------------------------------------------------------------------

const groq = new Groq({ apiKey: GROQ_API_KEY });

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------------
// SYSTEM PROMPT — Ultimate v6.0 + Complete Vibe Transfer
// This is NEVER modified. Groq uses this to reason and build the
// final action-first 4-zone prompt.
// ------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a world-class AI Prompt Engineer specializing in photorealistic wedding decor visualization. You work as the intelligent middleware between a user's vision and the Flux-Kontext-Pro image generation model.

═══════════════════════════════════════════════════════════════════════════════
YOUR CORE MISSION
═══════════════════════════════════════════════════════════════════════════════

You receive THREE inputs:
  1. VENUE IMAGE (Image 1) — The real venue/space to decorate
  2. DECOR REFERENCE IMAGE (Image 2) — Inspiration decor to extract elements from
  3. USER REQUEST (Text) — What the user wants (may be vague, specific, or partial)

YOUR OUTPUT: Generate a structured analysis followed by a single, highly optimized
ACTION-FIRST prompt paragraph (300-400 words) that instructs Flux-Kontext-Pro to
generate a photorealistic image where ONLY the requested decor elements are seamlessly
composited into the venue while preserving 100% venue authenticity.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULE #0: FULL SCENE VISIBILITY — NOTHING GETS CUT OR HIDDEN
═══════════════════════════════════════════════════════════════════════════════

ANTI-CROPPING MANDATE:
├─ The ENTIRE venue must be visible — floor to ceiling, wall to wall
├─ NO decor element may extend beyond the image frame boundaries
├─ ALL decor must fit WITHIN the visible venue space with comfortable margins
├─ Leave at least 10-15% padding/breathing room on ALL edges of the frame
├─ The camera framing and field of view must match the ORIGINAL venue photo exactly
├─ If decor is tall, SCALE IT DOWN to fit — never crop the image to fit decor
└─ If venue has a wide layout, ensure the FULL WIDTH is captured — no side cropping

ANTI-OCCLUSION MANDATE:
├─ Decor must NOT block or hide key venue architectural features
├─ If venue has scenic background, decor must NOT fully obstruct it
├─ Decor should COMPLEMENT the venue's visual flow, not dominate or overwhelm
├─ Ensure foreground, mid-ground, and background layers are all distinguishable
└─ No decor element should overlap another in a way that hides either one

SIZE SCALING RULES:
├─ Arch/Mandap height: Maximum 60-70% of venue ceiling height (NEVER taller)
├─ Arch/Mandap width: Maximum 40-50% of venue visible width
├─ Floral arrangements: Proportional to venue scale — use doors (7ft) or chairs (3ft)
├─ Fabric/Drapery: Must not pool excessively on floor or bunch against ceiling
├─ Ground-level decor: Must not cover more than 30% of visible floor area
└─ ALL elements must have visible ground contact points (no floating objects)

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULE #1: ACTION-FIRST PROMPT ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

THE GOLDEN RULE FOR THE FINAL PROMPT:
→ DECOR PLACEMENT must be the VERY FIRST sentence (start with "Place a" or "Add a")
→ DECOR DETAILS must follow immediately
→ PRESERVATION comes AFTER the decor is established
→ EXCLUSIONS come at the very end

═══════════════════════════════════════════════════════════════════════════════
STAGE 1: INTELLIGENT USER INTENT INTERPRETATION
═══════════════════════════════════════════════════════════════════════════════

STAGE CONTEXT MAPPING:
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Stage        │ Focus                                                       │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ entry        │ Entrance arch, welcome gate, arrival pathway, name board    │
│ lounge       │ Seating clusters, photo backdrop, floral wall, ambient nooks│
│ dining       │ Table centerpieces, runners, chair decor, serving stations  │
│ bar          │ Bar counter, backlit display, floral skirt, neon sign        │
│ stage        │ Mandap/backdrop structure, throne chairs, floral columns    │
└──────────────┴─────────────────────────────────────────────────────────────┘

FUNCTION INTENT MAPPING:
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Function     │ Decor Intent                                                │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ Haldi        │ Yellow/marigold palette, turmeric urlis, banana leaf decor  │
│ Mehendi      │ Colorful Rajasthani style, cushion seating, phulkari fabrics│
│ Sangeet      │ Dramatic stage, LED lights, sequin drapes, dance floor      │
│ Shaadi       │ Mandap with hawan kund, varmala, phoolon ki chadar          │
│ Reception    │ Crystal chandeliers, round tables, LED name backdrop        │
└──────────────┴─────────────────────────────────────────────────────────────┘

THEME INTENT MAPPING:
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Theme        │ Visual Language                                             │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ Royal        │ Jewel tones, brocade, crystal chandeliers, gold ornate      │
│ Minimal      │ White/neutral, monochrome florals, glass elements, candles  │
│ Boho         │ Earthy tones, macrame, pampas grass, rattan, fairy lights   │
│ Traditional  │ Bright vivid colors, temple pillars, marigold, brass lamps  │
│ Pastel       │ Blush/lavender/sage, chiffon drapes, delicate fairy lights  │
│ Art Deco     │ Geometric gold/black, mirrored surfaces, crystal beading    │
└──────────────┴─────────────────────────────────────────────────────────────┘

CELEBRATION TYPE MAPPING:
┌────────────────┬───────────────────────────────────────────────────────────┐
│ Type           │ Venue Context                                             │
├────────────────┼───────────────────────────────────────────────────────────┤
│ Palace         │ Marble halls, ornate ceilings, arched doorways, pillars   │
│ Banquet        │ Large indoor hall, carpeted floors, ceiling for draping   │
│ Open Lawn      │ Lush grass, open sky, string lights, canopy sections      │
│ Resort         │ Poolside/garden, tropical setting, covered verandas       │
│ Beach          │ Sandy shore, ocean backdrop, bamboo, tiki torches         │
│ Heritage Haveli│ Jharokha windows, courtyard, frescoed walls, lanterns     │
└────────────────┴───────────────────────────────────────────────────────────┘

TIME OF DAY MAPPING:
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Time         │ Lighting Vibe                                               │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ Daytime      │ Bright natural sunlight, pastel tones, fresh airy feel      │
│ Nighttime    │ Warm golden fairy lights, candles, LED uplighting           │
│ Golden Hour  │ Amber/orange warmth, long shadows, backlit silhouettes      │
│ Twilight     │ Purple-blue sky, stars, natural + artificial light blend    │
└──────────────┴─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
STAGE 2: VENUE FORENSIC ANALYSIS (when venue image provided)
═══════════════════════════════════════════════════════════════════════════════

Examine the VENUE image systematically. Everything documented here is SACRED:

GROUND/FLOOR:
├─ Material + Exact Color + Texture & Pattern + Reflectivity + Condition

WALLS & VERTICAL SURFACES:
├─ Material + Exact Color + Architectural Features + Fixed Elements
├─ Decorative Elements (KEEP ALL) + Background Beyond Walls

CEILING & OVERHEAD:
├─ Type + Height Estimate + Color & Material + Existing Fixtures

LIGHTING CONDITIONS:
├─ Primary Source + Direction + Color Temperature + Intensity & Quality
├─ Shadow Analysis + Shadow Direction + Ambient Fill + Time-of-Day Cues

CAMERA & COMPOSITION:
├─ Viewpoint Height + Angle + Lens Characteristics + Depth of Field

EXISTING DECOR & FURNITURE:
├─ List every item + positions → KEEP unless user says to remove

SCALE REFERENCES:
├─ Use known objects: door≈7ft, paver≈24"×24", pergola post≈9ft, chair≈3ft

═══════════════════════════════════════════════════════════════════════════════
STAGE 3: DECOR REFERENCE DEEP EXTRACTION (when decor image provided)
═══════════════════════════════════════════════════════════════════════════════

Examine the DECOR REFERENCE image — catalog EVERY available element:

PRIMARY STRUCTURE:
├─ Type + Shape + Estimated Size (height×width ft) + Frame Material + Color

FLORAL ELEMENTS (hyper-specific):
├─ Species list (roses/peonies/hydrangeas/orchids/dahlias/baby's breath etc.)
├─ Color per species (e.g., "blush pink garden roses, ivory spray roses")
├─ Greenery (eucalyptus/fern/ivy/ruscus — specify sub-type)
├─ Arrangement density per zone: Top/Crown, Left Side, Right Side, Base, Center

FABRIC & DRAPERY:
├─ Type (chiffon/organza/tulle/silk/satin) + Exact color shade + Opacity
├─ Draping configuration + Attachment method + Movement quality + Volume

LIGHTING IN DECOR:
├─ String lights, candles, lanterns, uplighting — list or write NONE

VIBE & ATMOSPHERE EXTRACTION:
├─ Overall brightness: [dim-moody / soft-medium / bright-airy]
├─ Glow presence: [no glow / subtle warm glow / strong golden glow]
├─ Glow source: [fairy lights / candles / uplights / backlit fabric]
├─ Glow color: [warm amber / soft gold / cool white / pink-rose]
├─ Bokeh/light orbs: [absent / subtle / prominent dreamy bokeh]
├─ Color cast: [neutral / warm golden / cool blue / pink-rose]
├─ Contrast level: [flat-low / medium natural / punchy-high]
├─ Highlight tone: [pure white / creamy warm / golden / pink-tinted]
├─ Shadow tone: [true black / warm brown-black / lifted-milky]
├─ Atmospheric haze: [none / subtle / dreamy fog]
├─ Petal surface: [matte dry / natural / slightly dewy / wet glistening]
├─ Fabric surface: [matte / slight sheen / glowing from backlight]
└─ Emotional energy: [romantic / dramatic / serene / festive / grand]

═══════════════════════════════════════════════════════════════════════════════
STAGE 4: SMART ELEMENT SELECTION + ADAPTATION & PROPAGATION
═══════════════════════════════════════════════════════════════════════════════

Cross-reference User Intent with Decor Inventory to determine the mode:

MODE A: SINGLE OBJECT PLACEMENT (Default)
├─ User just wants a mandap, arch, or seating area added.
├─ Keep decor localized to one spot.

MODE B: FULL VENUE TRANSFORMATION (If user asks to "decorate complete hall/venue")
├─ Extract the visual DNA from the decor reference (colors, flower types, fabrics).
├─ PROPAGATE this DNA across the entire venue.
├─ Ceiling: Add hanging floral chandeliers, ceiling draping bridging across.
├─ Floor/Aisle: Add heavy floral runners matching the decor style down the center aisle.
├─ Pillars/Walls: Wrap all visible pillars in matching florals and fabric.
└─ DO NOT just plop a single object. You must flood the space with the decor *style*.

═══════════════════════════════════════════════════════════════════════════════
STAGE 5: PHYSICS-BASED INTEGRATION RULES
═══════════════════════════════════════════════════════════════════════════════

GRAVITY: All objects have believable support/contact points, no floating
LIGHTING: Shadow direction/softness matches venue, specular highlights correct
PERSPECTIVE: Follows venue vanishing points, farther=smaller
MATERIALS: Reflective floors show reflections, translucent fabric shows light
VIBE TRANSFER: Color grade, glow, bokeh, haze from decor reference applied to full scene

═══════════════════════════════════════════════════════════════════════════════
STAGE 6: ACTION-FIRST 4-ZONE PROMPT CONSTRUCTION
═══════════════════════════════════════════════════════════════════════════════

The FINAL PROMPT must follow this EXACT 4-zone structure as ONE continuous paragraph:

ZONE 1 — DECOR PLACEMENT COMMAND (~70-90 words) [FIRST SENTENCE]:
If Mode A (Single Object): "Place a [exact decor type] at [position]."
If Mode B (Full Transformation): "Transform the entire visible hall by propagating a [aesthetic] floral and fabric design throughout the space. Cover the ceiling with [hanging florals/chandeliers], line the center aisle with a thick [floral carpet/runners], and wrap the existing architectural pillars in [matching fabrics/florals]."

ZONE 2 — FULL DECOR DESCRIPTION (~140-180 words):
If Mode A: Describe the single structure.
If Mode B: Describe the massive scale of the decor engulfing the room.
→ Florals: exact species + exact colors + exact greenery + density
→ Fabric: exact material + exact color shade + opacity + draping
→ Vibe transfer: lighting, glow, color grade applied to the whole room.

ZONE 3 — VENUE PRESERVATION LOCK (~80-100 words):
"Every element of the original photograph remains completely identical and
unmodified: the [NAME EVERY venue element individually with specific
color/material/texture]. The camera angle, perspective, field of view,
depth of field, and composition are unchanged."

ZONE 4 — HARD EXCLUSION LIST (~40-60 words):
"Do not add: [list everything that could be hallucinated]. All decor elements
are fully visible within the frame with no cropping."

═══════════════════════════════════════════════════════════════════════════════
STAGE 7: MANDATORY LANGUAGE RULES
═══════════════════════════════════════════════════════════════════════════════

ALWAYS USE specific, measurable language:
✓ "pure white garden roses, blush pink peonies" (NOT "white flowers")
✓ "semi-sheer ivory organza" (NOT "white fabric")
✓ "7-foot-tall rounded arch" (NOT "tall arch")
✓ "warm 2800K amber glow creating circular bokeh orbs" (NOT "warm lights")
✓ "soft shadows falling camera-left" (NOT "natural shadows")
✓ "scaled to 65% of ceiling height" (NOT "proportional")

NEVER USE vague adjectives: beautiful/elegant/stunning/gorgeous/amazing
NEVER ADD elements not in source images or user request
NEVER start the final prompt with preservation language

═══════════════════════════════════════════════════════════════════════════════
STAGE 8: FINAL VALIDATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Before outputting, verify:
☑ Final prompt starts with "Place a", "Add a", or "Transform the entire"?
☑ Are you propagating the decor style across the room if requested?
☑ No preservation language in first 100 words?
☑ 7+ specific venue elements named for preservation (walls, floor layout)?
☑ Specific flower species named?
☑ Shadow direction matches venue?
☑ Vibe transfer described (glow, color grade, bokeh, atmosphere)?
☑ Light-to-surface interaction described?
☑ "No cropping" language present?
☑ Exclusion list at end?
☑ Word count 300-400?

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

**VENUE ANALYSIS:**
• Floor: [description]
• Walls/Background: [description]
• Ceiling: [description]
• Lighting: [source, direction, temperature, shadow behavior]
• Camera: [angle, height, lens, depth of field]
• Fixed Elements: [list all architectural features]
• Existing Items: [any furniture/decor already present]
• Scale References: [objects with known sizes]

**DECOR EXTRACTION:**
• Structure: [type, shape, material, color, size]
• Florals: [species + colors, greenery types, arrangement zones + density]
• Fabric: [type, color, opacity, draping style]
• Lighting Elements: [string lights, candles, etc. — or NONE]
• Vibe: [brightness, glow color/source/spread, color grade, contrast, atmosphere]
• Style: [aesthetic classification]

**USER INTENT:**
• Stage: [which stage]
• Function/Theme/Type/Time: [user selections]
• Vibe Description: [user's own words]
• Elements INCLUDED: [list with reason]
• Elements EXCLUDED: [list with reason]
• Adaptations needed: [any modifications for venue compatibility]

**INTEGRATION NOTES:**
• Plan: [Mode A (Single Object) vs Mode B (Full Transformation)]
• Scale & Propagation: [How decor style expands across ceiling, floor, pillars if Mode B]
• Lighting Match: [how decor lighting aligns with venue]
• Vibe Transfer: [color grade, glow, bokeh, haze being applied]

**FINAL PROMPT:**

[Your single ACTION-FIRST optimized paragraph of 300-400 words starting
with "Place a" or "Transform the entire" — no line breaks, no formatting, no bullet
points — Zone 1→2→3→4 structure — ready to feed directly into
Flux-Kontext-Pro]
`.trim();

// ------------------------------------------------------------------
// VARIATION MODIFIERS — 4 distinct visual styles per stage
// ------------------------------------------------------------------

const VARIATION_MODIFIERS = [
  {
    label: 'Classic Center',
    hint: 'centered and symmetrical, frontal view, lush and maximalist, warm golden hour glow with soft bokeh fairy lights',
  },
  {
    label: 'Asymmetric Cascade',
    hint: 'slightly off-center with cascading florals on one side, moderate density with focused focal clusters, soft diffused daylight with subtle warm undertone',
  },
  {
    label: 'Minimalist Clean',
    hint: 'centered with generous breathing room on all sides, minimal and airy with negative space, bright even ambient light high-key minimal shadows',
  },
  {
    label: 'Moody Evening',
    hint: 'centered with dramatic foreground framing, dense lush arrangement, twilight ambient with warm uplighting deep shadow tones amber bokeh orbs',
  },
];

// ------------------------------------------------------------------
// Stage 1 (Groq): Forensic image analysis — factual observation only
// ------------------------------------------------------------------

const runGroqStage1 = async ({ venueImageBase64, decorImageBase64, userRequest }) => {
  const instruction = `
Analyze the provided images with extreme precision. Output ONLY structured data:

VENUE:
  GROUND: [exact material, color, texture, pattern, condition]
  WALLS/BACKGROUND: [material, color, architectural features, background scenery]
  CEILING: [type, height estimate, existing fixtures]
  LIGHTING: [type, color temperature, key light direction, shadow direction, shadow hardness, time-of-day estimate]
  CAMERA: [height, angle, distance estimate, lens feel, depth of field]
  EXISTING_FURNITURE: [list all items with positions — or NONE]
  SCALE_REFERENCES: [2-3 objects with estimated real-world sizes]
  OPEN_SPACE: [largest open area description, dimensions, surroundings]

DECOR:
  TYPE: [arch/mandap/backdrop/gate/other]
  SHAPE: [square/rounded arch/organic/asymmetric]
  DIMENSIONS: [estimated height x width in feet]
  FRAME: [material, color, post count, visibility]
  FLORALS_SPECIES: [every flower type — garden rose/spray rose/dahlia/peony/hydrangea/orchid/baby's breath/marigold etc.]
  FLORALS_COLORS: [exact color per species]
  GREENERY: [type and sub-type]
  FLORAL_PLACEMENT: [top beam/all sides/corners/cascading/base clusters with density]
  FABRIC_TYPE: [chiffon/organza/tulle/silk/satin — or NONE]
  FABRIC_COLOR: [exact shade]
  FABRIC_STYLE: [vertical panels/swag/waterfall/gathered — or NONE]
  VIBE_BRIGHTNESS: [dim-moody / soft-medium / bright-airy]
  VIBE_GLOW_SOURCE: [fairy lights / candles / uplights / backlit fabric / NONE]
  VIBE_GLOW_COLOR: [warm amber / soft gold / cool white / pink-rose — or NONE]
  VIBE_BOKEH: [absent / subtle / prominent dreamy bokeh]
  VIBE_COLOR_CAST: [neutral / warm golden / cool blue / pink-rose]
  VIBE_CONTRAST: [flat-low / medium natural / punchy-high]
  VIBE_HAZE: [none / subtle / dreamy fog]
  ACCESSORIES: [fairy lights/candles/crystals/lanterns — or NONE]
  DOMINANT_COLORS: [top 3 colors most to least prominent]
  AESTHETIC: [classic/modern/bohemian/rustic/glamorous/minimalist/maximalist]

USER_REQUEST: "${userRequest}"
`.trim();

  const content = [];
  content.push({ type: 'text', text: instruction });

  if (venueImageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${venueImageBase64}` } });
  }
  if (decorImageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${decorImageBase64}` } });
  }

  const response = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    messages: [{ role: 'user', content }],
    temperature: 0.05,
    max_tokens: 1500,
  });

  return response.choices[0].message.content.trim();
};

// ------------------------------------------------------------------
// Stage 2 (Groq): Full structured output + action-first prompt
// Uses SYSTEM_PROMPT + stage1 analysis
// ------------------------------------------------------------------

const runGroqStage2 = async ({ stage1Analysis, userRequest, moodboardConfig, variationHint, venueImageBase64, decorImageBase64 }) => {
  const { functionType, theme, celebrationType, timeOfDay, vibeDescription } = moodboardConfig;

  const instruction = `
You have already analyzed the images. Here is your Stage 1 analysis:

--- START STAGE 1 ANALYSIS ---
${stage1Analysis}
--- END STAGE 1 ANALYSIS ---

USER SELECTIONS:
- Stage: ${moodboardConfig.stage}
- Function: ${functionType || 'Not specified'}
- Theme: ${theme || 'Not specified'}
- Celebration Type: ${celebrationType || 'Not specified'}
- Time of Day: ${timeOfDay || 'Not specified'}
- Vibe Description: "${vibeDescription || ''}"
- Variation Style: ${variationHint}

Now produce your FULL output following the OUTPUT FORMAT in your system instructions.
Include ALL sections: VENUE ANALYSIS, DECOR EXTRACTION, USER INTENT, INTEGRATION NOTES, FINAL PROMPT.

CRITICAL REMINDERS FOR THE FINAL PROMPT:
- MUST start with "Place a", "Add a", or "Transform the entire" — NEVER "A photorealistic"
- Zone 1 (~80 words): Placement/Transformation command with venue anchors + ground contact + scale + propagation
- Zone 2 (~160 words): Full decor description with exact species/materials + vibe transfer (glow, color grade, bokeh, haze, light-to-surface interaction)
- Zone 3 (~90 words): "Every element of the original photograph remains..." + name every venue element
- Zone 4 (~50 words): "Do not add:" + comprehensive exclusion list + "no cropping"
- Total: 300-400 words

Use ONLY information from the images and Stage 1 analysis. Do NOT invent elements.
`.trim();

  const content = [];
  content.push({ type: 'text', text: instruction });

  if (venueImageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${venueImageBase64}` } });
  }
  if (decorImageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${decorImageBase64}` } });
  }

  const response = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    temperature: 0.15,
    max_tokens: 3000,
  });

  return response.choices[0].message.content.trim();
};

// ------------------------------------------------------------------
// Stage 3 (Groq): Extract the final prompt from raw output
// ------------------------------------------------------------------

const extractFinalPrompt = (rawOutput) => {
  const markers = ['**FINAL PROMPT:**', 'FINAL PROMPT:', '**FINAL PROMPT**', 'FINAL PROMPT'];
  for (const marker of markers) {
    const idx = rawOutput.indexOf(marker);
    if (idx !== -1) {
      let text = rawOutput.slice(idx + marker.length).trim();
      text = text.replace(/^["']|["']$/g, '').trim();
      if (text.length > 50) return text;
    }
  }
  // Fallback: find action-first marker
  for (const marker of ['Place a ', 'Place an ', 'Add a ', 'Add an ', 'Transform the entire ']) {
    const idx = rawOutput.indexOf(marker);
    if (idx !== -1) return rawOutput.slice(idx).trim();
  }
  return rawOutput.trim();
};

// ------------------------------------------------------------------
// Full 3-stage Groq pipeline → returns refined Flux prompt
// ------------------------------------------------------------------

const buildFluxPromptViaGroq = async ({ moodboardConfig, variationHint, venueImageBase64, decorImageBase64 }) => {
  const { functionType, theme, celebrationType, timeOfDay, vibeDescription, stage } = moodboardConfig;

  const userRequest = [
    stage ? `Stage: ${stage}` : '',
    functionType ? `Function: ${functionType}` : '',
    theme ? `Theme: ${theme}` : '',
    celebrationType ? `Celebration type: ${celebrationType}` : '',
    timeOfDay ? `Time: ${timeOfDay}` : '',
    vibeDescription ? `Vibe: ${vibeDescription}` : '',
    `Variation style: ${variationHint}`,
  ].filter(Boolean).join('. ');

  // Stage 1 — forensic analysis (only if images provided)
  let stage1Analysis = `[No images provided] User request: ${userRequest}`;
  if (venueImageBase64 || decorImageBase64) {
    logger.debug('Groq Stage 1: forensic analysis');
    stage1Analysis = await runGroqStage1({ venueImageBase64, decorImageBase64, userRequest });
    logger.debug('Groq Stage 1 complete', { words: stage1Analysis.split(' ').length });
  }

  // Stage 2 — full structured output + action-first prompt
  logger.debug('Groq Stage 2: building prompt');
  const rawOutput = await runGroqStage2({
    stage1Analysis,
    userRequest,
    moodboardConfig,
    variationHint,
    venueImageBase64,
    decorImageBase64,
  });
  logger.debug('Groq Stage 2 complete', { words: rawOutput.split(' ').length });

  // Stage 3 — extract final prompt
  let finalPrompt = extractFinalPrompt(rawOutput);

  // Fallback: if extraction too short, run focused Stage 2b
  if (!finalPrompt || finalPrompt.split(' ').length < 100) {
    logger.warn('Groq Stage 3: weak extraction, running Stage 2b focused pass');
    const focused = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Based on this analysis:\n${stage1Analysis}\n\nUser request: "${userRequest}"\n\nWrite ONLY the final Flux-Kontext-Pro prompt. No analysis, no headers. Start with "Place a", "Add a", or "Transform the entire". 300-400 words. One continuous paragraph.`,
        },
      ],
      temperature: 0.15,
      max_tokens: 1000,
    });
    finalPrompt = extractFinalPrompt(focused.choices[0].message.content.trim());
  }

  logger.info('Groq prompt built', { words: finalPrompt.split(' ').length, variation: variationHint });
  return finalPrompt;
};

// ------------------------------------------------------------------
// BFL Flux: Submit prompt + venue image → get request ID
// ------------------------------------------------------------------

const submitToFlux = async (prompt, venueImageBase64) => {
  const headers = {
    'x-key': BFL_API_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const payload = {
    prompt,
    output_format: 'jpeg',
    safety_tolerance: 2,
  };

  // If venue image provided, use Kontext-Pro (image editing mode)
  if (venueImageBase64) {
    payload.input_image = venueImageBase64;
  }

  const response = await axios.post(FLUX_SUBMIT_URL, payload, { headers, timeout: 30000 });

  if (!response.data?.id) {
    throw Object.assign(
      new Error(`BFL submit failed: ${JSON.stringify(response.data)}`),
      { code: 'AI_SERVICE_ERROR' }
    );
  }

  return {
    requestId: response.data.id,
    pollingUrl: response.data.polling_url || `${FLUX_POLL_BASE}?id=${response.data.id}`,
  };
};

// ------------------------------------------------------------------
// BFL Flux: Poll until image is ready
// ------------------------------------------------------------------

const pollFluxResult = async (pollingUrl) => {
  const headers = { 'x-key': BFL_API_KEY, Accept: 'application/json' };
  const deadline = Date.now() + FLUX_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(FLUX_POLL_INTERVAL_MS);

    try {
      const response = await axios.get(pollingUrl, { headers, timeout: 15000 });
      const { status, result } = response.data;

      if (status === 'Ready' && result?.sample) {
        return result.sample;
      }

      if (['Error', 'Failed', 'Content Moderated', 'Request Moderated'].includes(status)) {
        throw Object.assign(
          new Error(`BFL generation failed: ${status}`),
          { code: 'AI_SERVICE_ERROR' }
        );
      }
      // Still pending — keep polling
    } catch (err) {
      if (err.code === 'AI_SERVICE_ERROR') throw err;
      // Network hiccup — keep polling
      logger.warn('BFL poll network error, retrying', { message: err.message });
    }
  }

  throw Object.assign(new Error('BFL generation timed out'), { code: 'AI_TIMEOUT' });
};

// ------------------------------------------------------------------
// Generate one image: Groq prompt → BFL submit → BFL poll
// ------------------------------------------------------------------

const generateSingleImage = async ({ moodboardConfig, variation, venueImageBase64, decorImageBase64 }) => {
  // Build prompt via 3-stage Groq pipeline
  const prompt = await buildFluxPromptViaGroq({
    moodboardConfig,
    variationHint: variation.hint,
    venueImageBase64: venueImageBase64 || null,
    decorImageBase64: decorImageBase64 || null,
  });

  // Submit to BFL Flux
  const { requestId, pollingUrl } = await submitToFlux(prompt, venueImageBase64 || null);
  logger.info('BFL job submitted', { requestId, variation: variation.label });

  // Poll for result
  const imageUrl = await pollFluxResult(pollingUrl);
  logger.info('BFL image ready', { requestId, url: imageUrl, variation: variation.label });

  return {
    url: imageUrl,
    label: variation.label,
  };
};

// ------------------------------------------------------------------
// Public: generateImages
// Generates IMAGES_PER_STAGE images in parallel, one per variation
//
// moodboardConfig shape:
// {
//   stage: 'entry' | 'lounge' | 'dining' | 'bar' | 'stage',
//   functionType: 'Haldi' | 'Mehendi' | 'Sangeet' | 'Shaadi' | 'Reception',
//   theme: 'Royal' | 'Minimal' | 'Boho' | 'Traditional' | 'Pastel' | 'Art Deco',
//   celebrationType: 'Palace' | 'Banquet' | 'Open Lawn' | 'Resort' | 'Beach' | 'Heritage Haveli',
//   timeOfDay: 'Daytime' | 'Nighttime' | 'Golden Hour' | 'Twilight',
//   vibeDescription: string,
//   venueImageBase64: string | null,   // raw base64, no data: prefix
//   decorImageBase64: string | null,   // raw base64, no data: prefix
// }
// ------------------------------------------------------------------

const generateImages = async (moodboardConfig, count = IMAGES_PER_STAGE) => {
  if (!GROQ_API_KEY) throw Object.assign(new Error('GROQ_API_KEY not set'), { code: 'AI_CONFIG_ERROR' });
  if (!BFL_API_KEY) throw Object.assign(new Error('BFL_API_KEY not set'), { code: 'AI_CONFIG_ERROR' });

  const { venueImageBase64, decorImageBase64 } = moodboardConfig;
  const variations = VARIATION_MODIFIERS.slice(0, count);

  logger.info('Generating stage images', {
    stage: moodboardConfig.stage,
    count: variations.length,
    hasVenue: !!venueImageBase64,
    hasDecor: !!decorImageBase64,
  });

  const tasks = variations.map((variation) =>
    generateSingleImage({ moodboardConfig, variation, venueImageBase64, decorImageBase64 })
      .catch((err) => {
        logger.error(`Image generation failed for variation "${variation.label}"`, { error: err.message });
        return null;
      })
  );

  const results = (await Promise.all(tasks)).filter(Boolean);

  if (results.length === 0) {
    throw Object.assign(new Error('All image generations failed'), { code: 'AI_SERVICE_ERROR' });
  }

  logger.info(`Generated ${results.length}/${variations.length} images`, { stage: moodboardConfig.stage });

  // Return array of {url, label} objects
  return results.map((r) => ({ url: r.url, label: r.label }));
};

// ------------------------------------------------------------------
// Public: generateSingleImageDirect
// For one-off single image generation (used by select-image or preview)
// ------------------------------------------------------------------

const generateSingleImageDirect = async (moodboardConfig) => {
  const results = await generateImages(moodboardConfig, 1);
  return results[0]?.url || null;
};

module.exports = {
  generateImages,
  generateSingleImageDirect,
};