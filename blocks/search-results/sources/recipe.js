export const SOURCE_INDEX_NAME = 'SW-Groceries-PROD-US-EN-Recipes';
export const SOURCE_HIT_TEMPLATE = 'recipeTemplate';
export const SOURCE_NO_RESULTS_TEMPLATE = 'recipeTemplate';

/** Ask Algolia for facet counts on every facetable attribute on this index. */
export const SOURCE_CONFIGURE = {
  facets: ['*'],
  maxValuesPerFacet: 100,
};

/** Requires matching `attributesForFaceting` / numeric facets on the recipe index. */
export const SOURCE_FACET_CONFIGS = [
  {
    widgetType: 'rangeSlider',
    facetTitle: 'Cooking duration (minutes)',
    facetName: 'cookingduration',
  },
  {
    widgetType: 'rangeSlider',
    facetTitle: 'Preparation duration (minutes)',
    facetName: 'preparationduration',
    max: 65,
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Course',
    facetName: 'course',
  },
  {
    widgetType: 'refinementList',
    facetTitle: 'Cuisine',
    facetName: 'cuisine',
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
];
