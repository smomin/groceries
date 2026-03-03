import { transformRecipeImagePath } from '../../../../scripts/blocks-utils.js';

export function renderNoResultsFunction({ state, render }, root) {
  render(`No recipes found for "${state.query}".`, root);
}