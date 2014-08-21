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
          schemas: ['src/common/**/schema.json']
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

- **schemas** (array|string)

  JSON-schema sources to include before any validation.

  The task will extract and register all schemas defined in RAML, any other schema should be resolved using this.

## Best practices

**tl; dr** &mdash; Take a look to the provided `example` directory.

- Split and organize all RAML definitions on separated files
- Place your `json-schema` with their examples on separated files
- All `json-schema` required must have an `id` to validate them well

## Build status

[![Build Status](https://travis-ci.org/gextech/grunt-raml-init.png?branch=master)](https://travis-ci.org/gextech/grunt-raml-init)
