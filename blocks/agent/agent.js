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