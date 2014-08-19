Enjoying RAML?
==============

Automatize your workflow:

```javascript
module.exports = function(grunt) {
  grunt.initConfig({
    raml: {
      api: {
        src: ['src/index.raml'],
        options: {
          client: 'generated/api-client.js',
          schema_src: ['src/common/**/schema.json'],
          schema_root: 'http://domain.com/schema',
          schema_output: 'generated/schema'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-raml-init');
};
```

## Tasks

Use **raml:add** for creating empty resource files, i.e.

`$ grunt raml:add --resource foo.candy.bar --dest api`

## Options

- **src** (array|string)

  RAML files to parse.

- **client** (string)

  Filepath for saving the generated api-client.

- **schema_src** (array|string)

  JSON-schema sources to include before any validation.

  The task will extract and register all schemas defined in RAML, any other schema should be resolved using this.

- **schema_root** (string)

  Base URI for local schemas.

  If given, all local schemas will be registered under that domain using its `schema-id`, then use:

  ```json
  { "$ref": "http://domain.com/schema/id" }
  ```

  Note that **schema_output** has precedence over **schema_root**.

- **schema_output** (string)

  Directory for saving local schemas.

  If given, all local schemas will be saved to this location using its `schema-id`, then use:

  ```json
  { "$ref": "http://localhost:8000/schema/id.json" }
  ```

  For this you're required to serve the schemas using a local web-server.

## Best practices

**tl; dr** &mdash; Take a look to the provided `example` directory.

- Split and organize all RAML definitions on separated files
- Place your `json-schema` with their examples on separated files
- All `json-schema` required must have an `id` to validate them well

## Build status

[![Build Status](https://travis-ci.org/gextech/grunt-raml-init.png?branch=master)](https://travis-ci.org/gextech/grunt-raml-init)
