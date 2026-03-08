import { transformRecipeImagePath } from '../../../../scripts/blocks-utils.js';

export default function itemTemplateFunction({
  item, html, components,
}) {
  const recipeImage = item.image ? transformRecipeImagePath(item.image) : '';
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteIndexName = item.__autocomplete_indexName;
  // eslint-disable-next-line no-underscore-dangle
  const autocompleteQueryId = item.__autocomplete_queryID;
  return html`
      <div data-indexname="${autocompleteIndexName}" 
           data-insights-query-id="${autocompleteQueryId}"
           data-insights-object-id="${item.objectID}" 
           class="algolia-analytics">
        <a href="/recipes?rid=${item.objectID}"
           class="u-flex u-align recipe-click"
           style="text-decoration: none; color: inherit;">
          <img src="${recipeImage}" width="28px" alt="${item.name || 'Recipe'}"
          />
          <h6>
            ${components.Highlight({
              hit: item,
              attribute: 'name',
            })}
          </h6>
        </a>
      </div>`;    
}
