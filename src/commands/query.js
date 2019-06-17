const {Command, flags} = require('@oclif/command')
const app = require('../app')

class QueryCommand extends Command {
  async run() {
    const {flags} = this.parse(QueryCommand)
    if(flags.path)
      app.query(flags.query, flags.alias, flags.path)
    else
      app.query(flags.query, flags.alias)
  }
}

QueryCommand.aliases = ['q']

QueryCommand.description = `query data from some environment`

QueryCommand.examples = [
  '$ mvmt query -q "SELECT ID, Name FROM Contact" -a some_org_alias -p ../../folder'
]

QueryCommand.flags = {
  query: flags.string({required: true, char: 'q'}),
  alias: flags.string({required: true, char: 'a'}),
  path: flags.string({char: 'p'}),
  // outputDir: flags.string({})
}

module.exports = QueryCommand