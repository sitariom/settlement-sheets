/* global game, foundry, ItemSheet, TextEditor */

// Extend the base ActorSheet and put all our functionality here.
export class BuildingItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions () {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['building-sheet'],
      template: 'modules/settlement-sheets/templates/building-sheet.hbs',
      width: 600,
      height: 500,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'overview'
      }]
    })
  }

  /** @override */
  get template () {
    if (!game.user.isGM && this.item.limited) return 'modules/settlement-sheets/templates/building-sheet-limited.hbs'
    return 'modules/settlement-sheets/templates/building-sheet.hbs'
  }

  /* -------------------------------------------- */

  /** @override */
  async getData (options = {}) {
    // Define the context we're using
    const context = await super.getData(options)

    // Generate quick references in the context for permissions levels
    if (!game.user.isGM && this.item.limited) context.permissions = 'limited'
    if (!game.user.isGM && this.item.observer) context.permissions = 'observer'
    if (game.user.isGM || this.item.isOwner) context.permissions = 'owner'

    // Manipulate any data in this context that we need to

    // Tracker data from settings
    const statisticsList = game.settings.get('settlement-sheets', 'sheetStatistics')
    // Tracker data from the item
    const trackerData = this.item.system.trackers

    // Make a tracker array
    context.trackers = []

    // Clean up non-existent statistics, such as custom ones that no longer exist
    const validStatistics = new Set(Object.keys(statisticsList))
    for (const id of Object.keys(trackerData)) {
      if (!validStatistics.has(id)) {
        delete trackerData[id]
      }
    }

    for (const [id, value] of Object.entries(statisticsList)) {
      let statisticData = {}

      // If the context has a tracker with the key, grab its current value
      if (Object.prototype.hasOwnProperty.call(trackerData, id)) {
        statisticData = Object.assign({
          id,
          value: trackerData[id].value
        }, value)
      } else { // Otherwise, add it to the context and set it as some default data
        // Determine the correct default value to use based on type
        let defaultValue
        if (value.type === 'number') {
          defaultValue = 0
        } else if (value.type === 'string') {
          defaultValue = ''
        }
        // Add to the item sheet
        await this.item.update({
          [`system.trackers.${id}`]: {
            value: defaultValue
          }
        })

        // Assign the same data to the context
        statisticData = Object.assign({
          id,
          value: defaultValue
        }, value)
      }

      // Push to either header_trackers or page_trackers depending on showInHeader
      // as long as showOnSettlement is true
      context.trackers.push(statisticData)
    }

    // Set editable flag for the editor
    context.editable = this.isEditable
    
    // The definition field
    context.definition = await TextEditor.enrichHTML(this.object.system.definition || "", {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    })
    
    // Ensure definition is properly initialized if it's null or undefined
    if (this.object.system.definition === null || this.object.system.definition === undefined) {
      await this.object.update({
        'system.definition': ''
      })
    }
    
    // Make sure definition is always available in the context
    if (!context.definition) {
      context.definition = this.object.system.definition || ''
    }
    
    // The benefits field
    context.benefits = await TextEditor.enrichHTML(this.object.system.benefits || "", {
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
    return super._onSubmit(event, {updateData, preventClose, preventRender});
  }
  
  /** @override */
  async _updateObject(event, formData) {
    // Continuar com a atualização padrão
    return super._updateObject(event, formData);
  }
  
  /** @override */
  activateListeners (html) {
    // Activate listeners
    super.activateListeners(html)
    
    // Adicionar manipuladores específicos para os editores
    if (this.isEditable) {
      // Manipulador para o editor de definição
      const definitionEditor = html.find('#building-definition-editor');
      if (definitionEditor.length) {
        // Capturar eventos de mudança e perda de foco
        definitionEditor.on('blur change', async (event) => {
          const content = event.currentTarget.innerHTML;
          await this.object.update({'system.definition': content});
        });
        
        // Adicionar manipulador para o botão de salvar do editor
        html.find('.editor-content[data-edit="system.definition"]').closest('.editor').find('button').on('click', async () => {
          const content = definitionEditor.html();
          await this.object.update({'system.definition': content});
        });
      }
      
      // Adicionar manipuladores para todos os botões de editor
      html.find('.editor button').on('click', async (event) => {
        const editor = $(event.currentTarget).closest('.editor').find('.editor-content');
        const target = editor.data('edit');
        if (target) {
          const content = editor.html();
          const updateData = {};
          updateData[target] = content;
          await this.object.update(updateData);
        }
      });
    }
  }
}
