import { transformProductImagePath, formatPrice } from '../../../scripts/blocks-utils.js';

export function productTemplate(hit, { html, components }) {
  const productImage = transformProductImagePath(item.image);
  return html`<a
      data-insights-query-id="${item.__autocomplete_queryID}" 
      data-insights-object-id="${item.objectID}" 
      href="/products?pid=${item.objectID}"
      class="u-flex u-align algolia-analytics"
      style="text-decoration: none; color: inherit;"
    >
      <img
        src="${productImage}"
        width="28px"
        alt="${item.name || 'Product'}"
      />
      <h6>
        ${components.Highlight({
          hit: item,
          attribute: 'name',
        })}
      </h6>
    </a>`;
}