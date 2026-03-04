export function layoutTemplateFunction({ elements, render, html }, root) {
  const {
    recentSearchesPlugin: recentPlugin,
    querySuggestionsPlugin: suggestionsPlugin,
    recipes,
    products,
  } = elements;
  render(
    html`
      <div class="aa-PanelLayout aa-Panel--scrollable">
          <div class="recipes-col">${recipes}</div>
          <div class="products-col">${products}</div>
          <div class="query-recent-col">
            ${suggestionsPlugin}
            ${recentPlugin}
          </div>
      </div>
    `,
    root,
  );
}