module.exports = function(grunt) {
  grunt.registerMultiTask('raml', function() {

    var _ = grunt.util._,
        tv4 = require('tv4'),
        path = require('path'),
        http = require('http'),
        raml = require('raml-parser');

    var subtasks = [],
        options = this.options(),
        finish = this.async();

    function runTasks(all, done) {
      grunt.util.async.forEach(all, function(task, callback) {
        return task(callback);
      }, function(err) {
        if (err) {
          grunt.log.error(err);
        }

        done();
      });
    }

    function saveSchemas() {
      return function(next) {
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

        next();
      };
    }

    function processRaml(file) {
      return function(next) {
        raml.loadFile(file).then(function(data) {
          grunt.log.writeln('Validating schemas: ' + data.title + ' v' + data.version);

          var subtasks = [],
              schemas = extractSchemas(data, []);

          schemas.forEach(function(params) {
            subtasks.push(downloadSchemas(extractRefs(params.schema)));
          });

          runTasks(subtasks, function() {
            schemas.forEach(validate);
            next();
          });
        }, function(err) {
          grunt.log.error('Error in ' + err.problem_mark.name + ' line=' + err.problem_mark.line + ' column=' + err.problem_mark.column);
          grunt.log.error('Message: ' + err.message);

          next(err);
        });
      };
    }

    function validate(params) {
      var result = tv4.validateMultiple(params.example, params.schema);

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
    }

    function extractRefs(schema) {
      var retval = [];

      _.each(schema.properties, function(property, name) {
        if (/^https?:\/\//.test(property['$ref'])) {
          retval.push(property['$ref']);
        }

        if (property.properties) {
          retval = retval.concat(extractRefs(property));
        }
      });

      return retval;
    }

    function extractSchemas(schema, parent) {
      var retval = [];

      schema.resources.forEach(function(resource) {
        var parts = parent.concat([resource.relativeUri]);

        _.each(resource.methods, function(method) {
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

    function downloadSchemas(sources) {
      return function(next) {
        var subtasks = [];

        _.each(sources, function(url) {
          subtasks.push(function(next) {
            http.get(url, function(res) {
              var body = '';

              res.on('data', function(chunk) {
                body += chunk;
              });

              res.on('end', function() {
                try {
                  tv4.addSchema(url, JSON.parse(body));
                  next();
                } catch (e) {
                  next(e + '\n' + body);
                }
              });

            }).on('error', function(err) {
              next('Cannot reach ' + url);
            });
          });
        });

        runTasks(subtasks, next);
      };
    }

    // - save local schemas
    // - parse raml definitions
    // - extract all json-schemas
    // - extract all $ref's and download
    // - validate everything!

    if (!this.filesSrc.length) {
      grunt.log.error('Missing RAML files!');
      finish(false);
    } else {
      subtasks.push(saveSchemas());

      this.filesSrc.forEach(function(file) {
        subtasks.push(processRaml(file));
      });

      runTasks(subtasks, finish);
    }

  });
};
