const {Command, flags} = require('@oclif/command')
const app = require('../app')

class DescribeCommand extends Command {
  async run() {
    const {flags} = this.parse(DescribeCommand)
    if(flags.children) app.describe(flags.alias, flags.object, 'children')
    else if(flags.fields) app.describe(flags.alias, flags.object, 'fields')
    else if(flags.field) app.describe(flags.alias, flags.object, flags.field)
  }
}

DescribeCommand.aliases = ['d']

DescribeCommand.description = `describe metadata for an object
`

DescribeCommand.examples = [
  '$ mvmt describe -a some_name -o Contact'
]

DescribeCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  object: flags.string({required: true, char: 'o'}),
  children: flags.boolean({exclusive: ['fields', 'field']}),
  fields: flags.boolean({exclusive: ['children', 'field']}),
  field: flags.string({char: 'f', exclusive: ['children', 'fields']})
}

module.exports = DescribeCommand