module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['steps/**/*.ts'],
    format: ['progress', 'html:cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' }
  }
};
