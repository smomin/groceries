export default function mainTemplate({ indexName, hasFacets, showActiveRefinements }) {
  return `
    <div class="search-container" data-indexname="${indexName}">
      <div id="searchbox"></div>
      <div class="search-panel">
        ${hasFacets ? `<aside id="facets" class="search-panel__filters">
          <h3 class="search-filters-heading">Filter by</h3>
          ${showActiveRefinements ? '<div id="current-refinements"></div><div id="clear-refinements"></div>' : ''}
        </aside>` : ''}
        <div class="search-panel__results">
          <div id="hits"></div>
          <div id="pagination"></div>
        </div>
      </div>
    </div>
  `;
}
