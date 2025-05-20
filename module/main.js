/* global Hooks, CONFIG, DocumentSheetConfig, Actor, Item */

// Base Foundry scripts
import { _registerModuleSettings } from './scripts/settings.js'
import { _preloadTemplates } from './scripts/preload-templates.js'
import { _loadHelpers } from './scripts/helpers.js'
// Settlement scripts
import { SettlementModel } from './settlement/settlement-model.js'
import { SettlementActorSheet } from './settlement/settlement-actor-sheet.js'
// Building scripts
import { BuildingItemSheet } from './building/building-item-sheet.js'
import { BuildingModel } from './building/building-model.js'

// Anything that needs to be ran alongside the initialisation of the world
Hooks.once('init', () => {
  // Register the settlement actor type
  Object.assign(CONFIG.Actor.dataModels, {
    'settlement-sheets.settlement': SettlementModel
  })
  DocumentSheetConfig.registerSheet(Actor, 'settlement-sheets', SettlementActorSheet, {
    types: ['settlement-sheets.settlement'],
    makeDefault: true
  })

  // Register the building item type
  Object.assign(CONFIG.Item.dataModels, {
    'settlement-sheets.building': BuildingModel
  })
  DocumentSheetConfig.registerSheet(Item, 'settlement-sheets', BuildingItemSheet, {
    types: ['settlement-sheets.building'],
    makeDefault: true
  })

  // Input any helpers the module has
  _loadHelpers()

  // Preload any Handlebars partials we need
  _preloadTemplates()
})

Hooks.once('ready', () => {
  // Load the settings into the world
  _registerModuleSettings()
  
  // Migrar dados existentes para a nova estrutura
  _migrateExistingData()
})

// Hook para garantir que novos atores tenham trackers inicializados
Hooks.on('preCreateActor', (actor, data) => {
  if (actor.type === 'settlement-sheets.settlement') {
    // Garantir que system.trackers existe
    if (!actor.system?.trackers) {
      actor.updateSource({'system.trackers': {}})
    }
  }
})

// Hook para garantir que novos itens tenham trackers inicializados
Hooks.on('preCreateItem', (item, data) => {
  if (item.type === 'settlement-sheets.building') {
    // Garantir que system.trackers existe
    if (!item.system?.trackers) {
      item.updateSource({'system.trackers': {}})
    }
  }
})

// Função para migrar dados existentes
async function _migrateExistingData() {
  // Migrar edifícios que têm dados no campo description para o novo campo definition
  const buildings = game.items.filter(i => i.type === 'settlement-sheets.building' && 
                                      i.system.description && 
                                      !i.system.definition)
  
  for (const building of buildings) {
    // Se o edifício tem description mas não tem definition, copiar o conteúdo
    if (building.system.description && !building.system.definition) {
      await building.update({
        'system.definition': building.system.description
      })
      console.log(`Settlement-Sheets | Migrado dados de description para definition para o edifício: ${building.name}`)
    }
  }
  
  // Verificar edifícios dentro de assentamentos
  const settlements = game.actors.filter(a => a.type === 'settlement-sheets.settlement')
  
  for (const settlement of settlements) {
    const embeddedBuildings = settlement.items.filter(i => i.type === 'settlement-sheets.building' && 
                                                    i.system.description && 
                                                    !i.system.definition)
    
    if (embeddedBuildings.length > 0) {
      const updates = embeddedBuildings.map(building => ({
        _id: building.id,
        'system.definition': building.system.description
      }))
      
      await settlement.updateEmbeddedDocuments('Item', updates)
      console.log(`Settlement-Sheets | Migrado dados de ${updates.length} edifícios no assentamento: ${settlement.name}`)
    }
  }
}
