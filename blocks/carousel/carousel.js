import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  block.append(generateHeroCarousel(block));

  // Initialize carousel functionality
  initCarousel();
}

// Carousel State
let currentSlide = 0;
let autoSlideInterval;
const heroSlides = [];

// Render Hero Carousel
function generateHeroCarousel(block) {
    const heroSection = document.createElement('section');
    heroSection.className = 'hero-carousel';
    
    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'carousel-container';
    
    // Create carousel track
    const carouselTrack = document.createElement('div');
    carouselTrack.className = 'carousel-track';
    carouselTrack.id = 'carouselTrack';

    [...block.children].forEach((row) => {
        const slideElement = createSlide(row);
        carouselTrack.appendChild(slideElement);
    })

    
    // Create navigation arrows
    const prevArrow = createArrow('prev', -1);
    const nextArrow = createArrow('next', 1);
    
    // Create dots container
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    dotsContainer.id = 'carouselDots';
    
    // Assemble carousel
    carouselContainer.appendChild(carouselTrack);
    carouselContainer.appendChild(prevArrow);
    carouselContainer.appendChild(nextArrow);
    carouselContainer.appendChild(dotsContainer);
    heroSection.appendChild(carouselContainer);
    
    return heroSection;
}

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

// Create navigation arrow
function createArrow(direction, moveDirection) {
    const arrow = document.createElement('button');
    arrow.className = `carousel-arrow ${direction}`;
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

// Initialize carousel functionality
function initCarousel() {
    createDots();
    updateCarousel();
    startAutoSlide();
    setupEventListeners();
}

// Create navigation dots
function createDots() {
    const dotsContainer = document.getElementById('carouselDots');
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < heroSlides.length; i++) {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }
}

// Update carousel position and active states
function updateCarousel() {
    const track = document.getElementById('carouselTrack');
    if (!track) return;
    
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // Update dots
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

// Move to specific slide
function goToSlide(slideIndex) {
    currentSlide = slideIndex;
    updateCarousel();
    resetAutoSlide();
}

// Move slide by direction (-1 for prev, 1 for next)
function moveSlide(direction) {
    currentSlide += direction;
    
    // Loop around
    if (currentSlide < 0) {
        currentSlide = heroSlides.length - 1;
    } else if (currentSlide >= heroSlides.length) {
        currentSlide = 0;
    }
    
    updateCarousel();
    resetAutoSlide();
}

// Auto-slide functionality
function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
        moveSlide(1);
    }, 5000); // Change slide every 5 seconds
}

// Reset auto-slide timer
function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// Setup event listeners
function setupEventListeners() {
    const carouselContainer = document.querySelector('.carousel-container');
    
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
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            moveSlide(-1);
        } else if (e.key === 'ArrowRight') {
            moveSlide(1);
        }
    });
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