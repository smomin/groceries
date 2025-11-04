import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  initCartBadge, getCartItems, clearCart, getCartTotalPrice,
} from '../../scripts/cart.js';

/**
 * Truncate text to a specified number of characters
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

// Store position adjustment cleanup function
let positionCleanup = null;

/**
 * Render cart dropdown content
 */
function renderCartDropdown() {
  const cartIconItem = document.querySelector('.header__icon-item[data-icon="cart"]');
  if (!cartIconItem) return;

  // Remove existing dropdown if any and clean up
  const existingDropdown = document.querySelector('.cart-dropdown');
  if (existingDropdown) {
    if (positionCleanup) {
      positionCleanup();
      positionCleanup = null;
    }
    existingDropdown.remove();
  }

  const cartItems = getCartItems();
  const totalPrice = getCartTotalPrice();

  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'cart-dropdown';
  dropdown.innerHTML = `
    <div class="cart-dropdown__header">
      <h3 class="cart-dropdown__title">Shopping Cart</h3>
      <button class="cart-dropdown__close" aria-label="Close cart">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="cart-dropdown__content">
      ${cartItems.length === 0 ? `
        <div class="cart-dropdown__empty">
          <p>Your cart is empty</p>
        </div>
      ` : `
        <ul class="cart-dropdown__items">
          ${cartItems.map((item) => `
            <li class="cart-dropdown__item">
              <div class="cart-dropdown__item-image">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : ''}
              </div>
              <div class="cart-dropdown__item-details">
                <h4 class="cart-dropdown__item-name">${item.name}</h4>
                <p class="cart-dropdown__item-description">${truncateText(item.description, 60)}</p>
                <div class="cart-dropdown__item-meta">
                  <span class="cart-dropdown__item-price">${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(item.price)}</span>
                  <span class="cart-dropdown__item-qty">Qty: ${item.qty}</span>
                  <span class="cart-dropdown__item-total">${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(item.totalPrice)}</span>
                </div>
              </div>
            </li>
          `).join('')}
        </ul>
        <div class="cart-dropdown__footer">
          <div class="cart-dropdown__total">
            <span class="cart-dropdown__total-label">Total:</span>
            <span class="cart-dropdown__total-amount">${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalPrice)}</span>
          </div>
          <div class="cart-dropdown__actions">
            <button class="cart-dropdown__button cart-dropdown__button--clear" id="clear-cart-btn">
              Clear Cart
            </button>
            <button class="cart-dropdown__button cart-dropdown__button--checkout" id="checkout-btn">
              Checkout
            </button>
          </div>
        </div>
      `}
    </div>
  `;

  // Position dropdown relative to cart icon
  const rect = cartIconItem.getBoundingClientRect();
  const isMobileInitial = window.innerWidth <= 768;

  if (isMobileInitial) {
    // On mobile, position from top
    dropdown.style.top = '0';
    dropdown.style.right = '0';
    dropdown.style.left = '0';
    dropdown.style.bottom = '0';
  } else {
    // On desktop, position relative to cart icon
    const dropdownTop = rect.bottom + 10;
    const dropdownRight = window.innerWidth - rect.right;
    dropdown.style.top = `${dropdownTop}px`;
    dropdown.style.right = `${dropdownRight}px`;
  }

  document.body.appendChild(dropdown);

  // Adjust position on scroll or resize
  const adjustPosition = () => {
    const isMobileCurrent = window.innerWidth <= 768;
    if (isMobileCurrent) {
      dropdown.style.top = '0';
      dropdown.style.right = '0';
      dropdown.style.left = '0';
      dropdown.style.bottom = '0';
    } else {
      const newRect = cartIconItem.getBoundingClientRect();
      dropdown.style.top = `${newRect.bottom + 10}px`;
      dropdown.style.right = `${window.innerWidth - newRect.right}px`;
    }
  };

  window.addEventListener('scroll', adjustPosition, true);
  window.addEventListener('resize', adjustPosition);

  // Store cleanup function
  positionCleanup = () => {
    window.removeEventListener('scroll', adjustPosition, true);
    window.removeEventListener('resize', adjustPosition);
  };

  // Add event listeners for dropdown buttons
  const closeBtn = dropdown.querySelector('.cart-dropdown__close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCartDropdown);
  }

  const clearBtn = dropdown.querySelector('#clear-cart-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', handleClearCart);
  }

  const checkoutBtn = dropdown.querySelector('#checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }

  // Show dropdown with animation
  setTimeout(() => {
    dropdown.classList.add('cart-dropdown--open');
  }, 10);
}

/**
 * Toggle cart dropdown visibility
 */
function toggleCartDropdown() {
  const dropdown = document.querySelector('.cart-dropdown');
  if (dropdown && dropdown.classList.contains('cart-dropdown--open')) {
    closeCartDropdown();
  } else {
    renderCartDropdown();
  }
}

/**
 * Close cart dropdown
 */
function closeCartDropdown() {
  const dropdown = document.querySelector('.cart-dropdown');
  if (dropdown) {
    dropdown.classList.remove('cart-dropdown--open');

    // Clean up position listeners
    if (positionCleanup) {
      positionCleanup();
      positionCleanup = null;
    }

    setTimeout(() => {
      dropdown.remove();
    }, 300);
  }
}

/**
 * Handle clear cart button click
 */
function handleClearCart() {
  // eslint-disable-next-line no-alert, no-restricted-globals
  if (confirm('Are you sure you want to clear your cart?')) {
    clearCart();
    renderCartDropdown(); // Re-render to show empty state
  }
}

/**
 * Handle checkout button click
 */
function handleCheckout() {
  // TODO: Implement checkout functionality
  // eslint-disable-next-line no-alert
  alert('Checkout functionality coming soon!');
  // You can redirect to a checkout page here
  // window.location.href = '/checkout.html';
}

// Header component data
const headerData = {
  logo: {
    text: 'Groceyish',
    img: '/icons/logo.svg',
  },
  search: {
    placeholder: 'Search for products...',
    icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="white" stroke-width="2"/>
      <path d="M14 14L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  icons: [
    {
      id: 'wishlist',
      badge: 0,
      img: '/icons/wishlist.svg',
    },
    {
      id: 'cart',
      badge: 1,
      img: '/icons/cart.svg',
    },
    {
      id: 'account',
      badge: 0,
      img: '/icons/account.svg',
    },
  ],
  navigation: {
    browseButton: {
      text: 'Browse All Categories',
      icon: `<svg width="20" height="20" viewBox="136 104 20 20" fill="none">
        <rect x="137" y="105" width="7" height="7" stroke="white" stroke-width="2"/>
        <rect x="148" y="105" width="7" height="7" stroke="white" stroke-width="2"/>
        <rect x="148" y="116" width="7" height="7" stroke="white" stroke-width="2"/>
        <rect x="137" y="116" width="7" height="7" stroke="white" stroke-width="2"/>
      </svg>`,
    },
    links: [
      { text: 'Home', href: '#', active: true },
      { text: 'Shop', href: '#', active: false },
      { text: 'Fruits & Vegetables', href: '#', active: false },
      { text: 'Beverages', href: '#', active: false },
      { text: 'Blog', href: '#', active: false },
      { text: 'Contact', href: '#', active: false },
    ],
  },
  contact: {
    phone: '(800) 888-8888',
    hours: '24/7 Support Center',
    img: '/icons/phone.svg',
  },
};

// Render header component
function generateHeader(fragment) {
  let topContainerHTML = '';
  let bottomContainerHTML = '';

  const topContainer = fragment.firstElementChild;
  if (topContainer && topContainer.children.length > 2) {
    const companyNameElement = topContainer.children[0];
    const globalSearchElement = topContainer.children[1];

    headerData.logo.text = companyNameElement.textContent;
    topContainerHTML = `
      <!-- Top Bar -->
      <div class="header__top-bar">
        <!-- Logo Section -->
        <div class="header__logo-section">
          <div class="header__logo-icon">
            <img src="/icons/logo.svg" alt="${headerData.logo.text}" />
          </div>
          <div class="header__logo-text">
            <h1>${headerData.logo.text}</h1>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="header__search-container">
          ${globalSearchElement.innerHTML}
        </div>

        <!-- Right Icons -->
        <div class="header__icons">
          ${headerData.icons.map((icon) => `
            <div class="header__icon-item" data-icon="${icon.id}">
              <img src="${icon.img}" width="20" height="20" alt="${icon.id}" />
              ${icon.badge > 0 ? `<span class="header__badge ${icon.id === 'cart' ? 'header__badge--cart' : ''}">${icon.badge}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const bottomContainer = fragment.lastElementChild;
  if (bottomContainer && bottomContainer.children.length > 2) {
    bottomContainerHTML = `
      <!-- Bottom Navigation Bar -->
      <div class="header__bottom-bar">
        <nav class="navigation" aria-label="Main navigation">
          <button class="navigation__browse-btn">
            ${headerData.navigation.browseButton.icon}
            ${headerData.navigation.browseButton.text}
          </button>
          <ul class="navigation__links">
            ${headerData.navigation.links.map((link) => `
              <li class="navigation__item">
                <a href="${link.href}" class="navigation__link ${link.active ? 'navigation__link--active' : ''}">${link.text}</a>
              </li>
            `).join('')}
          </ul>
        </nav>
        <div class="header__contact-info">
          <img src="${headerData.contact.img}" width="20" height="20" alt="${headerData.contact.phone}" />
          <span class="header__contact-phone">${headerData.contact.phone}</span>
          <span class="header__contact-hours">${headerData.contact.hours}</span>
        </div>
      </div>
    `;
  }
  const headerHTML = `
    <header class="header">
      <!-- Top Bar -->
      ${topContainerHTML}

      <!-- Bottom Navigation Bar -->
      ${bottomContainerHTML}
    </header>
  `;

  const headerElement = document.createElement('div');
  headerElement.innerHTML = headerHTML;
  return headerElement;
}

// Attach event listeners
function attachEventListeners() {
  // Search functionality
  const searchButton = document.querySelector('.header__search-button');
  const searchInput = document.querySelector('.header__search-input');

  if (searchButton && searchInput) {
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        // Add your search logic here
        // eslint-disable-next-line no-console
        console.log('Searching for:', query);
      }
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchButton.click();
      }
    });
  }

  // Icon click handlers
  const iconItems = document.querySelectorAll('.header__icon-item');
  iconItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      const iconType = item.dataset.icon;

      if (iconType === 'cart') {
        e.stopPropagation();
        toggleCartDropdown();
      } else {
        // Add your icon click logic here
        // eslint-disable-next-line no-console
        console.log(`${iconType} icon clicked`);
      }
    });
  });

  // Close cart dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const cartDropdown = document.querySelector('.cart-dropdown');
    const cartIcon = document.querySelector('.header__icon-item[data-icon="cart"]');

    if (cartDropdown && cartIcon && !cartDropdown.contains(e.target)
        && !cartIcon.contains(e.target)) {
      closeCartDropdown();
    }
  });

  // Refresh cart dropdown when cart is updated
  document.addEventListener('cartUpdated', () => {
    const dropdown = document.querySelector('.cart-dropdown--open');
    if (dropdown) {
      renderCartDropdown();
    }
  });

  // Navigation link handlers
  const navLinks = document.querySelectorAll('.navigation__link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Remove active class from all links
      navLinks.forEach((l) => l.classList.remove('navigation__link--active'));

      // Add active class to clicked link
      link.classList.add('navigation__link--active');

      // Add your navigation logic here
      // eslint-disable-next-line no-console
      console.log('Navigation to:', link.textContent);
    });
  });

  // Browse button handler
  const browseBtn = document.querySelector('.navigation__browse-btn');
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      // Add your browse categories logic here
      // eslint-disable-next-line no-console
      console.log('Browse all categories clicked');
    });
  }
}

/**
 * Update body padding to account for fixed header
 */
function updateBodyPadding() {
  const header = document.querySelector('.header');
  if (!header) return;

  const headerHeight = header.offsetHeight;
  document.body.style.paddingTop = `${headerHeight}px`;
}

/**
 * Handle header minimization on scroll
 */
function handleHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  const scrollThreshold = 50; // Start minimizing after 50px scroll
  let ticking = false;

  function updateHeader() {
    const scrollY = window.scrollY;

    if (scrollY > scrollThreshold) {
      header.classList.add('header--minimized');
    } else {
      header.classList.remove('header--minimized');
    }

    // Update body padding when header state changes
    updateBodyPadding();

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Update padding on resize
  window.addEventListener('resize', updateBodyPadding, { passive: true });

  // Initial check
  updateHeader();
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  const headerElement = generateHeader(fragment);
  moveInstrumentation(fragment, headerElement);
  block.append(headerElement);
  attachEventListeners();

  // Initialize cart badge after header is loaded
  initCartBadge();

  // Initialize header scroll handler after a brief delay to ensure DOM is ready
  setTimeout(() => {
    handleHeaderScroll();
    updateBodyPadding();
  }, 100);
}
