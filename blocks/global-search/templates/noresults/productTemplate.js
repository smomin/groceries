import { transformProductImagePath, formatPrice } from '../../../../scripts/blocks-utils.js';

export function renderNoResultsFunction({ state, render }, root) {
  render(`No products found for "${state.query}".`, root);
}
