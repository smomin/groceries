import '../../scripts/lib-algoliasearch.js';
import { createOptimizedPicture } from '../../scripts/aem.js';
import { addToCart, updateCartBadge } from '../../scripts/cart.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function getTextContent(htmlElement) {
  const textContent = htmlElement.textContent.trim();
  htmlElement.textContent = '';
  return textContent;
}

function getCredentials(htmlElement) {
  const appId = getTextContent(htmlElement.children[0]);
  const apiKey = getTextContent(htmlElement.children[1]);
  return { appId, apiKey };
}

function getIndexName(htmlElement) {
  const indexName = getTextContent(htmlElement.children[2]);
  return indexName;
}

function getProductId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('pid');
}

export default function decorate(block) {
  const productContainer = document.createElement('div');
  productContainer.className = 'product-container';
  productContainer.innerHTML = `
    <div class="product-loading">Loading product...</div>
    <div class="product-error" style="display: none;"></div>
    <div class="product-content" style="display: none;">
      <div class="product-image-wrapper">
        <picture class="product-image"></picture>
      </div>
      <div class="product-details">
        <h1 class="product-name"></h1>
        <div class="product-category"></div>
        <div class="product-brand"></div>
        <div class="product-description"></div>
        <div class="product-price-container">
          <span class="product-price"></span>
        </div>
        <div class="product-actions">
          <label for="product-qty" class="product-qty-label">QTY:</label>
          <input type="number" id="product-qty" class="product-qty-input" min="1" value="1" />
          <button class="product-add-to-cart-btn">
            <span class="cart-icon"></span>
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  `;
  block.textContent = '';
  block.appendChild(productContainer);

  const { appId, apiKey } = getCredentials(block);
  const indexName = getIndexName(block);
  const productId = getProductId();

  if (!productId) {
    const errorDiv = productContainer.querySelector('.product-error');
    const loadingDiv = productContainer.querySelector('.product-loading');
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Product ID (pid) parameter is required in the URL.';
    return;
  }

  if (!appId || !apiKey || !indexName) {
    const errorDiv = productContainer.querySelector('.product-error');
    const loadingDiv = productContainer.querySelector('.product-loading');
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Algolia credentials and index name are required.';
    return;
  }

  setTimeout(() => {
    const { algoliasearch } = window;
    const searchClient = algoliasearch(appId, apiKey);
    const index = searchClient.initIndex(indexName);

    index.getObject(productId)
      .then((product) => {
        const loadingDiv = productContainer.querySelector('.product-loading');
        const errorDiv = productContainer.querySelector('.product-error');
        const contentDiv = productContainer.querySelector('.product-content');

        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        contentDiv.style.display = 'grid';

        // Set product name
        const nameElement = productContainer.querySelector('.product-name');
        nameElement.textContent = product.name || 'Product';

        // Set product category
        const categoryElement = productContainer.querySelector('.product-category');
        if (product.categories && product.categories.lvl0) {
          categoryElement.textContent = product.categories.lvl0;
          categoryElement.style.display = 'block';
        } else {
          categoryElement.style.display = 'none';
        }

        // Set product brand
        const brandElement = productContainer.querySelector('.product-brand');
        if (product.brand) {
          brandElement.innerHTML = `<span class="vendor-label">By</span> <span style="color: #00b207;">${product.brand}</span>`;
          brandElement.style.display = 'block';
        } else {
          brandElement.style.display = 'none';
        }

        // Set product description
        const descriptionElement = productContainer.querySelector('.product-description');
        const description = product.description || product.name || 'No description available.';
        descriptionElement.textContent = description;

        // Set product price
        const priceElement = productContainer.querySelector('.product-price');
        const price = product.price || 0;
        priceElement.textContent = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(price);

        // Set product image
        const imageWrapper = productContainer.querySelector('.product-image-wrapper');
        const pictureElement = productContainer.querySelector('.product-image');
        if (product.image) {
          const img = document.createElement('img');
          img.src = product.image;
          img.alt = product.name || 'Product image';
          img.loading = 'eager';
          const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
          moveInstrumentation(img, optimizedPic.querySelector('img'));
          pictureElement.replaceWith(optimizedPic);
        } else {
          imageWrapper.style.display = 'none';
        }

        // Store product data for add to cart (use contentDiv reference)
        contentDiv.dataset.productId = product.objectID || productId;
        contentDiv.dataset.productName = product.name || 'Product';
        contentDiv.dataset.productPrice = price;
        contentDiv.dataset.productDescription = description;
        contentDiv.dataset.productImage = product.image || '';

        // Handle add to cart button click
        const addToCartBtn = productContainer.querySelector('.product-add-to-cart-btn');
        addToCartBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          const qtyInput = productContainer.querySelector('#product-qty');
          const quantity = parseInt(qtyInput.value, 10) || 1;

          const productData = {
            objectID: product.objectID || productId,
            name: product.name || 'Product',
            price: price,
            description: description,
            image: product.image || '',
          };

          const cartItem = addToCart(productData, quantity);
          if (cartItem) {
            // Visual feedback
            const originalHTML = addToCartBtn.innerHTML;
            const originalBgColor = addToCartBtn.style.backgroundColor;
            const originalColor = addToCartBtn.style.color;

            addToCartBtn.innerHTML = 'Added!';
            addToCartBtn.style.backgroundColor = '#00b207';
            addToCartBtn.style.color = '#ffffff';
            addToCartBtn.disabled = true;

            setTimeout(() => {
              addToCartBtn.innerHTML = originalHTML;
              addToCartBtn.style.backgroundColor = originalBgColor;
              addToCartBtn.style.color = originalColor;
              addToCartBtn.disabled = false;

              requestAnimationFrame(() => {
                updateCartBadge();
              });
            }, 1000);
          }
        });
      })
      .catch((error) => {
        const loadingDiv = productContainer.querySelector('.product-loading');
        const errorDiv = productContainer.querySelector('.product-error');
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = `Error loading product: ${error.message || 'Product not found'}`;
        // eslint-disable-next-line no-console
        console.error('Error fetching product:', error);
      });
  }, 500);
}

