import { moveInstrumentation } from '../../scripts/scripts.js';
import { Carousel } from '../../scripts/blocks-utils.js';

// Carousel State
let carousel;
const heroSlides = [];

// Create individual slide
function createSlide(htmlElement) {
  const slide = document.createElement('div');
  slide.className = 'carousel-slide';

  // Hero content
  const heroContent = document.createElement('div');
  heroContent.className = 'hero-content';

  const text = htmlElement.lastElementChild;
  heroContent.appendChild(text);

  // Hero image
  const heroImage = htmlElement.firstElementChild;
  heroImage.className = 'hero-image';

  // Assemble slide
  slide.appendChild(heroContent);
  slide.appendChild(heroImage);

  heroSlides.push(slide);
  return slide;
}

// Initialize carousel functionality
function initCarousel() {
  carousel = new Carousel({
    trackSelector: '#carouselTrack',
    dotsSelector: '#carouselDots',
    containerSelector: '.carousel-container',
    dotClass: 'carousel-dot',
    arrowClass: 'carousel-arrow',
    autoSlideInterval: 5000,
  });
  carousel.setSlides(heroSlides);
  carousel.init();

  // Create navigation arrows after carousel is initialized
  const carouselContainer = document.querySelector('.carousel-container');
  if (carouselContainer && heroSlides.length > 1) {
    const prevArrow = carousel.createArrow('prev', -1);
    const nextArrow = carousel.createArrow('next', 1);
    carouselContainer.insertBefore(prevArrow, carouselContainer.firstChild.nextSibling);
    carouselContainer.insertBefore(nextArrow, carouselContainer.firstChild.nextSibling);
  }
}

// Render Hero Carousel
function generateHeroCarousel() {
  const heroSection = document.createElement('section');
  heroSection.className = 'hero-carousel';

  const carouselContainer = document.createElement('div');
  carouselContainer.className = 'carousel-container';

  // Create carousel track
  const carouselTrack = document.createElement('div');
  carouselTrack.className = 'carousel-track';
  carouselTrack.id = 'carouselTrack';

  const pictures = document.querySelectorAll('div > picture');

  pictures.forEach((picture) => {
    // Get the parent parent element of the slide
    const parent = picture.parentElement.parentElement;
    const slideElement = createSlide(parent);
    moveInstrumentation(parent, slideElement);
    carouselTrack.appendChild(slideElement);
  });

  // Create dots container
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-dots';
  dotsContainer.id = 'carouselDots';

  // Assemble carousel
  carouselContainer.appendChild(carouselTrack);
  carouselContainer.appendChild(dotsContainer);
  heroSection.appendChild(carouselContainer);

  return heroSection;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  block.append(generateHeroCarousel());

  // Initialize carousel functionality
  initCarousel();
}
