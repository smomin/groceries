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

  const fragmentContent = fragment.querySelector(':scope .default-content-wrapper');

  const companyName = fragmentContent.firstElementChild.textContent;
  const copyrightText = fragmentContent.lastElementChild.textContent;

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
  const logoIcon = createTag('div', {  });
  logoIcon.innerHTML = `<img src="/icons/logo.svg" alt="${companyName} Logo" />`;
  const logoText = createTag('div', { class: 'footer-logo-text' });
  const brandName = createTag('h2', { class: 'footer-brand-name' }, companyName);
  // const brandSubtitle = createTag('p', { class: 'footer-brand-subtitle' }, 'GROCERY');
  
  logoText.appendChild(brandName);
  // logoText.appendChild(brandSubtitle);
  companyLogo.appendChild(logoIcon);
  companyLogo.appendChild(logoText);
  
  const contactInfo = createTag('div', { class: 'footer-contact-info' });
  const contactItems = [
    { icon: 'location', text: 'Address: 1762 School House Road', html: `<img src="/icons/location.svg" alt="Location Icon" />` },
    { icon: 'phone', text: 'Call Us: 1233-777', html: `<img src="/icons/phone.svg" alt="Phone Icon" />` },
    { icon: 'email', text: 'Email: groceyish@contact.com', html: `<img src="/icons/email.svg" alt="Email Icon" />` },
    { icon: 'clock', text: 'Work hours: 8:00 - 20:00, Sunday - Thursday', html: `<img src="/icons/clock.svg" alt="Clock Icon" />` }
  ];
  
  contactItems.forEach(item => {
    const contactItem = createTag('div', { class: 'footer-contact-item' });
    const icon = createTag('div', { });
    icon.innerHTML = item.html;
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
  copyright.appendChild(createTag('p', { class: 'footer-copyright-text' }, copyrightText));
  
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
    { name: 'facebook', icon: '<svg height="100%" style="fill:currentColor" version="1.1" viewBox="0 0 512 512" width="100%" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M374.244,285.825l14.105,-91.961l-88.233,0l0,-59.677c0,-25.159 12.325,-49.682 51.845,-49.682l40.116,0l0,-78.291c0,0 -36.407,-6.214 -71.213,-6.214c-72.67,0 -120.165,44.042 -120.165,123.775l0,70.089l-80.777,0l0,91.961l80.777,0l0,222.31c16.197,2.541 32.798,3.865 49.709,3.865c16.911,0 33.511,-1.324 49.708,-3.865l0,-222.31l74.128,0Z" style="fill-rule:nonzero;"/></svg>' },
    { name: 'linkedin', icon: '<svg enable-background="new 0 0 32 32" height="32px" id="Layer_1" version="1.0" viewBox="0 0 32 32" width="32px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="currentColor" height="23" width="7" y="9"/><path d="M24.003,9C20,9,18.89,10.312,18,12V9h-7v23h7V19c0-2,0-4,3.5-4s3.5,2,3.5,4v13h7V19C32,13,31,9,24.003,9z" fill="currentColor"/><circle cx="3.5" cy="3.5" fill="currentColor" r="3.5"/></g><g/><g/><g/><g/><g/><g/></svg>' },
    { name: 'instagram', icon: '<svg style="fill:currentColor" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 56.7 56.7" enable-background="new 0 0 56.7 56.7" xml:space="preserve"><g><path d="M28.2,16.7c-7,0-12.8,5.7-12.8,12.8s5.7,12.8,12.8,12.8S41,36.5,41,29.5S35.2,16.7,28.2,16.7z M28.2,37.7   c-4.5,0-8.2-3.7-8.2-8.2s3.7-8.2,8.2-8.2s8.2,3.7,8.2,8.2S32.7,37.7,28.2,37.7z"/><circle cx="41.5" cy="16.4" r="2.9"/><path d="M49,8.9c-2.6-2.7-6.3-4.1-10.5-4.1H17.9c-8.7,0-14.5,5.8-14.5,14.5v20.5c0,4.3,1.4,8,4.2,10.7c2.7,2.6,6.3,3.9,10.4,3.9   h20.4c4.3,0,7.9-1.4,10.5-3.9c2.7-2.6,4.1-6.3,4.1-10.6V19.3C53,15.1,51.6,11.5,49,8.9z M48.6,39.9c0,3.1-1.1,5.6-2.9,7.3   s-4.3,2.6-7.3,2.6H18c-3,0-5.5-0.9-7.3-2.6C8.9,45.4,8,42.9,8,39.8V19.3c0-3,0.9-5.5,2.7-7.3c1.7-1.7,4.3-2.6,7.3-2.6h20.6   c3,0,5.5,0.9,7.3,2.7c1.7,1.8,2.7,4.3,2.7,7.2V39.9L48.6,39.9z"/></g></svg>' },
    { name: 'twitter', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1227" viewBox="0 0 1200 1227" style="fill:currentColor"><g clip-path="url(#clip0_1_2)"><path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" fill="currentColor"/></g><defs><clipPath id="clip0_1_2"><rect width="1200" height="1227" fill="white"/></clipPath></defs></svg>' }
  ];
  
  socialPlatforms.forEach(platform => {
    const socialIcon = createTag('a', { href: '#', class: `footer-social-icon ${platform.name}` });
    socialIcon.innerHTML = platform.icon;
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


  // // Add Adobe Launch script
  // const script = document.createElement('script');
  // script.src = 'https://assets.adobedtm.com/d81baa594224/e2a1d7308ed3/launch-05cfb264aa57-development.min.js';
  // script.async = true;
  // footer.appendChild(script);


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