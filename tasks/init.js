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

    function parse(data, label) {
      try {
        return JSON.parse(data);
      } catch (e) {
        throw new Error('invalid JSON for ' + label + '\n' + e + '\n' + data);
      }
    }

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
            throw new Error('missing id for ' + file);
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
          grunt.log.writeln('Validating schemas for ' + data.title + ' v' + data.version);

          try {
            var subtasks = [],
                schemas = extractSchemas(data, []);

            schemas.forEach(function(params) {
              subtasks.push(downloadSchemas(extractRefs(params.schema)));
            });

            runTasks(subtasks, function() {
              schemas.forEach(validate);
              next();
            });
          } catch (e) {
            next(e);
          }
        }, function(err) {
          next('Error: ' + err);
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
          grunt.log.error('missing schema for ' + set);
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

      if (!schema.resources) {
        throw new Error('no resources given' + (parent.length ? ' for ' + parent.join('') : ''));
      }

      _.each(schema.resources, function(resource) {
        var parts = parent.concat([resource.relativeUri]),
            debug_route = parts.join('');

        if (!resource.methods) {
          throw new Error('no methods given for ' + debug_route);
        }

        _.each(resource.methods, function(method) {
          var debug_request = method.method.toUpperCase() + ' ' + debug_route;

          if (!method.responses) {
            throw new Error('no responses given for ' + debug_request);
          }

          _.each(method.responses, function(response, status) {
            var debug_response = debug_request + ' [statusCode: ' + status + ']';

            if (!response) {
              throw new Error('missing response for ' + debug_response);
            }

            if (!response.body) {
              throw new Error('missing body for ' + debug_response);
            }

            _.each(response.body, function(body, type) {
              var debug_body = debug_response + ' [Content-Type: ' + type + ']';

              if (!body) {
                throw new Error('missing body for ' + debug_body);
              }

              if (!body.schema) {
                throw new Error('missing schema for ' + debug_body);
              }

              if (!body.example) {
                throw new Error('missing example for ' + debug_body);
              }

              retval.push({
                schema: parse(body.schema, 'schema for ' + debug_body),
                example: parse(body.example, 'example for ' + debug_body),
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
                tv4.addSchema(url, parse(body, url));
                next();
              });

            }).on('error', function(err) {
              next('cannot reach ' + url);
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
      grunt.log.error('missing RAML files!');
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
