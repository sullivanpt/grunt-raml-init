var http = require('http');

module.exports = function(data, schema, callback, checkRecursive, banUnknownProperties) {
  var tv4 = this,
      result = validateSync();

  function validateSync() {
    return tv4.validateMultiple(data, schema, checkRecursive, banUnknownProperties);
  }

  if (!result.missing.length) {
    callback(result);
  } else {
    var missing = result.missing.length,
        done = function() {
          if (!missing) {
            callback(validateSync());
          }
        };

    result.missing.forEach(function(url) {
      http.get(url, function(res) {
        var body = '';

        res.on('data', function(chunk) {
          body += chunk;
        });

        res.on('end', function() {
          try {
            tv4.addSchema(url, JSON.parse(body));
            missing--;
            done();
          } catch (e) {
            throw new Error(e + '\n' + body);
          }
        });

      }).on('error', function(err) {
        throw new Error('Missing schema ' + url);
      });
    });
  }
};
