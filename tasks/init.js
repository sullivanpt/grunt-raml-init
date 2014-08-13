module.exports = function(grunt) {
  grunt.registerMultiTask('raml', function() {

    var _ = grunt.util._,
        cb = this.async(),
        tv4 = require('tv4'),
        path = require('path'),
        raml = require('raml-parser');

    tv4.validateAsync = require('../lib/tv4-async');

    var raml_files = [],
        options = this.options();

    this.files.forEach(function(set) {
      set.src.forEach(function(file) {
        raml_files.push(raml.loadFile(file));
      });
    });

    grunt.util.async.forEach(raml_files, function(parser, done) {
      parser.then(function(data) {
        grunt.log.writeln('Validating schemas: ' + data.title + ' v' + data.version);

        _.each(extractSchemas(data, []), function(schema) {
          validate(schema, function() {
            setTimeout(function() {
              done();
            }, 100);
          });
        });
      }, function(err) {
        errorHandler(err);
        done(err);
      });
    }, function(err) {
      if (err) {
        grunt.log.error(err);
      }

      cb(err ? false : null);
    });

    grunt.file.expand(options.schema_src).forEach(function(file) {
      var schema = grunt.file.readJSON(file);

      if (!schema.id) {
        throw new Error('Missing id for ' + file);
      } else {
        if (options.schema_output) {
          grunt.file.copy(file, path.resolve(options.schema_output + '/' + schema.id + '.json'));
        } else {
          tv4.addSchema(options.schema_root + '/' + schema.id, schema);
        }
      }
    });

    function extractSchemas(schema, parent) {
      var retval = [];

      schema.resources.forEach(function(resource) {
        var parts = parent.concat([resource.relativeUri]);

        resource.methods.forEach(function(method) {
          _.each(method.responses, function(response, status) {
            _.each(response.body, function(body, type) {
              if (!body.schema) {
                throw new Error('Missing schema for ' + parts.join(''));
              }

              if (!body.example) {
                throw new Error('Missing example for schema in ' + parts.join(''));
              }

              retval.push({
                schema: JSON.parse(body.schema),
                example: JSON.parse(body.example),
                method: method.method.toUpperCase(),
                path: parts.join('')
              });
            });
          });
        });

        if (resource.resources) {
          retval = retval.concat(extractSchemas(resource, parts));
        }
      });

      return retval;
    }

    function errorHandler(err) {
      grunt.log.error('Error in ' + err.problem_mark.name + ' line=' + err.problem_mark.line + ' column=' + err.problem_mark.column);
      grunt.log.error('Message: ' + err.message);
    }

    function validate(params, next) {
      tv4.validateAsync(params.example, params.schema, function(result) {
        grunt.log.writeln(params.method, params.path);

        if (result.valid) {
          grunt.log.ok('OK');
        } else {
          grunt.log.warn('ERROR');
          grunt.log.writeln(JSON.stringify(params.schema, null, 2));

          if (result.errors.length) {
            result.errors.forEach(function(err) {
              grunt.log.error(err.message);
            });
          }
        }

        if (result.missing.length) {
          result.missing.forEach(function(set) {
            grunt.log.error('Missing schema for ' + set);
          });
        }

        next();
      });
    }

  });
};
