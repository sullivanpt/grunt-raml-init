module.exports = function(grunt) {
  grunt.registerMultiTask('raml', function() {

    var _ = grunt.util._,
        path = require('path'),
        raml4js = require('raml4js');

    var subtasks = [],
        schemas = {},
        options = this.options(),
        finish = this.async();

    function runTasks(all, done) {
      grunt.util.async.forEach(all, function(task, callback) {
        return task(callback);
      }, function(err) {
        if (err) {
          grunt.log.error(err);
          return done(err);
        }

        done();
      });
    }

    function saveSchemas() {
      return function(next) {
        grunt.file.expand(options.schemas).forEach(function(file) {
          var json = grunt.file.read(file);

          try {
            var schema = JSON.parse(json);

            if (!schema.id) {
              throw new Error('missing schema-id for ' + file);
            }

            schemas[schema.id] = schema;
          } catch (e) {
            throw new Error('invalid JSON for ' + file + '\n' + e + '\n' + json);
          }
        });

        next();
      };
    }

    function processRaml(file) {
      return function(next) {
        raml4js(file, function(err, data) {
          if (err) {
            return next(err);
          }

          try {
            raml4js.validate({ data: data, schemas: schemas }, function(type, obj) {
              switch (type) {
                case 'root':
                  grunt.log.subhead('Validating schemas for ' + obj.title + ' ' + obj.version);

                  if (options.client) {
                    grunt.file.write(options.client, 'module.exports = ' + raml4js.client(data).toString() + ';');
                    grunt.log.ok('API-client saved at ' + options.client);
                  }
                break;

                case 'label':
                  grunt.log.subhead(obj.description);
                break;

                case 'error':
                  grunt.fatal(obj.message);
                break;

                case 'success':
                  grunt.log.ok('OK');
                break;

                case 'warning':
                  grunt.log.warn('ERROR');
                  grunt.log.writeln(JSON.stringify(obj.schema, null, 2));
                break;

                case 'missing':
                  grunt.log.error('missing schema for ' + obj);
                break;

                case 'resource':
                  grunt.log.writeln(obj.method, obj.path);
                break;
              }
            }, function (err) {
              // ignore these errors. the raml4js module is too aggressive
              if (err.toString().indexOf('Error: no responses given ') === 0 ||
                err.toString().indexOf('Error: missing response ') === 0 ||
                err.toString().indexOf('Error: missing body ') === 0 ||
                err.toString().indexOf('Error: missing schema ') === 0 ||
                err.toString().indexOf('Error: missing example ') === 0 ||
                err.toString().indexOf('Error: invalid JSON ') === 0) {
                grunt.log.writeln(err);
                next();
              } else {
                next(err);
              }
            });
          } catch (e) {
            next(e);
          }
        });
      };
    }

    if (!this.filesSrc.length) {
      grunt.log.error('missing RAML files!');
      finish(false);
    } else {
      if (options.schemas) {
        subtasks.push(saveSchemas());
      }

      this.filesSrc.forEach(function(file) {
        subtasks.push(processRaml(file));
      });

      runTasks(subtasks, finish);
    }

  });
};
