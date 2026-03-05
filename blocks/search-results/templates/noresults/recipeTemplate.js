export default function renderNoResultsFunction({ state, render }, root) {
  render(`No recipes found for "${state.query}".`, root);
}
