const jsforce = require('jsforce')
const shell = require('shelljs')
const {cli} = require('cli-ux')
const chalk = require('chalk')
const columnify = require('columnify')
const fs = require('fs-extra')
const csv = require('csv-parser')
const { parse } = require('json2csv')

const batchSize = 3000
let batchNumber = 0
let batchResponses = 0
let jobInfo = {
  id: '',
  batches: {}
}

const getConn = (alias) => {
  const info = shell.exec(`sfdx force:org:display -u ${alias} --json`, {silent:true})
  const infoJson = JSON.parse(info.stdout)

  const accessToken = infoJson.result.accessToken
  const instanceUrl = infoJson.result.instanceUrl

  if(!accessToken)
    return console.log('There is no access token. Please run `dsfdx a help`')
  if(!instanceUrl)
    return console.log('There is no instance url. Please run `dsfdx a help`')

  const conn = new jsforce.Connection({
    accessToken : accessToken,
    instanceUrl : instanceUrl
  })

  // conn.on("refresh", (accessToken, res) => {
  //   console.log(accessToken)
  //   console.log(res)
  // })

  conn.bulk.pollInterval = 5000
  conn.bulk.pollTimeout = 100000

  return conn
}

const launch_batch = (conn, job, specs) => {
  const batch = job.createBatch()
  batch.execute(specs.rows)
  batch.on('error', (batchInfo) => {
    jobInfo.batches[batchInfo.id].state = batchInfo.state
    jobInfo.batches[batchInfo.id].reason = batchInfo.stateMessage
  })
  batch.on('queue', (batchInfo) => {
    batchNumber += 1
    specs.id = batchInfo.id
    jobInfo.id = batchInfo.jobId
    jobInfo.batches[batchInfo.id] = specs
    batch.poll(conn.bulk.pollInterval, conn.bulk.pollTimeout)
  })
  batch.on('response', (rets) => {
    batchResponses += 1
    jobInfo.batches[batch.id].state = 'Completed'
    rets.forEach((r, i) => {
      jobInfo.batches[batch.id].rows[i].Id = r.id
      jobInfo.batches[batch.id].rows[i].errors = r.errors
    })
    if(batchResponses == batchNumber){
      cli.action.stop('done')
      const orderedBatches = Object.values(jobInfo.batches).sort((a, b) => (a.startRow > b.startRow) ? 1 : -1)
      const columns = Object.keys(orderedBatches[0].rows[0])
      const successStream = fs.createWriteStream(`${job.operation}Successes${batch.job.id}.csv`, {flags:'a'})
      const failStream = fs.createWriteStream(`${job.operation}Failures${batch.job.id}.csv`, {flags:'a'})
      orderedBatches.forEach((obj, i) => {
        let opts = { header: true, fields: columns, quote: '"' }
        if(i == 0) opts.header = true
        else opts.header = false
        const successCsv = parse(obj.rows.filter(r => r.errors.length == 0), opts)
        const failCsv = parse(obj.rows.filter(r => r.errors.length > 0), opts)
        if(successCsv.length) successStream.write(successCsv + '\n')
        if(failCsv.length) failStream.write(failCsv + '\n')
      })
      successStream.end()
      failStream.end()

      Object.values(jobInfo.batches).forEach(b => delete b.rows)
      fs.writeJson(`${job.id}Info.json`, jobInfo, { spaces: 2 }, err => {
        if (err) return console.error(err)
      })
    }
    // fs.writeJson(`${job.id}Info.json`, jobInfo, { spaces: 2 }, err => {
    //   if (err) return console.error(err)
    // })
  })
}

// insert, update, upsert, delete
const bulk = (alias, object, data, type, options) => {
  if(type != 'insert' &&
     type != 'update' &&
    (type != 'upsert' || !options) &&
     type != 'delete'){
    return console.log('Incorrect arguments given.')
  }

  const conn = getConn(alias)
  if(!conn) return

  //id field is required for delete, update operations
  //extIdField is required for upsert operations
  const job = (type == 'upsert') ? conn.bulk.createJob(object, type, options) : conn.bulk.createJob(object, type)

  if(typeof data == 'string'){
    let rows = []
    let rowCounter = 0

    cli.action.start('bulk job executing')
    fs.createReadStream(data)
      .pipe(csv())
      .on('data', (row) => {
        if(row.errors) delete row.errors
        rows.push(row)
        rowCounter += 1
        if(rows.length == batchSize){
          launch_batch(conn, job, {startRow: rowCounter - rows.length,
                                   endRow: rowCounter,
                                   rows: rows})
          rows = []
        }
      })
      .on('end', () => {
        if(rows.length > 0){
          launch_batch(conn, job, {startRow: rowCounter - rows.length,
                                   endRow: rowCounter,
                                   rows: rows})
        }
      })
  }else if(typeof data == 'object'){
    for(i = 0; i < data.length; i+=batchSize){
      launch_batch(conn, job, launch_batch(conn, job, {startRow: rowCounter - rows.length,
                                                       endRow: rowCounter,
                                                       rows: data.slice(i, i+batchSize)}))
    }
  }
}

const create = async (alias, object, number) => {
  const conn = getConn(alias)
  if(!conn) return

  let inputs = []

  for(let i = 0; i<(number ? number : 1000); ++i){
    let objectJson = {}
    const fieldString = await cli.prompt(`${object} #${i+1} `)
    if(fieldString == 'done') break
    fieldString.split(',').map(e => {
      const quotedField = e.trim().split(':').map(e => e.trim())
      objectJson[quotedField[0]] = quotedField[1]
    })
    inputs.push(objectJson)
  }

  conn.sobject(object).create(inputs, (err, rets) => {
    if (err) { return console.error(err) }
    rets.forEach(e => {
      if(e.success){
        console.log("Created record id : " + e.id)
      }
    })
  })
}

const query = (alias, query, path) => {
  const conn = getConn(alias)
  if(!conn) return

  if(path){
    conn.bulk.query(query).on('error', (err) => {
      if(err.name == 'INVALID_SESSION_ID')
        return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
      else
        return console.error(err)
    }).stream().pipe(fs.createWriteStream(path))
  }else{
    const result = shell.exec(`sfdx force:data:soql:query -u ${alias} -q "${query}"`, {silent:true})
    if(result.stdout)
      process.stdout.write(result.stdout)
    else
      process.stdout.write(result.stderr)
  }
}

const tether = async (alias, object, query, type) => {
  const conn = getConn(alias)
  if(!conn) return

  if(type == 'delete'){
    cli.action.start('querying and deleting')

    conn.query(query)
        .destroy(object, {
          allowBulk: true,
          bulkThreshold: 200,
        }, (err, rets) => {
          if(err){
            if(err.name == 'INVALID_SESSION_ID')
              return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
            else
              return console.error(err)
          }
          cli.action.stop('done')
          console.log(`${rets.filter(ret => ret.success).length} records deleted, ${rets.filter(ret => !ret.success).length} errors`)
          rets.filter(ret => !ret.success).forEach(ret => console.log(`${chalk.red('Error:')} ${ret.errors.join(', ')}`))
          conn.query(query)
              .execute({autoFetch: true, maxFetch: 50}, async (err, records) => {
                if(err){
                  if(err.name == 'INVALID_SESSION_ID')
                    return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
                  else
                    return console.error(err)
                }
                if(records.length > 0){
                  const cont = await cli.confirm('continue deleting? [yes/no]')
                  if(cont)
                    tether(alias, object, query, type)
                }
              })
        })
  }else if(type == 'update'){
    let objectJson = {}
    const fieldString = await cli.prompt(`Update Field Map `)
    fieldString.split(',').map(e => {
      const quotedField = e.trim().split(':').map(e => e.trim())
      objectJson[quotedField[0]] = quotedField[1]
    })

    cli.action.start('querying and updating')

    conn.query(query)
        .update(objectJson, object, (err, rets) => {
          if (err) { return console.error(err) }
          if(err){
            if(err.name == 'INVALID_SESSION_ID')
              return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
            else
              return console.error(err)
          }
          cli.action.stop('done')
          console.log(`${rets.filter(ret => ret.success).length} records updated, ${rets.filter(ret => !ret.success).length} errors`)
          rets.filter(ret => !ret.success).forEach(ret => console.log(`${chalk.red('Error:')} ${ret.errors.join(', ')}`))
        })
  }
}

const schema = (alias, type) => {
  const conn = getConn(alias)
  if(!conn) return

  if(type){
    const result = shell.exec(`sfdx force:schema:sobject:list -u ${alias} -c ${type}`, {silent:true})
    if(result.stdout)
      process.stdout.write(result.stdout)
    else
      process.stdout.write(result.stderr)
  }else{
    const result = shell.exec(`sfdx force:schema:sobject:list -u ${alias} -c all`, {silent:true})
    if(result.stdout)
      process.stdout.write(result.stdout)
    else
      process.stdout.write(result.stderr)
  }
}

const describe = (alias, object, type) => {
  const conn = getConn(alias)
  if(!conn) return

  const result = shell.exec(`sfdx force:schema:sobject:describe -u ${alias} -s ${object} --json`, {silent:true})
  if(result.stdout){
    const describe = JSON.parse(result.stdout)
    if(type == 'children'){
      const childrenDescribe = describe.result.childRelationships.map(d => { return {OBJECT: d.childSObject ? d.childSObject : '', 
                                                                                     FIELD: d.field ? d.field : '',
                                                                                     RELNAME: d.relationshipName ? d.relationshipName : ''} })
      const longestObject = childrenDescribe.reduce((a, b) => { return a.OBJECT.length > b.OBJECT.length ? a : b }).OBJECT.length
      const longestField = childrenDescribe.reduce((a, b) => { return a.FIELD.length > b.FIELD.length ? a : b }).FIELD.length
      const longestRelName = childrenDescribe.reduce((a, b) => { return a.RELNAME.length > b.RELNAME.length ? a : b }).RELNAME.length
      childrenDescribe.unshift({
        OBJECT: '─'.repeat(longestObject > 6 ? longestObject : 6),
        FIELD: '─'.repeat(longestField > 5 ? longestField : 5),
        RELNAME: '─'.repeat(longestRelName > 7 ? longestRelName : 7)
      })
      console.log(columnify(childrenDescribe))
    }else if(type == 'fields'){
      const fieldsDescribe = describe.result.fields.map(d => { return {NAME: d.name ? d.name : '', 
                                                                       TYPE: d.type ? d.type : ''} })
      const longestName = fieldsDescribe.reduce((a, b) => { return a.NAME.length > b.NAME.length ? a : b }).NAME.length
      const longestType = fieldsDescribe.reduce((a, b) => { return a.TYPE.length > b.TYPE.length ? a : b }).TYPE.length
      fieldsDescribe.unshift({
        NAME: '─'.repeat(longestName > 6 ? longestName : 6),
        TYPE: '─'.repeat(longestType > 5 ? longestType : 5),
      })
      console.log(columnify(fieldsDescribe))
    }else{
      const fieldDescribe = describe.result.fields.filter(d => d.name.toLowerCase() == type.toLowerCase())[0]
      if(fieldDescribe){
        console.log(columnify([{
          NAME: '─'.repeat(fieldDescribe.name.length > 4 ? fieldDescribe.name.length : 4),
          TYPE: '─'.repeat(fieldDescribe.type.length > 4 ? fieldDescribe.type.length : 4)
        },{
          NAME: fieldDescribe.name,
          TYPE: fieldDescribe.type
        }]))
      }else{
        console.log(`${chalk.red(type)} does not exist on this object.`)
      }
    }
  }
  else
    process.stdout.write(result.stderr)
}

module.exports = { bulk, query, create, tether, schema, describe }

// bulk_query_delete('Contact', 'test_scratch', {  })
// bulk('Contact', 'test_scratch', './data/MOCK_DATA.csv', 'insert')
