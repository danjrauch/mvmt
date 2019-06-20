const {Command, flags} = require('@oclif/command')
const app = require('../app')

class TetherCommand extends Command {
  async run() {
    const {flags} = this.parse(TetherCommand)
    if(flags.update)
      app.tether(flags.alias, flags.object, flags.query, 'update')
    else 
      app.tether(flags.alias, flags.object, flags.query, 'delete')
  }
}

TetherCommand.aliases = ['t']

TetherCommand.description = `query and modify data
input each field map in the form <fieldname : value, fieldname : value, ...> without quotes
USE THIS COMMAND SPARINGLY`

TetherCommand.examples = [
  '$ mvmt tether -a some_name -o Contact --delete'
]

TetherCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  object: flags.string({required: true, char: 'o'}),
  query: flags.string({required: true, char: 'q'}),
  delete: flags.boolean({}),
  update: flags.boolean({})
}

module.exports = TetherCommand