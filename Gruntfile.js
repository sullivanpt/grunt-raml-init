module.exports = function(grunt) {
  grunt.initConfig({
    raml: {
      api: {
        src: ['example/index.raml'],
        options: {
          schema_root: 'http://example.com/schema'
        }
      }
    }
  });

  grunt.loadTasks('tasks');
};
