import { transformRecipeImagePath } from '../../../scripts/blocks-utils.js';

export function recipeTemplate(hit, { html, components }) {    
  const recipeImage = item.image ? transformRecipeImagePath(item.image) : '';
    return html`<a
        data-insights-query-id="${item.__autocomplete_queryID}" 
        data-insights-object-id="${item.objectID}" 
        href="/recipes?rid=${item.objectID}"
        class="u-flex u-align algolia-analytics"
        style="text-decoration: none; color: inherit;"
      >
        ${recipeImage ? html`<img
          src="${recipeImage}"
          width="28px"
          alt="${item.name || 'Recipe'}"
        />` : ''}
        <h6>
          ${components.Highlight({
            hit: item,
            attribute: 'name',
          })}
        </h6>
      </a>`;
}