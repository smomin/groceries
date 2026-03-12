export default function mainTemplate({ indexName, hasFacets }) {
  return `
    <div class="search-container" data-indexname="${indexName}">
      <div id="searchbox"></div>
      <div class="search-panel">
        ${hasFacets ? '<aside id="facets" class="search-panel__filters"></aside>' : ''}
        <div class="search-panel__results">
          <div id="hits"></div>
          <div id="pagination"></div>
        </div>
      </div>
    </div>
  `;
}
