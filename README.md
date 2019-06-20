mvmt
====



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mvmt.svg)](https://npmjs.org/package/mvmt)
[![Downloads/week](https://img.shields.io/npm/dw/mvmt.svg)](https://npmjs.org/package/mvmt)
[![License](https://img.shields.io/npm/l/mvmt.svg)](https://github.com/danjrauch/mvmt/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g mvmt
$ mvmt COMMAND
running command...
$ mvmt (-v|--version|version)
mvmt/0.0.0 darwin-x64 node-v11.5.0
$ mvmt --help [COMMAND]
USAGE
  $ mvmt COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mvmt bulk`](#mvmt-bulk)
* [`mvmt create`](#mvmt-create)
* [`mvmt help [COMMAND]`](#mvmt-help-command)
* [`mvmt query`](#mvmt-query)
* [`mvmt tether`](#mvmt-tether)

## `mvmt bulk`

bulk migrate data

```
USAGE
  $ mvmt bulk

OPTIONS
  -a, --alias=alias        (required)
  -o, --object=object      (required)
  -p, --path=path          (required)
  --delete
  --extIdField=extIdField
  --insert
  --update
  --upsert

DESCRIPTION
  bulk create, update, or delete

ALIASES
  $ mvmt b

EXAMPLE
  $ mvmt bulk -a some_org_alias -o Contact -p ../../folder/csv --insert
```

_See code: [src/commands/bulk.js](https://github.com/danjrauch/mvmt/blob/v0.0.0/src/commands/bulk.js)_

## `mvmt create`

create data

```
USAGE
  $ mvmt create

OPTIONS
  -a, --alias=alias    (required)
  -n, --number=number
  -o, --object=object  (required)

DESCRIPTION
  input each field map in the form <fieldname : value, fieldname : value, ...> without quotes
  if --number is not set, you will need to type 'done' into the field prompt to end input

ALIASES
  $ mvmt c

EXAMPLE
  $ mvmt create -a some_name -o Contact -n 2
```

_See code: [src/commands/create.js](https://github.com/danjrauch/mvmt/blob/v0.0.0/src/commands/create.js)_

## `mvmt help [COMMAND]`

display help for mvmt

```
USAGE
  $ mvmt help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.0/src/commands/help.ts)_

## `mvmt query`

query data

```
USAGE
  $ mvmt query

OPTIONS
  -a, --alias=alias  (required)
  -p, --path=path
  -q, --query=query  (required)

DESCRIPTION
  query using soql statement

ALIASES
  $ mvmt q

EXAMPLE
  $ mvmt query -q "SELECT ID, Name FROM Contact" -a some_org_alias -p ../../folder
```

_See code: [src/commands/query.js](https://github.com/danjrauch/mvmt/blob/v0.0.0/src/commands/query.js)_

## `mvmt tether`

query and modify data

```
USAGE
  $ mvmt tether

OPTIONS
  -a, --alias=alias    (required)
  -o, --object=object  (required)
  -q, --query=query    (required)
  --delete
  --update

DESCRIPTION
  input each field map in the form <fieldname : value, fieldname : value, ...> without quotes
  USE THIS COMMAND SPARINGLY

ALIASES
  $ mvmt t

EXAMPLE
  $ mvmt tether -a some_name -o Contact --delete
```

_See code: [src/commands/tether.js](https://github.com/danjrauch/mvmt/blob/v0.0.0/src/commands/tether.js)_
<!-- commandsstop -->
