import '../../scripts/lib-algoliasearch.js';
import { getTextContent, getCredentials, getIndexName, getObjectIdFromUrl, createAlgoliaClient, createImageElement, formatPrice, handleAddToCart, Carousel } from '../../scripts/blocks-utils.js';

// Helper functions
function getModel(htmlElement) {
  const model = getTextContent(htmlElement.children?.[3]);
  return model || 'looking-similar';
}

function getObjectId(htmlElement) {
  const objectId = getTextContent(htmlElement.children?.[4]);
  return objectId;
}

function getTitle(htmlElement) {
  const title = getTextContent(htmlElement.children?.[5]);
  return title || 'Recommended for You';
}

// Carousel State
let carousel;
const recommendSlides = [];

// Create individual product card
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'recommend-card';
  card.dataset.productId = product.objectID;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'recommend-card__image-wrapper';
  
  if (product.image) {
    const imgElement = createImageElement(product.image, product.name || 'Product', false, [{ width: '300' }]);
    imageWrapper.appendChild(imgElement);
  }

  const category = document.createElement('div');
  category.className = 'recommend-card__category';
  if (product.categories && product.categories.lvl0) {
    category.textContent = product.categories.lvl0;
  }

  const name = document.createElement('div');
  name.className = 'recommend-card__name';
  name.textContent = product.name || 'Product';

  const brand = document.createElement('div');
  brand.className = 'recommend-card__brand';
  if (product.brand) {
    brand.innerHTML = `<span class="vendor-label">By</span> <span style="color: #00b207;">${product.brand}</span>`;
  }

  const footer = document.createElement('div');
  footer.className = 'recommend-card__footer';

  // Check if this is a recipe (has steps field or no price field)
  const isRecipe = product.steps || product.price === undefined || product.price === null;

  if (isRecipe) {
    // For recipes: show "View Recipe" link
    const viewRecipeLink = document.createElement('a');
    viewRecipeLink.href = `/recipes.html?rid=${product.objectID}`;
    viewRecipeLink.className = 'recipe-view-btn';
    viewRecipeLink.innerHTML = '<span>View Recipe</span>';
    footer.appendChild(viewRecipeLink);
  } else {
    // For products: show price and add to cart button
    const priceContainer = document.createElement('div');
    priceContainer.className = 'price-container';
    const price = document.createElement('span');
    price.className = 'current-price';
    price.textContent = formatPrice(product.price);
    priceContainer.appendChild(price);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerHTML = '<span class="cart-icon"></span><span>Add</span>';
    addBtn.dataset.productId = product.objectID;
    addBtn.dataset.productName = product.name || 'Product';
    addBtn.dataset.productPrice = product.price || 0;
    addBtn.dataset.productDescription = product.description || product.name || '';
    addBtn.dataset.productImage = product.image || '';

    addBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const productData = {
        objectID: product.objectID,
        name: product.name || 'Product',
        price: product.price || 0,
        description: product.description || product.name || '',
        image: product.image || '',
      };

      handleAddToCart(addBtn, productData, 1);
    });

    footer.appendChild(priceContainer);
    footer.appendChild(addBtn);
  }

  card.appendChild(imageWrapper);
  card.appendChild(category);
  card.appendChild(name);
  if (product.brand) {
    card.appendChild(brand);
  }
  card.appendChild(footer);

  return card;
}

// Initialize carousel functionality
function initCarousel() {
  if (recommendSlides.length === 0) return;

  carousel = new Carousel({
    trackSelector: '.recommend-carousel-track',
    dotsSelector: '.recommend-carousel-dots',
    containerSelector: '.recommend-carousel-container',
    dotClass: 'recommend-carousel-dot',
    arrowClass: 'recommend-carousel-arrow',
    autoSlideInterval: 5000,
  });
  carousel.setSlides(recommendSlides);
  carousel.init();

  // Create navigation arrows after carousel is initialized
  const carouselContainer = document.querySelector('.recommend-carousel-container');
  const arrowsContainer = document.querySelector('.recommend-carousel-arrows');
  if (carouselContainer && arrowsContainer && recommendSlides.length > 1) {
    const prevArrow = carousel.createArrow('prev', -1);
    const nextArrow = carousel.createArrow('next', 1);
    arrowsContainer.appendChild(prevArrow);
    arrowsContainer.appendChild(nextArrow);
  }
}

// Fetch recommendations from Algolia Recommend API
async function fetchRecommendations(searchClient, appId, apiKey, indexName, model, objectId, fallbackIndexName) {
  try {
    const requests = [];

    // Build request based on model type
    if (model === 'looking-similar' && objectId) {
      requests.push({
        indexName,
        model: 'related-products',
        objectID: objectId,
        threshold: 0,
        maxRecommendations: 10,
      });
    } else if (model === 'bought-together' && objectId) {
      requests.push({
        indexName,
        model: 'bought-together',
        objectID: objectId,
        threshold: 0,
        maxRecommendations: 10,
      });
    } else if (model === 'trending-items') {
      requests.push({
        indexName,
        model: 'trending-items',
        threshold: 0,
        maxRecommendations: 10,
      });
    } else if (model === 'related-products' && objectId) {
      requests.push({
        indexName,
        model: 'related-products',
        objectID: objectId,
        threshold: 0,
        maxRecommendations: 10,
      });
    }

    // If we have a valid request, use Recommend API
    if (requests.length > 0) {
      // Use Algolia Recommend REST API
      const response = await fetch(
        `https://recommend.us.algolia.com/1/indexes/*/recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Algolia-Application-Id': appId,
            'X-Algolia-API-Key': apiKey,
          },
          body: JSON.stringify({ requests }),
        }
      );

      if (!response.ok) {
        throw new Error(`Recommend API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.results && data.results[0] && data.results[0].hits) {
        return data.results[0].hits;
      }
    }

    // Fallback: use regular search if no objectId or unknown model
    const index = searchClient.initIndex(fallbackIndexName || indexName);
    const results = await index.search('', {
      hitsPerPage: 10,
    });
    return results.hits;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching recommendations:', error);
    // Fallback: use regular search
    try {
      const index = searchClient.initIndex(fallbackIndexName || indexName);
      const results = await index.search('', {
        hitsPerPage: 10,
      });
      return results.hits;
    } catch (fallbackError) {
      // eslint-disable-next-line no-console
      console.error('Fallback search also failed:', fallbackError);
      return [];
    }
  }
}

export default async function decorate(block) {
  const { appId, apiKey } = getCredentials(block);
  const indexName = getIndexName(block);
  const model = getModel(block);
  const objectIdParam = getObjectId(block);
  const title = getTitle(block);

  const recommendContainer = document.createElement('div');
  recommendContainer.className = 'recommend-container';
  recommendContainer.innerHTML = `
    <div class="recommend-loading">Loading recommendations...</div>
    <div class="recommend-error" style="display: none;"></div>
    <div class="recommend-content" style="display: none;">
      <h2 class="recommend-title"></h2>
      <div class="recommend-carousel-container">
        <div class="recommend-carousel-track"></div>
        <div class="recommend-carousel-arrows"></div>
        <div class="recommend-carousel-dots"></div>
      </div>
    </div>
  `;
  block.textContent = '';
  block.appendChild(recommendContainer);

  if (!appId || !apiKey || !indexName) {
    const errorDiv = recommendContainer.querySelector('.recommend-error');
    const loadingDiv = recommendContainer.querySelector('.recommend-loading');
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Algolia credentials and index name are required.';
    return;
  }

  // Get object ID from parameter or URL (pid or rid query params)
  const objectId = objectIdParam || getObjectIdFromUrl();

  // Set title
  const titleElement = recommendContainer.querySelector('.recommend-title');
  titleElement.textContent = title;

  setTimeout(async () => {
    const searchClient = createAlgoliaClient(appId, apiKey);

    try {
      const recommendations = await fetchRecommendations(
        searchClient,
        appId,
        apiKey,
        indexName,
        model,
        objectId,
        indexName
      );

      if (!recommendations || recommendations.length === 0) {
        const errorDiv = recommendContainer.querySelector('.recommend-error');
        const loadingDiv = recommendContainer.querySelector('.recommend-loading');
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'No recommendations available.';
        return;
      }

      const loadingDiv = recommendContainer.querySelector('.recommend-loading');
      const errorDiv = recommendContainer.querySelector('.recommend-error');
      const contentDiv = recommendContainer.querySelector('.recommend-content');
      const track = recommendContainer.querySelector('.recommend-carousel-track');
      const arrowsContainer = recommendContainer.querySelector('.recommend-carousel-arrows');

      loadingDiv.style.display = 'none';
      errorDiv.style.display = 'none';
      contentDiv.style.display = 'block';

      // Clear existing slides
      recommendSlides.length = 0;
      track.innerHTML = '';

      // Group products into slides (4 products per slide)
      const productsPerSlide = 4;
      for (let i = 0; i < recommendations.length; i += productsPerSlide) {
        const slide = document.createElement('div');
        slide.className = 'recommend-carousel-slide';
        slide.style.minWidth = '100%';

        const slideContent = document.createElement('div');
        slideContent.className = 'recommend-slide-content';

        const products = recommendations.slice(i, i + productsPerSlide);
        products.forEach((product) => {
          const card = createProductCard(product);
          slideContent.appendChild(card);
        });

        slide.appendChild(slideContent);
        track.appendChild(slide);
        recommendSlides.push(slide);
      }

      // Initialize carousel (will create arrows if needed)
      initCarousel();
    } catch (error) {
      const loadingDiv = recommendContainer.querySelector('.recommend-loading');
      const errorDiv = recommendContainer.querySelector('.recommend-error');
      loadingDiv.style.display = 'none';
      errorDiv.style.display = 'block';
      errorDiv.textContent = `Error loading recommendations: ${error.message || 'Unknown error'}`;
      // eslint-disable-next-line no-console
      console.error('Error fetching recommendations:', error);
    }
  }, 500);
}

