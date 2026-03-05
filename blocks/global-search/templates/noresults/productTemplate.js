export default function renderNoResultsFunction({ state, render }, root) {
  render(`No products found for "${state.query}".`, root);
}
