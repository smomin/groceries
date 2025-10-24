import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  // const navMeta = getMetadata('nav');
  // const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  // const fragment = await loadFragment(navPath);

  // // decorate nav DOM
  // block.textContent = '';
  // const nav = document.createElement('nav');
  // nav.id = 'nav';
  // while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // const classes = ['brand', 'sections', 'tools'];
  // classes.forEach((c, i) => {
  //   const section = nav.children[i];
  //   if (section) section.classList.add(`nav-${c}`);
  // });

  // const navBrand = nav.querySelector('.nav-brand');
  // const brandLink = navBrand.querySelector('.button');
  // if (brandLink) {
  //   brandLink.className = '';
  //   brandLink.closest('.button-container').className = '';
  // }

  // const navSections = nav.querySelector('.nav-sections');
  // if (navSections) {
  //   navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
  //     if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
  //     navSection.addEventListener('click', () => {
  //       if (isDesktop.matches) {
  //         const expanded = navSection.getAttribute('aria-expanded') === 'true';
  //         toggleAllNavSections(navSections);
  //         navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  //       }
  //     });
  //   });
  // }

  // // hamburger for mobile
  // const hamburger = document.createElement('div');
  // hamburger.classList.add('nav-hamburger');
  // hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
  //     <span class="nav-hamburger-icon"></span>
  //   </button>`;
  // hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  // nav.prepend(hamburger);
  // nav.setAttribute('aria-expanded', 'false');
  // // prevent mobile nav behavior on window resize
  // toggleMenu(nav, navSections, isDesktop.matches);
  // isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  // const navWrapper = document.createElement('div');
  // navWrapper.className = 'nav-wrapper';
  // navWrapper.append(nav);
  // block.append(navWrapper);


  block.append(generateHeader());
  attachEventListeners();
}


// Header component data
// Header component data
const headerData = {
  logo: {
    text: 'Groceyish',
    svg: `<svg width="60" height="60" viewBox="120 20 40 40" fill="none">
      <path d="M133.284 40.1273C132.637 40.3787 131.905 40.1045 131.586 39.4875L125.644 28.0465C124.951 26.6906 125.477 25.0377 126.832 24.3445C126.916 24.3064 126.992 24.2683 127.076 24.2303C128.607 23.6133 130.291 24.5121 130.717 26.066L130.725 26.0889L134.099 38.5125C134.274 39.1752 133.924 39.876 133.284 40.1273Z" fill="#F98500"/>
      <path d="M140.452 28.9375C139.941 28.5871 139.683 27.9701 139.797 27.3532C140.079 25.9364 139.165 24.5576 137.74 24.2682C137.725 24.2682 137.702 24.2606 137.687 24.2606C137.1 24.1616 136.613 23.7426 136.43 23.1713C136.384 23.0342 136.331 22.8971 136.27 22.7676C135.623 21.4727 134.053 20.9471 132.758 21.5946C131.532 22.2039 130.984 23.6588 131.502 24.9233C131.768 25.5783 131.898 26.1725 131.448 26.8047C130.61 27.9854 130.892 29.6231 132.073 30.4534C132.081 30.461 132.096 30.4686 132.103 30.4762C132.614 30.8342 132.858 31.4588 132.736 32.0682C132.461 33.485 133.391 34.8637 134.815 35.1379C136.095 35.3817 137.352 34.658 137.786 33.4317C139.081 34.0791 140.65 33.5459 141.297 32.2586C141.876 31.0932 141.518 29.684 140.452 28.9375Z" fill="#598C44"/>
      <path d="M146.393 31.0324C146.051 30.5144 146.043 29.8441 146.378 29.3185C147.178 28.115 146.843 26.4849 145.639 25.6851C145.624 25.6775 145.609 25.6622 145.594 25.6546C144.847 25.1824 144.901 24.512 144.84 23.7427C144.733 22.3031 143.469 21.2214 142.029 21.3281C140.665 21.4347 139.607 22.5697 139.607 23.9408C139.607 24.6491 139.5 25.2433 138.852 25.6622C137.634 26.4392 137.276 28.0616 138.06 29.2804C138.068 29.288 138.076 29.3032 138.083 29.3109C138.418 29.8365 138.418 30.5068 138.068 31.0247C137.283 32.2359 137.626 33.8583 138.837 34.6505C139.927 35.3589 141.374 35.1609 142.227 34.1859C143.187 35.2675 144.84 35.3741 145.921 34.422C146.896 33.5689 147.094 32.1216 146.393 31.0324Z" fill="#5F9548"/>
      <path d="M145.594 32.2969V54.2344H127.312V32.2969L129.141 33.5156L130.969 32.2969L132.797 33.5156L134.625 32.2969L136.453 33.5156L138.281 32.2969L140.109 33.5156L141.938 32.2969L143.766 33.5156L145.594 32.2969Z" fill="#FFB531"/>
      <path d="M152.906 32.2969V54.2344H145.594V32.2969L147.422 33.5156L149.25 32.2969L151.078 33.5156L152.906 32.2969Z" fill="#F98500"/>
    </svg>`
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
      svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M9.405 1.05C10.182 0.842 11.009 1.05 11.595 1.605L15.595 5.605C15.982 5.992 16.205 6.518 16.205 7.065V16.065C16.205 17.17 15.31 18.065 14.205 18.065H2.205C1.1 18.065 0.205 17.17 0.205 16.065V7.065C0.205 6.518 0.428 5.992 0.815 5.605L4.815 1.605C5.401 1.05 6.228 0.842 7.005 1.05H9.405Z" fill="#3BB77E"/>
      </svg>`
    },
    {
      id: 'account',
      badge: 1,
      svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 21C10.758 21 9.589 20.526 8.707 19.707C7.826 18.889 7.293 17.758 7.293 16.5C7.293 15.242 7.826 14.111 8.707 13.293C9.589 12.474 10.758 12 12 12C13.242 12 14.411 12.474 15.293 13.293C16.174 14.111 16.707 15.242 16.707 16.5C16.707 17.758 16.174 18.889 15.293 19.707C14.411 20.526 13.242 21 12 21Z" fill="#253D4E"/>
      </svg>`
    },
    {
      id: 'cart',
      badge: 1,
      svg: `<svg width="24" height="24" viewBox="999 30.5 24 24" fill="none">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M999 31.5C999 30.9477 999.448 30.5 1000 30.5H1004C1004.48 30.5 1004.89 30.8364 1004.98 31.3037L1005.82 35.5H1022C1022.3 35.5 1022.58 35.6329 1022.77 35.8626C1022.96 36.0922 1023.04 36.3946 1022.98 36.6873L1021.38 45.0848C1021.24 45.7754 1020.87 46.3958 1020.32 46.8373C1019.77 47.2766 1019.09 47.511 1018.39 47.5H1008.69C1007.99 47.511 1007.31 47.2766 1006.76 46.8373C1006.21 46.3959 1005.84 45.7759 1005.7 45.0857L1004.03 36.7392L1003.18 32.5H1000C999.448 32.5 999 32.0523 999 31.5Z" fill="#253D4E"/>
      </svg>`
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
    phone: '1900 - 888',
    hours: '24/7 Support Center',
    icon: `<svg width="24" height="24" viewBox="1078 105 24 24" fill="none">
      <path d="M20 15.5C18.75 15.5 17.55 15.3 16.43 14.93C16.08 14.82 15.69 14.9 15.41 15.17L13.21 17.37C10.38 15.93 8.06 13.62 6.62 10.79L8.82 8.58C9.1 8.31 9.18 7.92 9.07 7.57C8.7 6.45 8.5 5.25 8.5 4C8.5 3.45 8.05 3 7.5 3H4C3.45 3 3 3.45 3 4C3 13.39 10.61 21 20 21C20.55 21 21 20.55 21 20V16.5C21 15.95 20.55 15.5 20 15.5Z" fill="#3BB77E"/>
    </svg>`
  }
};

// Render header component
function generateHeader() {
  const headerHTML = `
    <header class="header">
      <!-- Top Bar -->
      <div class="header__top-bar">
        <!-- Logo Section -->
        <div class="header__logo-section">
          <div class="header__logo-icon">
            ${headerData.logo.svg}
          </div>
          <div class="header__logo-text">
            <h1>${headerData.logo.text}</h1>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="header__search-container">
          <input type="text" placeholder="${headerData.search.placeholder}" class="header__search-input">
          <button class="header__search-button" aria-label="Search">
            ${headerData.search.icon}
          </button>
        </div>

        <!-- Right Icons -->
        <div class="header__icons">
          ${headerData.icons.map(icon => `
            <div class="header__icon-item" data-icon="${icon.id}">
              ${icon.svg}
              <span class="header__badge ${icon.id === 'cart' ? 'header__badge--cart' : ''}">${icon.badge}</span>
            </div>
          `).join('')}
        </div>
      </div>

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
          ${headerData.contact.icon}
          <span class="header__contact-phone">${headerData.contact.phone}</span>
          <span class="header__contact-hours">${headerData.contact.hours}</span>
        </div>
      </div>
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