var Hapi = require('hapi')
  , HashRing = require('hashring')
  , config = require('config')
  , mephisto = require('./lib/mephisto');
 
var ring = new HashRing(config.servers);
mephisto.init(config, ring);

// Create a server with a host and port
var server = Hapi.createServer(config.me.host,
                               config.me.port,
                               {payload: {maxBytes: config.maxPayload}});
 
server.route({
  method: 'POST',
  path: '/store/{key*}',
  config: {
    payload: {
      output: 'data',
      parse: false
    }
  },
  handler: function (req, reply) {
    if (req.params.key != '') {
      var objKey = req.params.key;
    } else {
      var objKey = uuid.v1();
    }
    reply({key: objKey});
    mephisto.saveObject(req.payload, req.info.host, objKey);
  }
});
 
server.route({
  method: 'GET',
  path: '/store/{key}',
  handler: function (req, reply) {
    mephisto.loadObject(req.info.host, req.params.key, function(body) {
      reply(body);
    });
  }
});
 
server.route({
  method: 'POST',
  path: '/announce',
  handler: function (req, reply) {
    console.log('Announcement of node ' + req.payload.node);
    mephisto.addNode(req.payload.node, ring);
    reply(config.servers);
  }
});
 
// Start the server
server.start();

mephisto.addNode(config.me.host + ':' + config.me.port, ring);
mephisto.announce();
