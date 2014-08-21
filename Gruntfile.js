module.exports = function(grunt) {
  grunt.initConfig({
    raml: {
      api: {
        src: ['example/index.raml']
      }
    }
  });

  grunt.loadTasks('tasks');
};
