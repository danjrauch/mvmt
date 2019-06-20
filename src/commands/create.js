const {Command, flags} = require('@oclif/command')
const app = require('../app')

class CreateCommand extends Command {
  async run() {
    const {flags} = this.parse(CreateCommand)
    if(flags.number)
      app.create(flags.alias, flags.object, flags.number)
    else 
      app.create(flags.alias, flags.object)
  }
}

CreateCommand.aliases = ['c']

CreateCommand.description = `create data
input each field map in the form <fieldname : value, fieldname : value, ...> without quotes
if --number is not set, you will need to type 'done' into the field prompt to end input`

CreateCommand.examples = [
  '$ mvmt create -a some_name -o Contact -n 2'
]

CreateCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  object: flags.string({required: true, char: 'o'}),
  number: flags.string({char: 'n'})
}

module.exports = CreateCommand