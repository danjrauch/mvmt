const {Command, flags} = require('@oclif/command')
const app = require('../app')

class BulkCommand extends Command {
  async run() {
    const {flags} = this.parse(BulkCommand)
    if([flags.insert, flags.update, flags.upsert, flags.delete].filter(b => b).length == 1){
      let type = ''
      if(flags.insert) type = 'insert'
      else if(flags.update) type = 'update'
      else if(flags.upsert) type = 'upsert'
      else if(flags.delete) type = 'delete'
      if(flags.upsert) app.bulk(flags.alias, flags.object, flags.path, type, {extIdField: flags.extIdField})
      else app.bulk(flags.alias, flags.object, flags.path, type)
    }
    else
      console.log('Choose one type of operation')
  }
}

BulkCommand.aliases = ['b']

BulkCommand.description = `bulk migrate data
bulk create, update, or delete`

BulkCommand.examples = [
  '$ mvmt bulk -a some_org_alias -o Contact -p ../../folder/csv --insert'
]

BulkCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  object: flags.string({required: true, char: 'o'}),
  path: flags.string({required: true, char: 'p'}),
  insert: flags.boolean(),
  update: flags.boolean(),
  upsert: flags.boolean({dependsOn: ['extIdField']}),
  delete: flags.boolean(),
  extIdField: flags.string({dependsOn: ['upsert']}),
  // outputDir: flags.string({})
  // concurrencyMode: flags.string({})
}

module.exports = BulkCommand