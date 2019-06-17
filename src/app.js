const jsforce = require('jsforce')
const execa = require('execa')
const {cli} = require('cli-ux')
const chalk = require('chalk')
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
  const info = execa.shellSync(`sfdx force:org:display -u ${alias} --json`)
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
const bulk = (object, alias, data, type, options) => {
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

const query = (query, alias, path) => {
  const conn = getConn(alias)
  if(!conn) return

  if(path)
    conn.bulk.query(query).on('error', (err) => { 
      if(err.name == 'INVALID_SESSION_ID')
        return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
      else
        return console.error(err)
    }).stream().pipe(fs.createWriteStream(path))
  else
    conn.bulk.query(query)
    .on('record', (rec) => { console.log(rec) })
    .on('error', (err) => { 
      if(err.name == 'INVALID_SESSION_ID')
        return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
      else
        return console.error(err)
    })

  // let rows = []
  // conn.bulk.query(query)
  //   .on('record', (rec) => { rows.push(rec) })
  //   .on('error', (err) => { 
  //     if(err.name == 'INVALID_SESSION_ID'){
  //       return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
  //     }else
  //       return console.error(err)
  //   })
  //   .on('end', () => {
  //     if(path){
  //       const dataCsv = parse(rows, { header: true, fields: Object.keys(rows[0]), quote: '"' })
  //       fs.writeFile(path, dataCsv, (err) => {
  //         if(err) throw err
  //         console.log('The file has been saved!')
  //       })
  //     }else{
  //       rows.forEach(r => console.log(r))
  //     }
  //   })
}

// hyprid find-and-delete using crud then bulk after threshold, will delete a batch of 10000 at a time
const bulk_query_delete = (object, alias, criteria) => {
  const conn = getConn(alias)
  if(!conn) return

  cli.action.start('querying and deleting')

  conn.sobject(object)
      .find(criteria)
      .destroy({
        allowBulk: true,
        bulkThreshold: 200,
      }, (err, rets) => {
        if(err){
          if(err.name == 'INVALID_SESSION_ID')
            return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
          else
            return console.error(err)
        }
        console.log(`${rets.filter(ret => ret.success).length} records deleted, ${rets.filter(ret => !ret.success).length} errors`)
        rets.filter(ret => !ret.success).forEach(ret => console.log(`${chalk.red('Error:')} ${ret.errors.join(', ')}`))
        conn.sobject(object)
            .find(criteria)
            .execute({autoFetch: true, maxFetch: 10000}, (err, records) => {
              if(err){
                if(err.name == 'INVALID_SESSION_ID')
                  return console.log(`Your access token is expired. Open the scratch org with 'sfdx force:org:open -u ${alias}'`)
                else
                  return console.error(err)
              }
              console.log(`deleting ${records.length} records`)
              //TODO: write result to a file
              if(records.length > 0)
                bulk_query_delete(object, alias, criteria)
            })
      })
}

module.exports = { bulk, query }

// bulk_query_delete('Contact', 'test_scratch', {  })
// bulk('Contact', 'test_scratch', './data/MOCK_DATA.csv', 'insert')