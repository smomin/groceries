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
  // Find the cart icon item and its badge
  const cartIconItem = document.querySelector('.header__icon-item[data-icon="cart"]');
  const cartBadge = cartIconItem?.querySelector('.header__badge');

  if (cartBadge) {
    const totalItems = getCartTotalItems();
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
  }

  // Refresh cart dropdown if it's open
  const dropdown = document.querySelector('.cart-dropdown--open');
  if (dropdown) {
    // Dispatch a custom event to refresh the dropdown
    document.dispatchEvent(new CustomEvent('cartUpdated'));
  }
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
