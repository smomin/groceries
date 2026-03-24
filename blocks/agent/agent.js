import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import '../../scripts/lib-instantsearch-chat.js';
import { addToCart } from '../../scripts/cart.js';
import { getMetadata } from '../../scripts/aem.js';
import {
  normalizeBlockConfigKey,
  transformRecipeImagePath,
  transformProductImagePath,
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
};

const CONFIG_KEY_MAP = {
  appid: 'appId',
  apikey: 'apiKey',
  searchapikey: 'apiKey',
  indexname: 'indexName',
  agentid: 'agentId',
};

const CONFIG_KEYS = new Set(Object.values(CONFIG_KEY_MAP));
const DEFAULT_AGENT_CONFIG = {
  appId: '',
  apiKey: '',
  indexName: '',
  agentId: '',
};

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

export default async function decorate(block) {
  // Config resolution order (first valid source wins):
  //  1. /agent fragment page  — preferred for the loadAgent() global pattern
  //  2. Authored block rows   — for agent blocks placed directly on a page
  //  3. Page metadata tags    — algolia-app-id / algolia-api-key / algolia-index-name / algolia-agent-id
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

  const chat = InstantSearchChat({
    container: block,
    agentId,
    templates: {
      item: (hit, { html }) => {
        if (hit && hit.objectID) {
          const isRecipe = !hit.price || hit.price === undefined || hit.price === null;
          const imageUrl = isRecipe
            ? transformRecipeImagePath(hit.image)
            : transformProductImagePath(hit.image);

          return html`
              <article class="ais-Carousel-hit">
                <div class="ais-Carousel-hit-image">
                  <img src="${imageUrl}" alt="${hit.name}" />
                </div>
                <h2 class="ais-Carousel-hit-title">
                  <a href="/products.html?pid=${hit.objectID}" class="ais-Carousel-hit-link">${hit.name}</a>
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
