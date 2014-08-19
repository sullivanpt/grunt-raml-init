module.exports = function(grunt) {
  grunt.registerTask('raml:add', function() {
    var directory = grunt.cli.options.dest || 'src';
        resource = grunt.cli.options.resource;

    if (!resource || 'string' !== typeof resource || !/^[\/\w.]+$/.test(resource)) {
      grunt.log.error('Missing resource path, i.e. `grunt raml:add --resource foo.bar`');

      return false;
    }

    resource = resource.replace(/\./g, '/').replace(/^\//, '');

    var raml_files = [
      {
        file: 'index.raml',
        source: ['#%RAML 0.8'].join('\n')
      },
      {
        file: 'schema.json',
        source: JSON.stringify({
          '$schema': 'http://json-schema.org/schema'
        }, null, 2) },
      {
        file: 'sample.json',
        source: '{}'
      },
    ];

    var path = require('path'),
        count = 0;

    raml_files.forEach(function(output) {
      var generated_file = path.resolve.apply(null, [directory, resource, output.file]),
          status_file = generated_file.replace(process.cwd() + '/', '');

      if (!grunt.file.exists(generated_file)) {
        count += 1;

        grunt.file.write(generated_file, output.source);
        grunt.log.ok('File ' + status_file + ' created!');
      } else {
        grunt.log.warn('File ' + status_file + ' already exists!');
      }
    });

    grunt.log.writeln('Generated ' + count + ' file' + (count !== 1 ? 's' : ''));
  });
};
