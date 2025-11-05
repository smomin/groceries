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

function getModel(htmlElement) {
  const model = getTextContent(htmlElement.children[3]);
  return model || 'looking-similar';
}

function getObjectId(htmlElement) {
  const objectId = getTextContent(htmlElement.children[4]);
  return objectId;
}

function getTitle(htmlElement) {
  const title = getTextContent(htmlElement.children[5]);
  return title || 'Recommended for You';
}

function getObjectIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  // Check for pid (product id) or rid (recipe id) query parameters
  return urlParams.get('pid') || urlParams.get('rid');
}

// Carousel State
let currentSlide = 0;
let autoSlideInterval;
const recommendSlides = [];

// Create individual product card
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'recommend-card';
  card.dataset.productId = product.objectID;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'recommend-card__image-wrapper';
  
  if (product.image) {
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name || 'Product';
    img.loading = 'lazy';
    const optimizedPic = createOptimizedPicture(
      img.src,
      img.alt,
      false,
      [{ width: '300' }]
    );
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    imageWrapper.appendChild(optimizedPic);
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

  const priceContainer = document.createElement('div');
  priceContainer.className = 'price-container';
  const price = document.createElement('span');
  price.className = 'current-price';
  price.textContent = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price || 0);
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

    const cartItem = addToCart(productData, 1);
    if (cartItem) {
      const originalHTML = addBtn.innerHTML;
      const originalBgColor = addBtn.style.backgroundColor;
      const originalColor = addBtn.style.color;

      addBtn.innerHTML = 'Added!';
      addBtn.style.backgroundColor = '#00b207';
      addBtn.style.color = '#ffffff';
      addBtn.disabled = true;

      setTimeout(() => {
        addBtn.innerHTML = originalHTML;
        addBtn.style.backgroundColor = originalBgColor;
        addBtn.style.color = originalColor;
        addBtn.disabled = false;

        requestAnimationFrame(() => {
          updateCartBadge();
        });
      }, 1000);
    }
  });

  footer.appendChild(priceContainer);
  footer.appendChild(addBtn);

  card.appendChild(imageWrapper);
  card.appendChild(category);
  card.appendChild(name);
  if (product.brand) {
    card.appendChild(brand);
  }
  card.appendChild(footer);

  return card;
}

// Update carousel position and active states
function updateCarousel() {
  const track = document.querySelector('.recommend-carousel-track');
  if (!track) return;

  track.style.transform = `translateX(-${currentSlide * 100}%)`;

  // Update dots
  const dots = document.querySelectorAll('.recommend-carousel-dot');
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentSlide);
  });
}

// Move slide by direction (-1 for prev, 1 for next)
function moveSlide(direction) {
  if (recommendSlides.length === 0) return;

  currentSlide += direction;

  // Loop around
  if (currentSlide < 0) {
    currentSlide = recommendSlides.length - 1;
  } else if (currentSlide >= recommendSlides.length) {
    currentSlide = 0;
  }

  updateCarousel();
  resetAutoSlide();
}

// Auto-slide functionality
function startAutoSlide() {
  if (recommendSlides.length <= 1) return;
  
  autoSlideInterval = setInterval(() => {
    moveSlide(1);
  }, 5000); // Change slide every 5 seconds
}

// Reset auto-slide timer
function resetAutoSlide() {
  clearInterval(autoSlideInterval);
  startAutoSlide();
}

// Move to specific slide
function goToSlide(slideIndex) {
  if (recommendSlides.length === 0) return;
  
  currentSlide = slideIndex;
  updateCarousel();
  resetAutoSlide();
}

// Create navigation arrow
function createArrow(direction, moveDirection) {
  const arrow = document.createElement('button');
  arrow.className = `recommend-carousel-arrow ${direction}`;
  arrow.setAttribute('aria-label', direction === 'prev' ? 'Previous' : 'Next');
  arrow.onclick = () => moveSlide(moveDirection);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (direction === 'prev') {
    path.setAttribute('d', 'M15 18l-6-6 6-6');
  } else {
    path.setAttribute('d', 'M9 18l6-6-6-6');
  }

  svg.appendChild(path);
  arrow.appendChild(svg);

  return arrow;
}

// Create navigation dots
function createDots() {
  const dotsContainer = document.querySelector('.recommend-carousel-dots');
  if (!dotsContainer) return;
  
  dotsContainer.innerHTML = '';

  for (let i = 0; i < recommendSlides.length; i += 1) {
    const dot = document.createElement('button');
    dot.className = 'recommend-carousel-dot';
    if (i === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  }
}

// Handle swipe gesture
function handleSwipe(startX, endX) {
  const swipeThreshold = 50;
  const diff = startX - endX;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // Swipe left - next slide
      moveSlide(1);
    } else {
      // Swipe right - previous slide
      moveSlide(-1);
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  const carouselContainer = document.querySelector('.recommend-carousel-container');

  if (carouselContainer) {
    // Pause auto-slide on hover
    carouselContainer.addEventListener('mouseenter', () => {
      clearInterval(autoSlideInterval);
    });

    carouselContainer.addEventListener('mouseleave', () => {
      startAutoSlide();
    });

    // Touch/Swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    carouselContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    carouselContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe(touchStartX, touchEndX);
    });

    // Keyboard navigation
    carouselContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        moveSlide(-1);
      } else if (e.key === 'ArrowRight') {
        moveSlide(1);
      }
    });
  }
}

// Initialize carousel functionality
function initCarousel() {
  if (recommendSlides.length === 0) return;
  
  createDots();
  updateCarousel();
  startAutoSlide();
  setupEventListeners();
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

  const { appId, apiKey } = getCredentials(block);
  const indexName = getIndexName(block);
  const model = getModel(block);
  const objectIdParam = getObjectId(block);
  const title = getTitle(block);

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
    const { algoliasearch } = window;
    const searchClient = algoliasearch(appId, apiKey);

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

      // Create navigation arrows if there's more than one slide
      if (recommendSlides.length > 1) {
        const prevArrow = createArrow('prev', -1);
        const nextArrow = createArrow('next', 1);
        arrowsContainer.appendChild(prevArrow);
        arrowsContainer.appendChild(nextArrow);
      }

      // Initialize carousel
      currentSlide = 0;
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

