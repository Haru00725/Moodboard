const axios = require('axios');
const logger = require('../utils/logger');

const INFIP_BASE_URL = process.env.INFIP_BASE_URL || 'https://api.infip.pro/v1';
const INFIP_API_KEY = process.env.INFIP_API_KEY;
const INFIP_MODEL = process.env.INFIP_MODEL || 'img4';
const POLL_INTERVAL_MS = parseInt(process.env.INFIP_POLL_INTERVAL_MS) || 3000;
const MAX_RETRIES = parseInt(process.env.INFIP_MAX_RETRIES) || 5;
const POLL_TIMEOUT_MS = parseInt(process.env.INFIP_POLL_TIMEOUT_MS) || 120000;
const IMAGES_PER_STAGE = 4;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getBackoffMs = (attempt) => Math.min(1000 * 2 ** attempt, 30000);

const createAxiosInstance = () =>
  axios.create({
    baseURL: INFIP_BASE_URL,
    timeout: 60000,
    headers: {
      Authorization: `Bearer ${INFIP_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

// ------------------------------------------------------------------
// Core: Generate a single image via /images/generations
// ------------------------------------------------------------------

const requestGeneration = async (prompt, attempt = 0) => {
  const client = createAxiosInstance();

  const payload = {
    model: INFIP_MODEL,
    prompt,
    n: 1,
    aspect_ratio: 'square',
    response_format: 'url',
  };

  try {
    logger.debug('AI generation request', { prompt: prompt.slice(0, 120), model: INFIP_MODEL, attempt });

    const response = await client.post('/images/generations', payload);
    const { data } = response;

    if (data?.data?.[0]?.url) {
      logger.info('AI image generated', { url: data.data[0].url });
      return { immediate: true, url: data.data[0].url };
    }
    if (data?.poll_url) {
      return { immediate: false, poll_url: data.poll_url };
    }

    logger.warn('Unexpected generation response', { data: JSON.stringify(data).slice(0, 200) });
    throw new Error('Unexpected API response structure');
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail || err.response?.data?.message || '';

    if ([429, 500, 502, 503].includes(status) && attempt < MAX_RETRIES) {
      const backoff = getBackoffMs(attempt);
      logger.warn(`AI generation retry (status ${status}) in ${backoff}ms`, { attempt, detail });
      await sleep(backoff);
      return requestGeneration(prompt, attempt + 1);
    }

    logger.error('AI generation failed', { status, detail, message: err.message });

    throw Object.assign(
      new Error(`AI generation failed: ${detail || err.message}`),
      { code: status === 429 ? 'AI_RATE_LIMITED' : 'AI_SERVICE_ERROR' }
    );
  }
};

// ------------------------------------------------------------------
// Core: Poll until image is ready
// ------------------------------------------------------------------

const pollResult = async (pollUrl) => {
  const client = createAxiosInstance();
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let attempt = 0;

  while (Date.now() < deadline) {
    try {
      const response = await client.get(pollUrl);
      const result = response.data;

      if (result?.data?.[0]?.url) {
        return result.data[0].url;
      }
      await sleep(POLL_INTERVAL_MS);
      attempt++;
    } catch (err) {
      const status = err.response?.status;
      if ([429, 500, 502, 503].includes(status)) {
        await sleep(getBackoffMs(Math.min(attempt, 5)));
        attempt++;
        continue;
      }
      throw Object.assign(new Error('AI polling failed: ' + err.message), { code: 'AI_SERVICE_ERROR' });
    }
  }

  throw Object.assign(new Error('AI generation timed out'), { code: 'AI_TIMEOUT' });
};

// ------------------------------------------------------------------
// Public: Generate one image
// ------------------------------------------------------------------

const generateSingleImage = async (prompt) => {
  const result = await requestGeneration(prompt);
  return result.immediate ? result.url : await pollResult(result.poll_url);
};

// ------------------------------------------------------------------
// Public: Generate N images for a stage
// ------------------------------------------------------------------

const generateImages = async (prompt, count = IMAGES_PER_STAGE) => {
  logger.info('Generating stage images', { count, model: INFIP_MODEL, prompt: prompt.slice(0, 80) });

  const tasks = Array.from({ length: count }, (_, i) =>
    generateSingleImage(`${prompt} [variation ${i + 1}]`).catch((err) => {
      logger.error(`Image ${i + 1} failed`, { error: err.message });
      return null;
    })
  );

  const urls = (await Promise.all(tasks)).filter(Boolean);

  if (urls.length === 0) {
    throw Object.assign(new Error('All image generations failed'), { code: 'AI_SERVICE_ERROR' });
  }

  logger.info(`Generated ${urls.length}/${count} images`);
  return urls;
};

// ------------------------------------------------------------------
// Detailed Indian wedding function descriptions
// ------------------------------------------------------------------

const FUNCTION_DETAILS = {
  Haldi: 'Haldi ceremony — turmeric ritual with yellow/marigold color palette, brass urlis with turmeric paste and flowers, banana leaf decorations, marigold garlands, low wooden seating (chowkis), floral rangoli on the floor',
  Mehendi: 'Mehendi ceremony — vibrant colors, Rajasthani/Moroccan style cushion seating, low tables with mehndi cones, colorful drapes, hanging tassels, phulkari fabrics, hookah centerpieces, fairy lights',
  Sangeet: 'Sangeet night — dance party atmosphere, dramatic stage with LED lights, disco elements, sequin/glitter drapes, cocktail tables, DJ booth, colorful spotlights, dance floor with patterns',
  Shaadi: 'Indian wedding ceremony (Shaadi) — mandap/wedding altar with heavy floral decorations, fire pit (hawan kund), velvet and brocade drapes, traditional brass elements, garlands (varmala), phoolon ki chadar, seated arrangement for rituals',
  Reception: 'Wedding reception — grand formal setup, crystal chandeliers, round tables with luxurious centerpieces, stage/sweetheart table for the couple, LED backdrop with couple names, buffet/bar area, elegant dinnerware',
};

const THEME_DETAILS = {
  Royal: 'Royal/regal theme — rich jewel tones (deep red, emerald green, gold), heavy brocade and velvet fabrics, ornate gold frames, crystal chandeliers, large floral arrangements with roses and orchids, marble elements',
  Minimal: 'Minimal/modern theme — clean lines, white and neutral palette with subtle gold accents, monochrome florals (white roses, baby breath), glass/acrylic elements, geometric shapes, candle-heavy lighting, less-is-more approach',
  Boho: 'Bohemian theme — earthy tones, macrame hangings, pampas grass, dried flowers, wicker/rattan furniture, dreamcatchers, terracotta pots, fairy lights, natural wood elements, relaxed/free-flowing aesthetic',
  Traditional: 'Traditional Indian theme — bright vivid colors, temple-style gold pillars, traditional brass lamps, marigold and jasmine garlands, banana leaf and mango leaf decorations (torans), rangoli, silk drapes',
  Pastel: 'Pastel theme — soft dusty rose, blush pink, lavender, sage green, powder blue, peach floral arrangements, chiffon/organza drapes, delicate fairy lights, romantic and dreamy atmosphere',
  'Art Deco': 'Art Deco theme — geometric patterns, gold and black color scheme, mirrored surfaces, crystal beading, sequin table runners, feather centerpieces, 1920s glamour, metallic finishes',
};

const CELEBRATION_DETAILS = {
  Palace: 'Palace/heritage property venue — grand marble halls, high ornate ceilings, arched doorways, pillared corridors, large courtyard, opulent chandeliers, symmetrical architectural elements',
  Banquet: 'Banquet hall venue — large indoor hall, carpeted floors, controlled lighting, ceiling height for hanging decor, stage area, round/rectangular table setup, air-conditioned indoor space',
  OpenLawn: 'Open lawn/garden venue — lush green grass, open sky, natural trees as backdrop, string lights across the lawn, tented or canopy-covered sections, outdoor furniture, natural light during day',
  Resort: 'Resort/hotel venue — poolside or garden area, tropical or landscaped setting, covered verandas, modern architecture with traditional touches, well-lit pathways, water features',
  Beach: 'Beach venue — sandy shore, ocean backdrop, bamboo and driftwood elements, light flowing fabrics, seashell accents, tiki torches, sunset/sunrise ambiance, natural breezy feel',
  HeritageHaveli: 'Heritage haveli venue — traditional Rajasthani architecture, jharokha windows, courtyard setting, frescoed walls, ornate wooden doors, stone carvings, antique furniture, lanterns',
};

const TIME_DETAILS = {
  Daytime: 'Daytime setting — bright natural sunlight, shadows from outdoor structures, pastel-toned lighting, fresh flowers in full bloom, airy and open feel',
  Nighttime: 'Nighttime setting — dramatic artificial lighting, warm golden glow from fairy lights and candles, LED uplighting, spotlights on focal points, cozy intimate atmosphere',
  'Golden Hour': 'Golden hour setting — warm amber/orange sunlight, long soft shadows, backlit elements creating silhouettes, romantic warm glow on all surfaces, magical dreamy quality',
  Twilight: 'Twilight/dusk setting — purple-blue sky gradient, first stars visible, combination of remaining natural light and artificial warm lights, magical transition atmosphere',
};

// ------------------------------------------------------------------
// Public: Build a rich, selection-aware prompt for a stage
// ------------------------------------------------------------------

const buildStagePrompt = ({
  basePrompt,
  colorDirection,
  stage,
  functionType,
  theme,
  celebrationType,
  timeOfDay,
  venueDescription,
  decorDescription,
}) => {
  // Stage-specific context
  const stageContext = {
    entry: 'ENTRANCE / ARRIVAL AREA — the very first view guests see when arriving. Show the grand entry gate, welcome arch, pathway with flower arrangements, welcome signage, and entry decorations',
    lounge: 'LOUNGE / COCKTAIL AREA — relaxed seating area for guests before the main event. Show cocktail tables, comfortable seating arrangements, drinks station, ambient lighting, conversation nooks',
    dining: 'DINING HALL / RECEPTION AREA — where guests sit and dine. Show beautifully set dining tables with table runners, centerpieces, place settings, chairbacks with fabric/flowers, serving stations',
    bar: 'BAR / DRINKS STATION — dedicated beverages area. Show styled bar counter, back-bar display, signature drink stations, ice sculpture or drink wall, bar stools, menu boards',
    stage: 'MAIN STAGE / CEREMONY AREA — the central focal point. Show the main stage or mandap with elaborate backdrop, couple seating, floral columns, dramatic lighting, photo-worthy backdrop',
  };

  const parts = [];

  // Core instruction
  parts.push(`Generate a PHOTOREALISTIC interior decoration visualization for the ${stageContext[stage] || stage} of an Indian wedding event.`);

  // Function type (ceremony)
  if (functionType && FUNCTION_DETAILS[functionType]) {
    parts.push(`CEREMONY TYPE: ${FUNCTION_DETAILS[functionType]}.`);
  }

  // Theme
  if (theme && THEME_DETAILS[theme]) {
    parts.push(`DESIGN THEME: ${THEME_DETAILS[theme]}.`);
  }

  // Venue type
  if (celebrationType && CELEBRATION_DETAILS[celebrationType]) {
    parts.push(`VENUE TYPE: ${CELEBRATION_DETAILS[celebrationType]}.`);
  }

  // Time of day
  if (timeOfDay && TIME_DETAILS[timeOfDay]) {
    parts.push(`LIGHTING/TIME: ${TIME_DETAILS[timeOfDay]}.`);
  }

  // User's vibe description
  if (basePrompt) {
    parts.push(`USER'S VISION: "${basePrompt}".`);
  }

  // Color direction
  if (colorDirection) {
    parts.push(`COLOR PALETTE: ${colorDirection}.`);
  }

  // Venue reference context
  if (venueDescription) {
    parts.push(`VENUE REFERENCE: ${venueDescription}`);
  }

  // Decoration reference context
  if (decorDescription) {
    parts.push(`DECORATION REFERENCE: ${decorDescription}`);
  }

  // Quality instructions
  parts.push(
    'STYLE: Ultra-realistic interior decoration photography, magazine-quality editorial shot, professional event photography, shallow depth of field, warm inviting lighting. ' +
    'Show the complete decorated space with furniture, flowers, lighting, fabric, and all decor elements in place. Make it look like a real professionally decorated wedding event space.'
  );

  return parts.join('\n\n');
};

module.exports = {
  generateImages,
  generateSingleImage,
  pollResult,
  buildStagePrompt,
};
