import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  
  // Top Feature Section
  const featureSection = createTag('div', { class: 'footer-features' });
  const featureContainer = createTag('div', { class: 'footer-features-container' });
  
  const features = [
    {
      icon: 'price-tag',
      title: 'Best Prices & Deals',
      description: 'Don\'t miss our daily amazing deals and prices'
    },
    {
      icon: 'refund',
      title: 'Refundable',
      description: 'If your items have damage we agree to refund it'
    },
    {
      icon: 'delivery',
      title: 'Free delivery',
      description: 'Do purchase over $50 and get free delivery anywhere'
    }
  ];
  
  features.forEach(feature => {
    const featureItem = createTag('div', { class: 'footer-feature-item' });
    const icon = createTag('div', { class: `footer-feature-icon ${feature.icon}` });
    const content = createTag('div', { class: 'footer-feature-content' });
    const title = createTag('h3', { class: 'footer-feature-title' }, feature.title);
    const description = createTag('p', { class: 'footer-feature-description' }, feature.description);
    
    content.appendChild(title);
    content.appendChild(description);
    featureItem.appendChild(icon);
    featureItem.appendChild(content);
    featureContainer.appendChild(featureItem);
  });
  
  featureSection.appendChild(featureContainer);
  
  // Main Footer Content
  const mainFooter = createTag('div', { class: 'footer-main' });
  const mainContainer = createTag('div', { class: 'footer-main-container' });
  
  // Company Information Column
  const companyColumn = createTag('div', { class: 'footer-column footer-company' });
  const companyLogo = createTag('div', { class: 'footer-logo' });
  const logoIcon = createTag('div', { class: 'footer-logo-icon' });
  const logoText = createTag('div', { class: 'footer-logo-text' });
  const brandName = createTag('h2', { class: 'footer-brand-name' }, 'Groceyish');
  const brandSubtitle = createTag('p', { class: 'footer-brand-subtitle' }, 'GROCERY');
  
  logoText.appendChild(brandName);
  logoText.appendChild(brandSubtitle);
  companyLogo.appendChild(logoIcon);
  companyLogo.appendChild(logoText);
  
  const contactInfo = createTag('div', { class: 'footer-contact-info' });
  const contactItems = [
    { icon: 'location', text: 'Address: 1762 School House Road' },
    { icon: 'phone', text: 'Call Us: 1233-777' },
    { icon: 'email', text: 'Email: groceyish@contact.com' },
    { icon: 'clock', text: 'Work hours: 8:00 - 20:00, Sunday - Thursday' }
  ];
  
  contactItems.forEach(item => {
    const contactItem = createTag('div', { class: 'footer-contact-item' });
    const icon = createTag('div', { class: `footer-contact-icon ${item.icon}` });
    const text = createTag('span', { class: 'footer-contact-text' }, item.text);
    
    contactItem.appendChild(icon);
    contactItem.appendChild(text);
    contactInfo.appendChild(contactItem);
  });
  
  companyColumn.appendChild(companyLogo);
  companyColumn.appendChild(contactInfo);
  
  // Account Links Column
  const accountColumn = createTag('div', { class: 'footer-column footer-account' });
  const accountTitle = createTag('h3', { class: 'footer-column-title' }, 'Account');
  const accountLinks = createTag('ul', { class: 'footer-links' });
  const accountLinkItems = ['Wishlist', 'Cart', 'Track Order', 'Shipping Details'];
  
  accountLinkItems.forEach(linkText => {
    const linkItem = createTag('li', { class: 'footer-link-item' });
    const link = createTag('a', { href: '#', class: 'footer-link' }, linkText);
    linkItem.appendChild(link);
    accountLinks.appendChild(linkItem);
  });
  
  accountColumn.appendChild(accountTitle);
  accountColumn.appendChild(accountLinks);
  
  // Useful Links Column
  const usefulColumn = createTag('div', { class: 'footer-column footer-useful' });
  const usefulTitle = createTag('h3', { class: 'footer-column-title' }, 'Useful links');
  const usefulLinks = createTag('ul', { class: 'footer-links' });
  const usefulLinkItems = ['About Us', 'Contact', 'Hot deals', 'Promotions', 'New products'];
  
  usefulLinkItems.forEach(linkText => {
    const linkItem = createTag('li', { class: 'footer-link-item' });
    const link = createTag('a', { href: '#', class: 'footer-link' }, linkText);
    linkItem.appendChild(link);
    usefulLinks.appendChild(linkItem);
  });
  
  usefulColumn.appendChild(usefulTitle);
  usefulColumn.appendChild(usefulLinks);
  
  // Help Center Column
  const helpColumn = createTag('div', { class: 'footer-column footer-help' });
  const helpTitle = createTag('h3', { class: 'footer-column-title' }, 'Help Center');
  const helpLinks = createTag('ul', { class: 'footer-links' });
  const helpLinkItems = ['Payments', 'Refund', 'Checkout', 'Shipping', 'Q&A', 'Privacy Policy'];
  
  helpLinkItems.forEach(linkText => {
    const linkItem = createTag('li', { class: 'footer-link-item' });
    const link = createTag('a', { href: '#', class: 'footer-link' }, linkText);
    linkItem.appendChild(link);
    helpLinks.appendChild(linkItem);
  });
  
  helpColumn.appendChild(helpTitle);
  helpColumn.appendChild(helpLinks);
  
  mainContainer.appendChild(companyColumn);
  mainContainer.appendChild(accountColumn);
  mainContainer.appendChild(usefulColumn);
  mainContainer.appendChild(helpColumn);
  mainFooter.appendChild(mainContainer);
  
  // Bottom Footer Section
  const bottomFooter = createTag('div', { class: 'footer-bottom' });
  const bottomContainer = createTag('div', { class: 'footer-bottom-container' });
  
  // Copyright
  const copyright = createTag('div', { class: 'footer-copyright' });
  const copyrightText = createTag('p', { class: 'footer-copyright-text' }, '© 2022, All rights reserved');
  copyright.appendChild(copyrightText);
  
  // Payment Methods
  const paymentMethods = createTag('div', { class: 'footer-payment-methods' });
  const paymentTitle = createTag('h4', { class: 'footer-payment-title' }, 'Payment Methods');
  const paymentIcons = createTag('div', { class: 'footer-payment-icons' });
  const paymentCards = ['visa', 'mastercard', 'maestro', 'amex'];
  
  paymentCards.forEach(card => {
    const cardIcon = createTag('div', { class: `footer-payment-icon ${card}` });
    paymentIcons.appendChild(cardIcon);
  });
  
  paymentMethods.appendChild(paymentTitle);
  paymentMethods.appendChild(paymentIcons);
  
  // Social Media
  const socialMedia = createTag('div', { class: 'footer-social-media' });
  const socialTitle = createTag('h4', { class: 'footer-social-title' }, 'Follow Us');
  const socialIcons = createTag('div', { class: 'footer-social-icons' });
  const socialPlatforms = [
    { name: 'facebook', icon: 'f' },
    { name: 'linkedin', icon: 'in' },
    { name: 'instagram', icon: 'camera' },
    { name: 'twitter', icon: 'bird' }
  ];
  
  socialPlatforms.forEach(platform => {
    const socialIcon = createTag('a', { href: '#', class: `footer-social-icon ${platform.name}` });
    const iconText = createTag('span', { class: 'footer-social-icon-text' }, platform.icon);
    socialIcon.appendChild(iconText);
    socialIcons.appendChild(socialIcon);
  });
  
  socialMedia.appendChild(socialTitle);
  socialMedia.appendChild(socialIcons);
  
  bottomContainer.appendChild(copyright);
  bottomContainer.appendChild(paymentMethods);
  bottomContainer.appendChild(socialMedia);
  bottomFooter.appendChild(bottomContainer);
  
  // Assemble footer
  footer.appendChild(featureSection);
  footer.appendChild(mainFooter);
  footer.appendChild(bottomFooter);

  block.append(footer);
}

function createTag(tag, attributes, content) {
  const element = document.createElement(tag);
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  if (content) {
    element.textContent = content;
  }
  return element;
}