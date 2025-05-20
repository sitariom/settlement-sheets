/* global foundry */

export class SettlementModel extends foundry.abstract.TypeDataModel {
  static defineSchema () {
    const fields = foundry.data.fields
    const schema = {}

    // Overview Tab
    schema.description = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    schema.influentialPeople = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    // Demografia racial
    schema.demographics = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    // Locais Notáveis
    schema.taverns = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    schema.shops = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    schema.temples = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    schema.notablePlaces = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    // Sheet trackers
    schema.trackers = new fields.ObjectField({
      initial: {},
      required: true,
      nullable: false,
      validate: value => typeof value === 'object' && value !== null && !Array.isArray(value)
    })

    // Events Tab
    schema.events = new fields.HTMLField({
      initial: '',
      required: false,
      blank: true,
      nullable: false
    })

    // Notes Tab
    schema.note = new fields.SchemaField({
      public: new fields.HTMLField({
        required: false,
        blank: true,
        initial: '',
        nullable: false
      }),
      private: new fields.HTMLField({
        required: false,
        blank: true,
        initial: '',
        gmOnly: true,
        nullable: false
      })
    },
    {
      label: 'settlement-sheets.Notes'
    })

    return schema
  }
}
