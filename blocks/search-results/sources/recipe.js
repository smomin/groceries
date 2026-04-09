export const SOURCE_INDEX_NAME = 'SW-Groceries-PROD-US-EN-Recipes';
export const SOURCE_SHOW_ACTIVE_REFINEMENTS = true;
export const SOURCE_HIT_TEMPLATE = 'recipeTemplate';
export const SOURCE_NO_RESULTS_TEMPLATE = 'recipeTemplate';
export const SOURCE_NUMERIC_FACET_ATTRIBUTES = ['cookingduration', 'preparationduration'];

/** Ask Algolia for facet counts on every facetable attribute on this index. */
export const SOURCE_CONFIGURE = {
  facets: ['*'],
  maxValuesPerFacet: 100,
};

/** Requires matching `attributesForFaceting` / numeric facets on the recipe index. */
export const SOURCE_FACET_CONFIGS = [
  {
    widgetType: 'refinementList',
    facetTitle: 'Cuisine',
    facetName: 'cuisine',
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Course',
    facetName: 'course',
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Dietary preferences',
    facetName: 'dietarypreferences',
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Level',
    facetName: 'level',
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Meal type',
    facetName: 'mealtype',
  },
  {
    widgetType: 'rangeSlider',
    facetTitle: 'Cooking duration (minutes)',
    facetName: 'cookingduration',
  },
  {
    widgetType: 'rangeSlider',
    facetTitle: 'Preparation duration (minutes)',
    facetName: 'preparationduration',
  },
];
