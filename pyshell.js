const { PythonShell } = require('python-shell');

module.exports = (filename, options, callbacks) => {
  let pyshell = new PythonShell(filename, options);

  pyshell.on('stderr', function (msg) {
    // tensorflow logging defaults to stderr for all messages in non-interactive environments
    // https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/platform/tf_logging.py#L116-L120

    // todo: parse these messages and translate them into progress indicators
    // callbacks.onMsg(msg);
  });
  // end the input stream and allow the process to exit
  pyshell.end(function (err, code, signal) {
    if (err) throw err;
    console.log('The exit code was: ' + code);
    console.log('The exit signal was: ' + signal);
    console.log('finished');
    callbacks.onComplete();
  });
}
