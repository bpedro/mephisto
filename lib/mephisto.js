(function () {
	'use strict';

	var mephisto = {}
		, config = {}
		, ring = null
		, request = require('request')
	  , fs = require('fs')
	  , uuid = require('node-uuid');

	mephisto.init = function (config, ring) {
		this.config = config;
		this.ring = ring;
	}

	mephisto.saveObject = function (payload, from, key) {
	  var node = this.ring.get(key);
	  if (node === from) {
	    console.log('Storing ' + key + ' on locally');
	    fs.writeFileSync(this.config.storeBase + key, payload);
	    setTimeout(fs.unlinkSync, this.config.objLifeTime, this.config.storeBase + key);
	  } else {
	    console.log('Storing ' + key + ' on ' + node);
	    request.post({uri: 'http://' + node + '/store/' + key, body: payload},
	                 function(error, request, body) {
	      if (error) {
	        console.log('Error talking with ' + node + ', removing it from ring');
	        delNode(node);
	        saveObject(payload, from, key);
	      }
	    });
	  }
	};

	mephisto.loadObject = function (from, key, c) {
	  var node = this.ring.get(key);
	  if (node === from) {
	    console.log('Loading ' + key + ' locally');
	    return c(fs.readFileSync(config.storeBase + key));
	  } else {
	    console.log('Loading ' + key + ' from ' + node);
	    request.get('http://' + node + '/store/' + key,
	                function(error, request, body) {
	      if (error) {
	        console.log(error);
	        console.log('Error talking with ' + node + ', removing it from ring');
	        this.delNode(node);
	        loadObject(from, key, c);
	      } else {
	        console.log(body);
	        return c(body);
	      }
	    });
	  }
	};

	mephisto.addNode = function (node) {
	  if (this.config.servers.indexOf(node) == -1) {
	    this.config.servers.push(node);
	    this.ring.add(node);
	  }
	};

	mephisto.delNode = function (node) {
	  if (index = this.config.servers.indexOf(node) > -1) {
	    this.config.servers.splice(index, 1);
	    this.ring.remove(node);
	  }
	};

	mephisto.announce = function () {
		var self = this;
	  this.config.servers.forEach(function (node) {
	    console.log('Announcing to ' + node);
	    request.post({uri: 'http://' + node + '/announce',
	                  headers: {
	                    'Content-type': 'application/json'
	                  },
	                  body: JSON.stringify({node: self.config.me.host + ':' + self.config.me.port}),
	                 }, function (error, request, body) {
	    });
	  });
	};

	module.exports = mephisto;
}());
