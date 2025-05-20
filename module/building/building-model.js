/* global foundry */

export class BuildingModel extends foundry.abstract.TypeDataModel {
  static defineSchema () {
    const fields = foundry.data.fields
    const schema = {}

    // Overview tab
    schema.definition = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    schema.benefits = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true
    })

    // Sheet trackers
    schema.trackers = new fields.ObjectField({
      initial: {},
      required: true,
      nullable: false,
      validate: value => typeof value === 'object' && value !== null
    })

    // Notes Tab
    schema.note = new fields.SchemaField({
      public: new fields.HTMLField({
        required: false,
        blank: true,
        initial: ''
      }),
      private: new fields.HTMLField({
        required: false,
        blank: true,
        initial: '',
        gmOnly: true
      })
    },
    {
      label: 'settlement-sheets.Notes'
    })

    return schema
  }
}
