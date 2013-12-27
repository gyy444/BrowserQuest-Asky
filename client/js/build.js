({
  appDir: "../",
  baseUrl: "js/",
  dir: "../../client-build",
  optimize: "closure",
  optimizeCss: "standard.keepLines",

  paths: {
    "jquery": "lib/require-jquery"
  },

  uglify: {
     no_mangle: false,
  },

  closure: {
    CompilerOptions: {},
    CompilationLevel: 'ADVANCED_OPTIMIZATIONS',
    logginLevel: 'WARNING'
  },
  name: "main",
  out: "main-built.js"
})
