import { transformProductImagePath, formatPrice } from '../../../scripts/blocks-utils.js';

export function productTemplate(hit, { html, components }) {
  const productImage = transformProductImagePath(hit.image);
  return html`
    <div class="product-card algolia-analytics" data-insights-query-id="${hit.__queryID}" data-insights-object-id="${hit.objectID}" data-insights-position="${hit.__position}">
      <img class="product-card__image" src="${productImage}" alt="${hit.name}" />
      <div class="product-card__category">${hit.categories?.lvl0 || ''}</div>
      <div class="product-card__name">${components.Highlight({ attribute: 'name', hit })}</div>
      ${hit.brand
        ? html`<div class="vendor">
            <span class="vendor-label">By</span> <span style="color: #00b207;">${hit.brand}</span>
          </div>`
        : ''
      }
        <div class="product-card__footer">
        <div class="price-container">
          <span class="current-price">${formatPrice(hit.price)}</span>
        </div>
        <div class="product-card__actions">
          <a href="/products?pid=${hit.objectID}" class="view-product-btn">
            View
          </a>
          <button class="add-btn" 
                  data-product-id="${hit.objectID}"
                  data-product-name="${hit.name}"
                  data-product-price="${hit.price}"
                  data-product-description="${hit.description || hit.name}"
                  data-product-image="${productImage}">
            <span class="cart-icon"></span>
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>`;
}