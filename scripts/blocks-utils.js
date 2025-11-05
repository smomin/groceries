/**
 * Shared utilities for blocks
 * Consolidates common functionality used across search, product, recipe, carousel, and recommend blocks
 */

import { createOptimizedPicture } from './aem.js';
import { addToCart, updateCartBadge } from './cart.js';
import { moveInstrumentation } from './scripts.js';

/**
 * DOM Utilities
 */

/**
 * Extracts and clears text content from an HTML element
 * @param {HTMLElement} htmlElement - The element to extract text from
 * @returns {string} The trimmed text content
 */
export function getTextContent(htmlElement) {
  if (!htmlElement) return '';
  const textContent = htmlElement.textContent?.trim() || '';
  htmlElement.textContent = '';
  return textContent;
}

/**
 * Extracts Algolia credentials from block children
 * @param {HTMLElement} htmlElement - The block element
 * @returns {{appId: string, apiKey: string}} Algolia credentials
 */
export function getCredentials(htmlElement) {
  const appId = getTextContent(htmlElement.children?.[0]);
  const apiKey = getTextContent(htmlElement.children?.[1]);
  return { appId, apiKey };
}

/**
 * Extracts index name from block children
 * @param {HTMLElement} htmlElement - The block element
 * @param {number} childIndex - Index of child containing the index name (default: 2)
 * @returns {string} The index name
 */
export function getIndexName(htmlElement, childIndex = 2) {
  const indexName = getTextContent(htmlElement.children?.[childIndex]);
  return indexName;
}

/**
 * URL Utilities
 */

/**
 * Gets a URL parameter value
 * @param {string} name - Parameter name
 * @returns {string} Parameter value or empty string
 */
export function getParamFromUrl(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name) || '';
}

/**
 * Gets product or recipe ID from URL
 * @returns {string} Product ID (pid) or Recipe ID (rid)
 */
export function getObjectIdFromUrl() {
  return getParamFromUrl('pid') || getParamFromUrl('rid');
}

/**
 * Algolia Utilities
 */

/**
 * Creates an Algolia search client
 * @param {string} appId - Algolia application ID
 * @param {string} apiKey - Algolia API key
 * @returns {Object} Algolia search client
 */
export function createAlgoliaClient(appId, apiKey) {
  if (!window.algoliasearch) {
    throw new Error('Algolia library not loaded');
  }
  return window.algoliasearch(appId, apiKey);
}

/**
 * Fetches an object from Algolia by objectID
 * @param {Object} searchClient - Algolia search client
 * @param {string} indexName - Index name
 * @param {string} objectId - Object ID to fetch
 * @returns {Promise<Object>} The fetched object
 */
export async function fetchObjectById(searchClient, indexName, objectId) {
  const index = searchClient.initIndex(indexName);

  // Try getObject first (primary method)
  if (typeof index.getObject === 'function') {
    try {
      return await index.getObject(objectId);
    } catch (error) {
      // Fallback to filter search if getObject fails
      const result = await index.search('', {
        filters: `objectID:${objectId}`,
        hitsPerPage: 1,
      });
      const hit = result.hits && result.hits.length > 0 ? result.hits[0] : null;
      if (hit && hit.objectID === objectId) {
        return hit;
      }
      throw new Error('Object not found');
    }
  }

  // Fallback: Use filter search
  const result = await index.search('', {
    filters: `objectID:${objectId}`,
    hitsPerPage: 1,
  });
  const hit = result.hits && result.hits.length > 0 ? result.hits[0] : null;
  if (hit && hit.objectID === objectId) {
    return hit;
  }
  throw new Error('Object not found');
}

/**
 * Image Utilities
 */

/**
 * Checks if an image URL is external (different origin)
 * @param {string} imageUrl - Image URL to check
 * @returns {boolean} True if external
 */
export function isExternalImage(imageUrl) {
  try {
    const imageUrlObj = new URL(imageUrl, window.location.href);
    return imageUrlObj.origin !== window.location.origin;
  } catch (error) {
    return false;
  }
}

/**
 * Creates an optimized image element
 * @param {string} imageUrl - Image URL
 * @param {string} alt - Alt text
 * @param {boolean} eager - Whether to load eagerly
 * @param {Array} widths - Array of width breakpoints
 * @returns {HTMLElement} Image or picture element
 */
export function createImageElement(imageUrl, alt, eager = false, widths = [{ width: '750' }]) {
  const isExternal = isExternalImage(imageUrl);

  if (isExternal) {
    // For external images, use simple img tag
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = alt;
    img.loading = eager ? 'eager' : 'lazy';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    return img;
  }

  // For same-domain images, use optimization
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = alt;
  img.loading = eager ? 'eager' : 'lazy';
  const optimizedPic = createOptimizedPicture(imageUrl, alt, false, widths);
  moveInstrumentation(img, optimizedPic.querySelector('img'));
  return optimizedPic;
}

/**
 * Cart Utilities
 */

/**
 * Handles add to cart button click with visual feedback
 * @param {HTMLElement} button - The button element
 * @param {Object} productData - Product data object
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {boolean} Success status
 */
export function handleAddToCart(button, productData, quantity = 1) {
  const cartItem = addToCart(productData, quantity);
  if (cartItem) {
    // Store original state
    const originalHTML = button.innerHTML;
    const originalBgColor = button.style.backgroundColor;
    const originalColor = button.style.color;
    const wasDisabled = button.disabled;

    // Visual feedback
    button.innerHTML = 'Added!';
    button.style.backgroundColor = '#00b207';
    button.style.color = '#ffffff';
    button.disabled = true;

    // Restore after 1 second
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.backgroundColor = originalBgColor;
      button.style.color = originalColor;
      button.disabled = wasDisabled;

      requestAnimationFrame(() => {
        updateCartBadge();
      });
    }, 1000);

    return true;
  }
  return false;
}

/**
 * Sets up add to cart button with event listener
 * @param {HTMLElement} button - The button element
 * @param {Object} productData - Product data object
 * @param {Function} getQuantity - Optional function to get quantity (default: () => 1)
 */
export function setupAddToCartButton(button, productData, getQuantity = () => 1) {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const quantity = getQuantity();
    handleAddToCart(button, productData, quantity);
  });
}

/**
 * Carousel Utilities
 */

/**
 * Creates a reusable carousel system
 */
export class Carousel {
  constructor(options = {}) {
    this.currentSlide = 0;
    this.autoSlideInterval = null;
    this.slides = [];
    this.options = {
      trackSelector: options.trackSelector || '.carousel-track',
      dotsSelector: options.dotsSelector || '.carousel-dots',
      containerSelector: options.containerSelector || '.carousel-container',
      dotClass: options.dotClass || 'carousel-dot',
      arrowClass: options.arrowClass || 'carousel-arrow',
      autoSlideInterval: options.autoSlideInterval || 5000,
      ...options,
    };
  }

  /**
   * Updates carousel position and active states
   */
  update() {
    const track = document.querySelector(this.options.trackSelector);
    if (!track) return;

    track.style.transform = `translateX(-${this.currentSlide * 100}%)`;

    // Update dots
    const dots = document.querySelectorAll(`.${this.options.dotClass}`);
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === this.currentSlide);
    });
  }

  /**
   * Moves slide by direction
   * @param {number} direction - -1 for prev, 1 for next
   */
  moveSlide(direction) {
    if (this.slides.length === 0) return;

    this.currentSlide += direction;

    // Loop around
    if (this.currentSlide < 0) {
      this.currentSlide = this.slides.length - 1;
    } else if (this.currentSlide >= this.slides.length) {
      this.currentSlide = 0;
    }

    this.update();
    this.resetAutoSlide();
  }

  /**
   * Starts auto-slide functionality
   */
  startAutoSlide() {
    if (this.slides.length <= 1) return;

    this.autoSlideInterval = setInterval(() => {
      this.moveSlide(1);
    }, this.options.autoSlideInterval);
  }

  /**
   * Resets auto-slide timer
   */
  resetAutoSlide() {
    clearInterval(this.autoSlideInterval);
    this.startAutoSlide();
  }

  /**
   * Moves to specific slide
   * @param {number} slideIndex - Slide index
   */
  goToSlide(slideIndex) {
    if (this.slides.length === 0) return;

    this.currentSlide = slideIndex;
    this.update();
    this.resetAutoSlide();
  }

  /**
   * Creates navigation arrow
   * @param {string} direction - 'prev' or 'next'
   * @param {number} moveDirection - -1 for prev, 1 for next
   * @returns {HTMLElement} Arrow button element
   */
  createArrow(direction, moveDirection) {
    const arrow = document.createElement('button');
    arrow.className = `${this.options.arrowClass} ${direction}`;
    arrow.setAttribute('aria-label', direction === 'prev' ? 'Previous' : 'Next');
    arrow.onclick = () => this.moveSlide(moveDirection);

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

  /**
   * Creates navigation dots
   */
  createDots() {
    const dotsContainer = document.querySelector(this.options.dotsSelector);
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';

    for (let i = 0; i < this.slides.length; i += 1) {
      const dot = document.createElement('button');
      dot.className = this.options.dotClass;
      if (i === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => this.goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  /**
   * Handles swipe gesture
   * @param {number} startX - Touch start X coordinate
   * @param {number} endX - Touch end X coordinate
   */
  handleSwipe(startX, endX) {
    const swipeThreshold = 50;
    const diff = startX - endX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next slide
        this.moveSlide(1);
      } else {
        // Swipe right - previous slide
        this.moveSlide(-1);
      }
    }
  }

  /**
   * Sets up event listeners
   */
  setupEventListeners() {
    const carouselContainer = document.querySelector(this.options.containerSelector);

    if (carouselContainer) {
      // Pause auto-slide on hover
      carouselContainer.addEventListener('mouseenter', () => {
        clearInterval(this.autoSlideInterval);
      });

      carouselContainer.addEventListener('mouseleave', () => {
        this.startAutoSlide();
      });

      // Touch/Swipe support for mobile
      let touchStartX = 0;
      let touchEndX = 0;

      carouselContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      });

      carouselContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe(touchStartX, touchEndX);
      });
    }

    // Keyboard navigation (global)
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        this.moveSlide(-1);
      } else if (e.key === 'ArrowRight') {
        this.moveSlide(1);
      }
    };

    // Only add if not already added
    if (!this.keyboardHandler) {
      this.keyboardHandler = handleKeyDown;
      document.addEventListener('keydown', this.keyboardHandler);
    }
  }

  /**
   * Removes event listeners
   */
  removeEventListeners() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  /**
   * Initializes carousel functionality
   */
  init() {
    if (this.slides.length === 0) return;

    this.createDots();
    this.update();
    this.startAutoSlide();
    this.setupEventListeners();
  }

  /**
   * Sets slides array
   * @param {Array} slides - Array of slide elements
   */
  setSlides(slides) {
    this.slides = slides;
    this.currentSlide = 0;
  }
}

/**
 * Formatting Utilities
 */

/**
 * Formats price as currency
 * @param {number} price - Price to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale (default: 'en-US')
 * @returns {string} Formatted price string
 */
export function formatPrice(price, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price || 0);
}

