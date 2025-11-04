import '../../scripts/lib-algoliasearch.js';
import '../../scripts/lib-instantsearch.js';
import '../../scripts/lib-instantsearch-chat.js';
import { addToCart } from '../../scripts/cart.js';

export default function decorate(block) {
  const searchClient = algoliasearch(
    "0EXRPAXB56",
    "4350d61521979144d2012720315f5fc6"
  );

  // Initialize InstantSearch
  // Note: Chat widget doesn't require a traditional index, but InstantSearch needs one
  // Using a placeholder index name
  const search = instantsearch({
    searchClient,
    insights: true,
    indexName: 'ag_products',
  });

  const chat = InstantSearchChat({
      container: block,
      agentId: "6311c8de-6df5-490e-8875-7dc96d96355c",
      templates: {
        item: (hit, { html, components }) => {
          if (hit && hit.objectID) {
            const isRecipe = !hit.price || hit.price === undefined || hit.price === null;
            
            return html`
              <article class="ais-Carousel-hit">
                <div class="ais-Carousel-hit-image">
                  <img src="${hit.image}" alt="${hit.name}" />
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
                          data-product-image="${hit.image || ''}">
                    Add to cart
                  </button>
                `}
              </article>
            `;
          }
        },
      },
    });

  // Add Chat widget with container
  search.addWidgets([
    chat
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
      attributeFilter: ['class']
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
      
      const recipeName = button.dataset.recipeName;
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
            const sendButton = block.querySelector('.ais-ChatPrompt-actions button[type="submit"]') ||
                              block.querySelector('.ais-ChatPrompt-actions button:not([disabled])');
            
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