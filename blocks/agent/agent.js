import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import { addToCart } from '../../scripts/cart.js';
import { getMetadata } from '../../scripts/aem.js';
import {
  normalizeBlockConfigKey,
  transformRecipeImagePath,
  transformProductImagePath,
  getAlgoliaUserTokenFromCookie,
  fetchAlgoliaUserProfile,
} from '../../scripts/blocks-utils.js';

// ---------------------------------------------------------------------------
// Site-level defaults — used when the agent is loaded globally via
// loadAgent() and no /agent fragment page or metadata has been provided.
// ---------------------------------------------------------------------------
const AGENT_DEFAULTS = {
  appId: '0EXRPAXB56',
  apiKey: '4350d61521979144d2012720315f5fc6',
  indexName: 'SW-Groceries-PROD-US-EN-Recipes',
  agentId: '6311c8de-6df5-490e-8875-7dc96d96355c',
  // Add authKeyId and authSecretKey to enable per-user memory.
  // Obtain both from Agent Studio → Settings → User Authentication.
  authKeyId: '',
  authSecretKey: '',
  // Algolia analytics region for the Advanced Personalization API ('eu' or 'us').
  personalizationRegion: 'us',
};

const CONFIG_KEY_MAP = {
  appid: 'appId',
  apikey: 'apiKey',
  searchapikey: 'apiKey',
  indexname: 'indexName',
  agentid: 'agentId',
  authkeyid: 'authKeyId',
  authsecretkey: 'authSecretKey',
  personalizationregion: 'personalizationRegion',
};

const CONFIG_KEYS = new Set(Object.values(CONFIG_KEY_MAP));
const DEFAULT_AGENT_CONFIG = {
  appId: '',
  apiKey: '',
  indexName: '',
  agentId: '',
  authKeyId: '',
  authSecretKey: '',
  personalizationRegion: '',
};

/**
 * Builds a structured, actionable summary of a user's Algolia personalization
 * profile that the agent can directly translate into search parameters.
 *
 * Affinities with score >= 7 are treated as strong preferences and surfaced
 * as ready-to-use facet_filters. Lower-scored affinities become optionalFilters
 * with their score embedded so the agent can boost without hard-filtering.
 *
 * @param {Object} profile - User profile from the Advanced Personalization API
 * @returns {string} Formatted, actionable context string, or empty string if no data
 */
function buildUserContextSummary(profile) {
  if (!profile || !Array.isArray(profile.affinities) || profile.affinities.length === 0) {
    return '';
  }

  // Group and sort affinities by facet name
  const grouped = {};
  profile.affinities.forEach(({ name, value, score }) => {
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push({ value, score });
  });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => b.score - a.score));

  // Affinity scores are 1–20 (Algolia Advanced Personalization scale).
  // optionalFilters filter scores are 0–65,535 — a completely different system.
  // Normalize affinity scores onto a 0–1,000 range so the boost values are
  // meaningful and have clear separation (affinity 20 → filter score 1000,
  // affinity 1 → filter score 50).
  const AFFINITY_MAX = 20;
  const FILTER_SCORE_MAX = 1000;
  const FILTER_SCORE_MIN = 50;
  const normalizeScore = (s) => Math.round(
    FILTER_SCORE_MIN + ((s / AFFINITY_MAX) * (FILTER_SCORE_MAX - FILTER_SCORE_MIN)),
  );

  // Split dietary preferences at the affinity midpoint (10 / 20):
  // - score >= 10 → strong signal → apply as facet_filters (hard filter)
  // - score <  10 → weaker signal → apply as optionalFilters (soft boost)
  const dietaryAll = grouped.dietarypreferences || [];
  const hardDietary = dietaryAll.filter((a) => a.score >= 10).map((a) => a.value);
  const softDietary = dietaryAll.filter((a) => a.score < 10).map((a) => a.value);

  // Build facet_filters suggestion — one inner array per hard dietary requirement (AND logic)
  const facetFilters = hardDietary.map((v) => `["dietarypreferences:${v}"]`);

  // Build optionalFilters with correct OR/AND structure per Algolia filter scoring docs:
  //   https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/in-depth/filter-scoring
  //
  // - Multiple values for the SAME facet → nested inner array → OR'd
  //   (a recipe can only match one cuisine)
  //   e.g. [["cuisine:Italian<score=200>", "cuisine:Indian<score=200>"]]
  //
  // - Values from DIFFERENT facets → separate entries in outer array → AND'd
  //   (each adds to total score)
  //   e.g. [["cuisine:Italian<score=200>"], ["mealtype:Dinner<score=525>"]]
  //
  // - sumOrFiltersScores: true MUST be added to the search call so scores accumulate
  //   across facets rather than only the highest score winning (default behaviour).
  const optionalFilterFacets = ['cuisine', 'mealtype', 'course', 'level'];
  const optionalFilters = [];
  optionalFilterFacets.forEach((facet) => {
    const values = grouped[facet] || [];
    if (values.length === 0) return;
    // Group same-facet values into one inner array so Algolia OR's them
    const inner = values.map(({ value, score }) => `"${facet}:${value}<score=${normalizeScore(score)}>"`);
    optionalFilters.push(`[${inner.join(', ')}]`);
  });

  // Soft dietary prefs — group into one inner array (OR logic: match any soft pref)
  const softDietaryValues = (grouped.dietarypreferences || []).filter((a) => a.score < 10);
  if (softDietaryValues.length > 0) {
    const inner = softDietaryValues.map(({ value, score }) => `"dietarypreferences:${value}<score=${normalizeScore(score)}>"`);
    optionalFilters.push(`[${inner.join(', ')}]`);
  }

  // Build product optionalFilters from categories.lvl2 affinities.
  // The products index uses categories.lvl0/lvl1/lvl2 facets — not dietary prefs.
  const productOptionalFilters = [];
  ['categories.lvl2', 'categories.lvl1', 'categories.lvl0'].forEach((facet) => {
    const values = grouped[facet] || [];
    if (values.length === 0) return;
    const inner = values.map(({ value, score }) => `"${facet}:${value}<score=${normalizeScore(score)}>"`);
    productOptionalFilters.push(`[${inner.join(', ')}]`);
  });

  // Build human-readable affinity lines (all non-dietary facets)
  const recipeAffinityFacets = new Set(['dietarypreferences', 'cuisine', 'mealtype', 'course', 'level']);
  const productAffinityFacets = new Set(['categories.lvl0', 'categories.lvl1', 'categories.lvl2']);
  const otherAffinityLines = Object.entries(grouped)
    .filter(([name]) => !recipeAffinityFacets.has(name) && !productAffinityFacets.has(name))
    .map(([name, values]) => `  ${name}: ${values.map((v) => `${v.value} (score: ${v.score})`).join(', ')}`);

  const lines = [
    'USER PROFILE (from Algolia Advanced Personalization)',
    '',
    'DIETARY PREFERENCES',
    `  Strong (affinity ≥ 10/20 → hard filter, facetFilters): ${hardDietary.length ? hardDietary.join(', ') : 'none'}`,
    `  Soft   (affinity  < 10/20 → boosted,    optionalFilters): ${softDietary.length ? softDietary.join(', ') : 'none'}`,
    '  (affinity scores 1–20 normalized to filter scores 50–1000)',
    '',
    '── RECIPE INDEX SEARCH PARAMETERS (SW-Groceries-PROD-US-EN-Recipes) ──',
    `  facetFilters:       [${facetFilters.join(', ')}]`,
    `  optionalFilters:    [${optionalFilters.join(', ')}]`,
    '  sumOrFiltersScores: true',
    '',
    '── PRODUCT INDEX SEARCH PARAMETERS (SW_Groceries_Products) ──',
    `  optionalFilters:    [${productOptionalFilters.length ? productOptionalFilters.join(', ') : 'none'}]`,
    '  sumOrFiltersScores: true',
    '',
    'NOTE: facetFilters (hard dietary filters) apply to recipe searches only.',
    'Product searches use category optionalFilters to boost preferred product types.',
    'sumOrFiltersScores:true ensures scores accumulate across facet groups.',
    ...(otherAffinityLines.length ? ['', 'OTHER AFFINITIES', ...otherAffinityLines] : []),
  ];

  return lines.join('\n');
}

/**
 * Generates a signed HS256 JWT using the browser Web Crypto API.
 * The subject (`sub`) is the analytics userToken from the _ALGOLIA cookie so
 * memory is scoped per user. Falls back to a random UUID for first-time visitors.
 * @param {string} authKeyId - Algolia key ID (from Agent Studio → User Authentication)
 * @param {string} authSecretKey - Algolia secret key (sk-alg-...)
 * @returns {Promise<string>} Signed JWT
 */
async function generateSecureUserToken(authKeyId, authSecretKey) {
  const userId = getAlgoliaUserTokenFromCookie() || `anonymous-${crypto.randomUUID()}`;
  const b64url = (str) => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: authKeyId }));
  const payload = b64url(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + 24 * 3600,
  }));
  const signingInput = `${header}.${payload}`;
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(authSecretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${sigB64}`;
}

function getAgentConfig(block) {
  const config = { ...DEFAULT_AGENT_CONFIG };
  const rows = Array.from(block.children || []);

  rows.forEach((row) => {
    if ((row.children?.length || 0) < 2) return;
    const key = normalizeBlockConfigKey(row.children[0].textContent || '', CONFIG_KEY_MAP);
    if (!key || !CONFIG_KEYS.has(key)) return;
    const value = row.children[1].textContent?.trim() || '';
    if (value) config[key] = value;
  });

  return config;
}

/**
 * Checks whether a config object has all four required fields.
 * @param {object} cfg
 * @returns {boolean}
 */
function isValidConfig(cfg) {
  return !!(cfg && cfg.appId && cfg.apiKey && cfg.indexName && cfg.agentId);
}

/**
 * Reads agent config from Franklin page metadata tags.
 * Authors can add these to any page's Metadata block, or to the shared
 * head.html template so the agent is configured site-wide:
 *   algolia-app-id, algolia-api-key, algolia-index-name, algolia-agent-id
 * @returns {object|null}
 */
function getConfigFromMetadata() {
  const cfg = {
    appId: getMetadata('algolia-app-id'),
    apiKey: getMetadata('algolia-api-key'),
    indexName: getMetadata('algolia-index-name'),
    agentId: getMetadata('algolia-agent-id'),
    authKeyId: getMetadata('algolia-auth-key-id'),
    authSecretKey: getMetadata('algolia-auth-secret-key'),
    personalizationRegion: getMetadata('algolia-personalization-region'),
  };
  return isValidConfig(cfg) ? cfg : null;
}

/**
 * Fetches the agent config fragment at the given path without going through
 * the full loadFragment/decorateMain pipeline. This avoids recursion and any
 * side-effects from block decoration. Returns the parsed config, or null if
 * the fragment is unavailable or contains no recognisable agent config.
 * @param {string} path - Absolute path, e.g. '/agent'
 * @returns {Promise<object|null>}
 */
async function loadAgentFragment(path) {
  try {
    const cleanPath = path.replace(/(\.plain)?\.html$/, '');
    const resp = await fetch(`${cleanPath}.plain.html`);
    if (!resp.ok) return null;

    const temp = document.createElement('div');
    temp.innerHTML = await resp.text();

    const agentBlock = temp.querySelector('.agent');
    if (!agentBlock) return null;

    // Try key-value format first (preferred):
    //   <div><div>appId</div><div>0EXRPAXB56</div></div>
    const kvConfig = getAgentConfig(agentBlock);
    if (isValidConfig(kvConfig)) return kvConfig;

    // Fall back to positional format (value-only rows in declaration order:
    //   appId, apiKey, indexName, agentId):
    //   <div><div>0EXRPAXB56</div></div>
    const values = Array.from(agentBlock.children)
      .map((row) => row.children?.[0]?.textContent?.trim() || '');
    if (values.length >= 4 && values[0] && values[1] && values[2] && values[3]) {
      return {
        appId: values[0],
        apiKey: values[1],
        indexName: values[2],
        agentId: values[3],
      };
    }
  } catch {
    // Fragment unavailable — fall through to the next config source.
  }
  return null;
}

function isOnShopPage() {
  const { pathname } = window.location;
  return pathname === '/shop' || pathname === '/shop.html' || pathname.startsWith('/shop/');
}

function navigateToShopWithQuery(productName) {
  const url = `/shop.html?query=${encodeURIComponent(productName)}`;
  window.location.href = url;
}

function updateShopSearch(productName) {
  if (!window.searchInstance) return false;
  window.searchInstance.setUiState((prevUiState) => {
    const [indexName] = Object.keys(prevUiState);
    return {
      [indexName]: {
        ...prevUiState[indexName],
        query: productName,
        page: undefined,
      },
    };
  });
  const hitsEl = document.querySelector('#hits');
  if (hitsEl) hitsEl.scrollIntoView({ behavior: 'smooth' });
  return true;
}

export default async function decorate(block) {
  // Config resolution order (first valid source wins):
  //  1. /agent fragment page  — preferred for the loadAgent() global pattern
  //  2. Authored block rows   — for agent blocks placed directly on a page
  //  3. Page metadata tags    — algolia-app-id / algolia-api-key / algolia-index-name /
  //                             algolia-agent-id
  //  4. AGENT_DEFAULTS        — hardcoded site-level fallback at the top of this file
  const agentMeta = getMetadata('agent');
  const agentPath = agentMeta ? new URL(agentMeta, window.location).pathname : '/agent';

  let config = await loadAgentFragment(agentPath)
    || getAgentConfig(block)
    || getConfigFromMetadata()
    || AGENT_DEFAULTS;

  // Upgrade partial configs: fill missing keys from AGENT_DEFAULTS so we
  // always have a consistent shape, then validate.
  config = { ...AGENT_DEFAULTS, ...config };

  // Add agent class for CSS scoping
  block.classList.add('agent');

  const {
    appId,
    apiKey,
    indexName,
    agentId,
    authKeyId,
    authSecretKey,
    personalizationRegion,
  } = config;

  if (!appId || !apiKey || !indexName || !agentId) return;

  // Remove authored config rows before rendering widget UI.
  block.textContent = '';

  const searchClient = algoliasearch(
    appId,
    apiKey,
  );

  // Initialize InstantSearch
  // Note: Chat widget doesn't require a traditional index, but InstantSearch needs one
  // Using a placeholder index name
  const search = instantsearch({
    searchClient,
    insights: true,
    indexName,
  });

  // Fetch the Algolia user profile for personalization context.
  // The _ALGOLIA cookie provides the userToken that identifies the visitor.
  // The profile is resolved in parallel with other async setup work; a missing
  // or failed profile is silently ignored — the widget works without it.
  const userProfile = await fetchAlgoliaUserProfile(appId, apiKey, personalizationRegion);

  // Build the agent completions URL so we can use an explicit transport for
  // all modes — this lets us attach the user profile to every request body.
  const completionsApi = `https://${appId}.algolia.net/agent-studio/1/agents/${agentId}/completions?compatibilityMode=ai-sdk-5`;

  // Generate a secure user JWT client-side to scope memory per user.
  // Falls back to agentId-only mode (no memory) if auth keys are not configured.
  let chatConfig = { container: block, agentId };
  if (authKeyId && authSecretKey) {
    const secureUserToken = await generateSecureUserToken(authKeyId, authSecretKey);
    chatConfig = {
      container: block,
      transport: {
        api: completionsApi,
        headers: {
          'x-algolia-application-id': appId,
          'x-algolia-api-Key': apiKey,
          'x-algolia-secure-user-token': secureUserToken,
        },
        ...(userProfile ? { body: { userProfile } } : {}),
      },
    };
  } else if (userProfile) {
    // No per-user memory keys, but we still have a profile — use an explicit
    // transport so we can include the profile in every request body.
    chatConfig = {
      container: block,
      transport: {
        api: completionsApi,
        headers: {
          'x-algolia-application-id': appId,
          'x-algolia-api-Key': apiKey,
        },
        body: { userProfile },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Client-side MCP tool: get_user_profile
  //
  // Exposes the Algolia Advanced Personalization profile as a tool the agent
  // can call by name. Register a matching tool in Algolia Agent Studio with:
  //
  //   Name:        get_user_profile
  //   Type:        Client tool
  //   Description: Returns the current visitor's personalisation affinities
  //                (dietary preferences, cuisine, meal type, difficulty level,
  //                etc.) inferred from their browsing history. Call this tool
  //                whenever the user asks about their preferences or when you
  //                need to personalise recipe or product recommendations.
  //   Parameters:  none
  //
  // The handler uses the profile already fetched at page load for a fast
  // response, and falls back to a live fetch if needed.
  // ---------------------------------------------------------------------------
  let cachedProfile = userProfile;
  const tools = {
    get_user_profile: {
      onToolCall: async ({ addToolResult }) => {
        if (!cachedProfile) {
          cachedProfile = await fetchAlgoliaUserProfile(appId, apiKey, personalizationRegion);
        }
        if (!cachedProfile) {
          addToolResult({ output: 'No user profile is available for this visitor.' });
          return;
        }
        const summary = buildUserContextSummary(cachedProfile);
        addToolResult({ output: summary || 'User profile found but contains no affinities.' });
      },
    },
  };

  const chat = instantsearch.widgets.chat({
    ...chatConfig,
    tools,
    templates: {
      item: (hit, { html }) => {
        if (hit && hit.objectID) {
          const isRecipe = !hit.price || hit.price === undefined || hit.price === null;
          const imageUrl = isRecipe
            ? transformRecipeImagePath(hit.image)
            : transformProductImagePath(hit.image);

          const shopQueryUrl = `/shop.html?query=${encodeURIComponent(hit.name)}`;

          return html`
              <article class="ais-Carousel-hit">
                <div class="ais-Carousel-hit-image">
                  <img src="${imageUrl}" alt="${hit.name}" />
                </div>
                <h2 class="ais-Carousel-hit-title">
                  ${isRecipe ? html`
                    <a href="/products.html?pid=${hit.objectID}" class="ais-Carousel-hit-link">${hit.name}</a>
                  ` : html`
                    <a href="${shopQueryUrl}"
                       class="ais-Carousel-hit-link ais-Carousel-hit-ingredient-link"
                       data-product-name="${hit.name}">${hit.name}</a>
                  `}
                </h2>
                ${isRecipe ? html`
                  <button class="ais-Carousel-hit-get-ingredients" 
                          data-recipe-name="${hit.name}">
                    Get Ingredients
                  </button>
                ` : html`
                  <button class="ais-Carousel-hit-add-to-cart" 
                          data-product-id="${hit.objectID}"
                          data-product-name="${hit.name || ''}"
                          data-product-price="${hit.price || 0}"
                          data-product-description="${hit.description || hit.name || ''}"
                          data-product-image="${transformProductImagePath(hit.image) || ''}">
                    Add to cart
                  </button>
                `}
              </article>
            `;
        }
        return html``;
      },
    },
  });

  // Add Chat widget with container
  search.addWidgets([
    chat,
  ]);

  // Start the search
  search.start();

  // Function to add welcome message to chat
  function addWelcomeMessage() {
    const messagesContent = block.querySelector('.ais-ChatMessages-content');
    if (!messagesContent) return;

    // Check if there's already a welcome message to avoid duplicates
    const existingWelcome = messagesContent.querySelector('[data-welcome-message]');
    if (existingWelcome) return;

    // Check if there are any messages already (excluding loaders)
    const existingMessages = messagesContent.querySelectorAll('.ais-ChatMessage:not(.ais-ChatMessageLoader)');
    if (existingMessages.length > 0) return;

    // Create welcome message element
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'ais-ChatMessage ais-ChatMessage--left';
    welcomeMessage.setAttribute('data-role', 'assistant');
    welcomeMessage.setAttribute('data-welcome-message', 'true');

    welcomeMessage.innerHTML = `
      <div class="ais-ChatMessage-container">
        <div class="ais-ChatMessage-leading"></div>
        <div class="ais-ChatMessage-content">
          <div class="ais-ChatMessage-message">
            <p>👋 Welcome! I'm your shopping assistant. I can help you:</p>
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
              <li>Find products and recipes</li>
              <li>Get ingredient lists for recipes</li>
              <li>Answer questions about our products</li>
              <li>Help you with your shopping needs</li>
            </ul>
            <p style="margin-top: 0.5rem;">What can I help you find today?</p>
          </div>
        </div>
      </div>
    `;

    messagesContent.appendChild(welcomeMessage);

    // Scroll to bottom to show the welcome message
    const messagesScroll = block.querySelector('.ais-ChatMessages-scroll');
    if (messagesScroll) {
      messagesScroll.scrollTop = messagesScroll.scrollHeight;
    }
  }

  // Watch for chat opening and add welcome message
  let chatObserver = null;

  // Function to setup chat observer
  function setupChatObserver() {
    const chatContainer = block.querySelector('.ais-Chat-container');
    if (!chatContainer || chatObserver) return;

    // Use MutationObserver to detect when chat opens
    chatObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isOpen = chatContainer.classList.contains('ais-Chat-container--open');
          if (isOpen) {
            // Small delay to ensure chat is fully rendered
            setTimeout(() => {
              addWelcomeMessage();
            }, 300);
          }
        }
      });
    });

    chatObserver.observe(chatContainer, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  // Try to setup observer immediately, or wait for chat container to be created
  setupChatObserver();
  if (!chatObserver) {
    // If chat container doesn't exist yet, wait a bit and try again
    setTimeout(() => {
      setupChatObserver();
    }, 500);
  }

  // Listen for clear button clicks to add welcome message after clearing
  block.addEventListener('click', (event) => {
    const clearButton = event.target.closest('.ais-ChatHeader-clear');
    if (clearButton) {
      // Wait a bit for the clear to complete, then add welcome message
      setTimeout(() => {
        addWelcomeMessage();
      }, 300);
    }
  });

  // Handle ingredient (product) title link clicks — navigate to shop with query
  block.addEventListener('click', (event) => {
    const ingredientLink = event.target.closest('.ais-Carousel-hit-ingredient-link');
    if (!ingredientLink) return;

    const { productName } = ingredientLink.dataset;
    if (!productName) return;

    if (isOnShopPage()) {
      event.preventDefault();
      updateShopSearch(productName);
    } else {
      event.preventDefault();
      navigateToShopWithQuery(productName);
    }
  });

  // Handle "Get Ingredients" button clicks using event delegation
  block.addEventListener('click', (event) => {
    const button = event.target.closest('.ais-Carousel-hit-get-ingredients');
    if (button) {
      event.preventDefault();
      event.stopPropagation();

      const { recipeName } = button.dataset;
      if (recipeName) {
        // Ensure chat is open by clicking the toggle button if needed
        const chatContainer = block.querySelector('.ais-Chat-container');
        const chatToggle = block.querySelector('.ais-ChatToggleButton');

        if (chatContainer && !chatContainer.classList.contains('ais-Chat-container--open')) {
          if (chatToggle) {
            chatToggle.click();
          }
        }

        // Wait a bit for the chat to be fully rendered/opened if needed
        const sendMessage = () => {
          // Find the chat textarea/input and send the message
          const chatTextarea = block.querySelector('.ais-ChatPrompt-textarea');
          const chatPrompt = block.querySelector('.ais-ChatPrompt-body');

          if (chatTextarea) {
            // Set the message in the textarea
            chatTextarea.value = `Get ingredients for ${recipeName}`;

            // Trigger input event to ensure the widget recognizes the change
            chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Trigger change event as well
            chatTextarea.dispatchEvent(new Event('change', { bubbles: true }));

            // Find and click the send button or submit the form
            const sendButton = block.querySelector('.ais-ChatPrompt-actions button[type="submit"]')
                              || block.querySelector('.ais-ChatPrompt-actions button:not([disabled])');

            if (sendButton) {
              sendButton.click();
            } else {
              // Try to submit the form
              const form = chatTextarea.closest('form') || chatPrompt?.closest('form');
              if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              }
            }
          } else {
            // Retry after a short delay if textarea not found yet
            setTimeout(sendMessage, 100);
          }
        };

        setTimeout(sendMessage, 200);
      }
    }

    // Handle "Add to cart" button clicks
    const addToCartButton = event.target.closest('.ais-Carousel-hit-add-to-cart');
    if (addToCartButton) {
      event.preventDefault();
      event.stopPropagation();

      const productData = {
        objectID: addToCartButton.dataset.productId,
        name: addToCartButton.dataset.productName,
        price: parseFloat(addToCartButton.dataset.productPrice) || 0,
        description: addToCartButton.dataset.productDescription,
        image: addToCartButton.dataset.productImage,
      };

      const cartItem = addToCart(productData);
      if (cartItem) {
        // Visual feedback
        const originalText = addToCartButton.textContent;
        addToCartButton.textContent = 'Added!';
        addToCartButton.style.backgroundColor = '#00b207';

        setTimeout(() => {
          addToCartButton.textContent = originalText;
          addToCartButton.style.backgroundColor = '';
        }, 1000);
      }
    }
  });
}
