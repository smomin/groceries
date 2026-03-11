export default function resultsOnlyTemplate({ indexName }) {
  return `
    <div class="search-container" data-indexname="${indexName}">
      <div class="search-panel">
        <div class="search-panel__results">
          <div id="searchbox"></div>
          <div id="hits"></div>
          <div id="pagination"></div>
        </div>
      </div>
    </div>
  `;
}
