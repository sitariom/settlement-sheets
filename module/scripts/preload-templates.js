/* global loadTemplates */

export async function _preloadTemplates () {
  const templatePaths = [
    // Actor Sheet Partials
    'modules/settlement-sheets/templates/parts/settlement/overview.hbs',
    'modules/settlement-sheets/templates/parts/settlement/places.hbs',
    'modules/settlement-sheets/templates/parts/settlement/statistics.hbs',
    'modules/settlement-sheets/templates/parts/settlement/buildings.hbs',
    'modules/settlement-sheets/templates/parts/settlement/events.hbs',
    'modules/settlement-sheets/templates/parts/settlement/notes.hbs',
    // Item Sheet Partials
    'modules/settlement-sheets/templates/parts/building/overview.hbs',
    'modules/settlement-sheets/templates/parts/building/statistics.hbs',
    'modules/settlement-sheets/templates/parts/building/notes.hbs'
  ]

  return loadTemplates(templatePaths)
}
