import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

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
}


// Header component data
// Header component data
const headerData = {
  logo: {
    text: 'Groceyish',
    img: '/icons/logo.svg'
  },
  search: {
    placeholder: 'Search for products...',
    icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="white" stroke-width="2"/>
      <path d="M14 14L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  icons: [
    {
      id: 'wishlist',
      badge: 1,
      img: '/icons/wishlist.svg'
    },
    {
      id: 'cart',
      badge: 1,
      img: '/icons/cart.svg'
    },
    {
      id: 'account',
      badge: 1,
      img: '/icons/account.svg'
    }
  ],
  navigation: {
    browseButton: {
      text: 'Browse All Categories',
      icon: `<svg width="20" height="20" viewBox="136 104 20 20" fill="none">
        <rect x="137" y="105" width="7" height="7" stroke="white" stroke-width="2"/>
        <rect x="148" y="105" width="7" height="7" stroke="white" stroke-width="2"/>
        <rect x="148" y="116" width="7" height="7" stroke="white" stroke-width="2"/>
        <rect x="137" y="116" width="7" height="7" stroke="white" stroke-width="2"/>
      </svg>`
    },
    links: [
      { text: 'Home', href: '#', active: true },
      { text: 'Shop', href: '#', active: false },
      { text: 'Fruits & Vegetables', href: '#', active: false },
      { text: 'Beverages', href: '#', active: false },
      { text: 'Blog', href: '#', active: false },
      { text: 'Contact', href: '#', active: false }
    ]
  },
  contact: {
    phone: '(800) 888-8888',
    hours: '24/7 Support Center',
    img: '/icons/phone.svg'
  }
};

// Render header component
function generateHeader(fragment) {
  let topContainerHTML = '';
  let bottomContainerHTML = '';

  const topContainer = fragment.firstElementChild;
  if (topContainer && topContainer.children.length > 2) {
    const companyNameElement = topContainer.children[0];
    const globalSearchElement = topContainer.children[1];
    const siteControlsElement = topContainer.children[2];

    headerData.logo.text = companyNameElement.textContent;
    topContainerHTML = `
      <!-- Top Bar -->
      <div class="header__top-bar">
        <!-- Logo Section -->
        <div class="header__logo-section">
          <div class="header__logo-icon">
            <img src="/icons/logo.svg" width="60" height="60" alt="${headerData.logo.text}" />
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
          ${headerData.icons.map(icon => `
            <div class="header__icon-item" data-icon="${icon.id}">
              <img src="${icon.img}" width="20" height="20" alt="${icon.id}" />
              <span class="header__badge ${icon.id === 'cart' ? 'header__badge--cart' : ''}">${icon.badge}</span>
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
            ${headerData.navigation.links.map(link => `
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
        console.log('Searching for:', query);
        // Add your search logic here
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
  iconItems.forEach(item => {
    item.addEventListener('click', () => {
      const iconType = item.dataset.icon;
      console.log(`${iconType} icon clicked`);
      // Add your icon click logic here
    });
  });

  // Navigation link handlers
  const navLinks = document.querySelectorAll('.navigation__link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove('navigation__link--active'));
      
      // Add active class to clicked link
      link.classList.add('navigation__link--active');
      
      console.log('Navigation to:', link.textContent);
      // Add your navigation logic here
    });
  });

  // Browse button handler
  const browseBtn = document.querySelector('.navigation__browse-btn');
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      console.log('Browse all categories clicked');
      // Add your browse categories logic here
    });
  }
}