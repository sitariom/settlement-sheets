/* global game, foundry, ActorSheet, TextEditor, fromUuidSync, renderTemplate */

// Extend the base ActorSheet and put all our functionality here.
export class SettlementActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions () {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['settlement-sheet'],
      template: 'modules/settlement-sheets/templates/settlement-sheet.hbs',
      width: 600,
      height: 750,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'overview'
      }],
      dragDrop: [{
        dragSelector: '.entity.actor.settlement-sheets.building',
        dropSelector: null
      }]
    })
  }

  /** @override */
  get template () {
    if (!game.user.isGM && this.actor.limited) return 'modules/settlement-sheets/templates/settlement-sheet-limited.hbs'
    return 'modules/settlement-sheets/templates/settlement-sheet.hbs'
  }

  /* -------------------------------------------- */

  /** @override */
  async getData (options = {}) {
    // Define the context we're using
    const context = await super.getData(options)

    // Generate quick references in the context for permissions levels
    if (!game.user.isGM && this.actor.limited) context.permissions = 'limited'
    if (!game.user.isGM && this.actor.permission === 2) context.permissions = 'observer'
    if (game.user.isGM || this.actor.isOwner) context.permissions = 'owner'
    
    // Define se o formulário é editável
    context.editable = this.isEditable

    // Prepare items.
    await this._prepareItems(context)

    // Manipulate any data in this context that we need to

    // Tracker data from settings
    const statisticsList = game.settings.get('settlement-sheets', 'sheetStatistics')
    // Tracker data from the actor
    const trackerData = this.actor.system.trackers

    // Make some header and page tracker arrays
    context.header_trackers = []
    context.page_trackers = []

    // Clean up non-existent statistics, such as custom ones that no longer exist
    const validStatistics = new Set(Object.keys(statisticsList))
    // Garantir que trackerData existe antes de tentar iterar sobre ele
    if (trackerData) {
      for (const id of Object.keys(trackerData)) {
        if (!validStatistics.has(id)) {
          delete trackerData[id]
        }
      }
    } else {
      // Inicializar trackerData se for nulo ou indefinido
      this.actor.system.trackers = {}
      trackerData = this.actor.system.trackers
    }

    for (const [id, value] of Object.entries(statisticsList)) {
      let statisticData = {}

      // If the context has a tracker with the key, grab its current value
      if (Object.prototype.hasOwnProperty.call(trackerData, id)) {
        statisticData = Object.assign({}, value, {
          id,
          value: trackerData[id].value
        })
      } else { // Otherwise, add it to the context and set it as some default data
        // Determine the correct default value to use based on type
        let defaultValue
        if (value.type === 'number') {
          defaultValue = 0
        } else if (value.type === 'string') {
          defaultValue = ''
        }
        // Add to the actor sheet
        await this.actor.update({
          [`system.trackers.${id}`]: {
            value: defaultValue
          }
        })

        // Assign the same data to the context
        statisticData = Object.assign({}, value, {
          id,
          value: defaultValue
        })
      }

      // Push to either header_trackers or page_trackers depending on showInHeader
      // as long as showOnSettlement is true
      if (statisticData.showOnSettlement && (context.permissions === 'owner' || statisticData.showToPlayers)) {
        if (statisticData.showInHeader) {
          context.header_trackers.push(statisticData)
        } else {
          context.page_trackers.push(statisticData)
        }
      }
    }

    // The description field
    context.description = await TextEditor.enrichHTML(this.object.system.description, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    // Influential people
    context.influentialPeople = await TextEditor.enrichHTML(this.object.system.influentialPeople, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    // Places tab fields
    context.demographics = await TextEditor.enrichHTML(this.object.system.demographics, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    context.taverns = await TextEditor.enrichHTML(this.object.system.taverns, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    context.shops = await TextEditor.enrichHTML(this.object.system.shops, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    context.temples = await TextEditor.enrichHTML(this.object.system.temples, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    context.notablePlaces = await TextEditor.enrichHTML(this.object.system.notablePlaces, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    // Events tab field
    context.events = await TextEditor.enrichHTML(this.object.system.events, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })

    // Private and Public notes
    context.note = {
      public: await TextEditor.enrichHTML(this.object.system.note.public, {
        async: true,
        secrets: this.object.isOwner,
        relativeTo: this.object
      }),
      private: await TextEditor.enrichHTML(this.object.system.note.private, {
        async: true,
        secrets: this.object.isOwner,
        relativeTo: this.object
      })
    }

    // Return the context once we're done with our changes
    return context
  }

  async _prepareItems (context) {
    // Grab the list of statistics from the settings
    const statisticsList = game.settings.get('settlement-sheets', 'sheetStatistics')

    // Empty array to hold the buildings list in
    const buildings = []

    // Garantir que context.actor.system.trackers existe
    if (!context.actor.system.trackers) {
      context.actor.system.trackers = {}
    }
    
    // Initialize or reset each value in the settlement's trackers
    for (const [tracker, details] of Object.entries(statisticsList)) {
      if (details.type === 'number') {
        // Initialize the tracker if it doesn't already exist
        if (!context.actor.system.trackers[tracker]) {
          context.actor.system.trackers[tracker] = { value: 0, ...details }
        } else {
          // Reset only the value while preserving other data
          context.actor.system.trackers[tracker].value = 0
        }
      }
    }

    // Iterate through items, allocating to containers
    for (const i of context.items) {
      // We only work with buildings
      if (i.type === 'settlement-sheets.building') {
        // Add UUID to the building data
        i.uuid = `Actor.${this.actor.id}.Item.${i._id}`

        // Enrich building definition
        i.system.definition = await TextEditor.enrichHTML(i.system.definition || "", {
          async: true,
          secrets: this.object.isOwner,
          relativeTo: this.object
        })

        // Enrich building benefits
        i.system.benefits = await TextEditor.enrichHTML(i.system.benefits || "", {
          async: true,
          secrets: this.object.isOwner,
          relativeTo: this.object
        })

        // Garantir que o item tem system.trackers inicializado
        if (!i.system.trackers) {
          i.system.trackers = {}
        }
        
        // Iterate through each tracker in the building
        for (const [tracker, details] of Object.entries(statisticsList)) {
          if (details.type === 'number') {
            // Initialize the tracker with a default value if it doesn't already exist
            if (!context.actor.system.trackers[tracker]) {
              context.actor.system.trackers[tracker] = {
                value: 0
              }
            }

            // Add the item's tracker's value to the corresponding total
            context.actor.system.trackers[tracker].value += i.system.trackers[tracker]?.value || 0
          }
        }

        // Append to the buildings list
        buildings.push(i)
      }
    }

    // Assign the list of buildings to the context
    context.buildings = buildings
  }

  // Activate any listeners
  activateListeners (html) {
    // Activate listeners
    super.activateListeners(html)

    // Open an existing building on the sheet
    html.find('.open-building').click(this._onOpenBuilding.bind(this))

    // Create a new building on the sheet
    html.find('.add-building').click(this._onAddBuilding.bind(this))

    // Remove a new building from the sheet
    html.find('.remove-building').click(this._onRemoveBuilding.bind(this))
    
    // Não precisamos de manipulação adicional para os editores
    // O conteúdo será exibido corretamente através do template
  }

  // Handle opening an existing building in a settlement
  async _onOpenBuilding (event) {
    event.preventDefault()

    const dataset = event.currentTarget.dataset
    const buildingUuid = dataset.uuid

    fromUuidSync(buildingUuid).sheet.render(true)
  }

  // Handle adding a new building to a settlement
  async _onAddBuilding (event) {
    event.preventDefault()

    // Create the new building in the settlement
    const newBuilding = await this.actor.createEmbeddedDocuments('Item', [{
      name: game.i18n.localize('settlement-sheets.NewBuilding'),
      type: 'settlement-sheets.building'
    }])

    // Open the new building for editing
    newBuilding[0].sheet.render(true)
    
    // Re-render the settlement sheet to update the buildings list
    this.render(true)
  }

  // Handle removing a building from a settlement
  async _onRemoveBuilding (event) {
    event.preventDefault()

    const dataset = event.currentTarget.dataset
    const buildingUuid = dataset.uuid
    const building = fromUuidSync(buildingUuid)

    const template = 'modules/settlement-sheets/templates/remove-building-dialog.hbs'
    const data = {
      name: building.name
    }
    const content = await renderTemplate(template, data)

    foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n.localize('settlement-sheets.RemoveBuilding')
      },
      content,
      buttons: [
        {
          action: 'confirm',
          label: game.i18n.localize('settlement-sheets.RemoveBuilding'),
          icon: 'fas fa-check',
          callback: async () => {
            this.actor.deleteEmbeddedDocuments('Item', [building.id])
          }
        },
        {
          action: 'cancel',
          label: game.i18n.localize('Cancel'),
          icon: 'fa-solid fa-xmark'
        }
      ]
    })
  }

  /** @override */
  async _onSubmit(event, {updateData=null, preventClose=false, preventRender=false}={}) {
    // Capturar o conteúdo dos editores antes do envio do formulário
    const form = this.element.find('form').get(0);
    const editorElements = form.querySelectorAll('.editor-content');
    
    // Criar um objeto para armazenar os dados atualizados
    const formData = {};
    
    // Capturar o conteúdo de todos os editores
    for (let editor of editorElements) {
      const target = editor.dataset.edit;
      if (target) {
        formData[target] = editor.innerHTML;
      }
    }
    
    // Mesclar os dados capturados com os dados de atualização existentes
    updateData = foundry.utils.mergeObject(updateData || {}, formData);
    
    // Continuar com o envio padrão
    const result = await super._onSubmit(event, {updateData, preventClose, preventRender});
    
    // Forçar uma re-renderização completa para garantir que os dados atualizados sejam exibidos
    if (!preventRender) {
      this.render(true);
    }
    
    return result;
  }
  

}
