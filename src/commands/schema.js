const {Command, flags} = require('@oclif/command')
const app = require('../app')

class SchemaCommand extends Command {
  async run() {
    const {flags} = this.parse(SchemaCommand)
    if(flags.type)
      app.schema(flags.alias, flags.type)
    else
      app.schema(flags.alias)
  }
}

SchemaCommand.aliases = ['s']

SchemaCommand.description = `list schema metadatadata by type
`

SchemaCommand.examples = [
  '$ mvmt schema -a some_name -t all'
]

SchemaCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  type: flags.string({char: 't', options: ['all', 'custom', 'standard']})
}

module.exports = SchemaCommand