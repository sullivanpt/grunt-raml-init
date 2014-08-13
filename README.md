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
          schema_src: ['src/**/schema.json'],
          schema_root: 'http://domain.com/schema',
          schema_output: 'generated/schema'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-raml-init');
};
```

## Options

- **src** (array|string)
  RAML files to parse

- **schema_src** (array|string)
  JSON-schema sources

- **schema_root** (string)
  Base URI for local schemas

- **schema_output** (string)
  Directory for saving local schemas

## Best practices

**tl; dr** --- Take a look to the provided `example` directory.

- Split and organize all RAML definitions on separated files
- Place your `json-schema` with their examples on separated files

## Build status

[![Build Status](https://travis-ci.org/gextech/grunt-raml-init.png?branch=master)](https://travis-ci.org/gextech/grunt-raml-init)
