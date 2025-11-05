/**
 * Cart utility functions for managing cart items in localStorage
 */

const CART_STORAGE_KEY = 'groceries_cart';
const DEFAULT_QUANTITY = 1;

/**
 * Get all cart items from localStorage
 * @returns {Array} Array of cart items
 */
export function getCartItems() {
  try {
    const cartData = localStorage.getItem(CART_STORAGE_KEY);
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error reading cart from localStorage:', error);
    return [];
  }
}

/**
 * Get total number of items in cart
 * @returns {number} Total quantity of items
 */
export function getCartTotalItems() {
  const cart = getCartItems();
  return cart.reduce((total, item) => total + item.qty, 0);
}

/**
 * Update cart badge count in the header
 */
export function updateCartBadge() {
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    // Find the cart icon item and its badge
    const cartIconItem = document.querySelector('.header__icon-item[data-icon="cart"]');
    if (!cartIconItem) {
      // Retry after a short delay if not found (header might still be loading)
      setTimeout(() => {
        const retryCartIconItem = document.querySelector('.header__icon-item[data-icon="cart"]');
        if (retryCartIconItem) {
          updateCartBadge();
        }
      }, 100);
      return;
    }

    // Ensure cart icon item remains visible
    cartIconItem.style.display = '';
    cartIconItem.style.visibility = '';
    cartIconItem.style.opacity = '';

    // Ensure the cart icon image is visible and has a valid src
    const cartIconImage = cartIconItem.querySelector('img');
    if (cartIconImage) {
      cartIconImage.style.display = '';
      cartIconImage.style.visibility = '';
      cartIconImage.style.opacity = '';
      // Ensure image src is not empty
      if (!cartIconImage.src || cartIconImage.src === window.location.href) {
        cartIconImage.src = cartIconImage.getAttribute('src') || '/icons/cart.svg';
      }
    }

    let cartBadge = cartIconItem.querySelector('.header__badge');
    
    // Create badge if it doesn't exist
    if (!cartBadge) {
      cartBadge = document.createElement('span');
      cartBadge.className = 'header__badge header__badge--cart';
      // Ensure the cart icon item is still in the DOM before appending
      if (cartIconItem.parentNode) {
        cartIconItem.appendChild(cartBadge);
      } else {
        // eslint-disable-next-line no-console
        console.warn('Cart icon item is not in the DOM');
        return;
      }
    }

    const totalItems = getCartTotalItems();
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';

    // Refresh cart dropdown if it's open
    const dropdown = document.querySelector('.cart-dropdown--open');
    if (dropdown) {
      // Dispatch a custom event to refresh the dropdown
      document.dispatchEvent(new CustomEvent('cartUpdated'));
    }
  });
}

/**
 * Save cart items to localStorage
 * @param {Array} items - Array of cart items
 */
function saveCartItems(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    updateCartBadge();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving cart to localStorage:', error);
  }
}

/**
 * Add item to cart or update quantity if already exists
 * @param {Object} product - Product object with name, description, price, etc.
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Object} Updated cart item
 */
export function addToCart(product, quantity = DEFAULT_QUANTITY) {
  if (!product || !product.objectID) {
    // eslint-disable-next-line no-console
    console.error('Invalid product data');
    return null;
  }

  const cart = getCartItems();
  const existingItemIndex = cart.findIndex((item) => item.objectID === product.objectID);

  const price = product.price || 0;
  // Use description if available, otherwise fall back to name
  const description = product.description || product.name || 'No description';

  if (existingItemIndex >= 0) {
    // Update existing item quantity
    const existingItem = cart[existingItemIndex];
    const newQuantity = existingItem.qty + quantity;
    const totalPrice = price * newQuantity;

    cart[existingItemIndex] = {
      ...existingItem,
      qty: newQuantity,
      totalPrice,
    };
  } else {
    // Add new item
    const totalPrice = price * quantity;
    const newItem = {
      objectID: product.objectID,
      name: product.name || 'Unknown Product',
      description,
      price,
      qty: quantity,
      totalPrice,
      image: product.image || '',
    };

    cart.push(newItem);
  }

  saveCartItems(cart);
  return cart[existingItemIndex >= 0 ? existingItemIndex : cart.length - 1];
}

/**
 * Clear all items from cart
 */
export function clearCart() {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartBadge();
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error clearing cart:', error);
    return false;
  }
}

/**
 * Get total price of all items in cart
 * @returns {number} Total price
 */
export function getCartTotalPrice() {
  const cart = getCartItems();
  return cart.reduce((total, item) => total + item.totalPrice, 0);
}

/**
 * Initialize cart badge on page load
 */
export function initCartBadge() {
  updateCartBadge();
}
