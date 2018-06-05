import PodAPI from '../imports/api/api_pod';
import _ from 'lodash';

if (Meteor.isServer) {
	var imagesDir = Meteor.settings.imageBaseDir;
  var downloadDir = Meteor.settings.downloadDir;
	var staticDir = process.cwd() + '/assets/app/doc-templates/';
	var templates = {};
	var fs = require('fs');
	var ecstatic = require('ecstatic');
	var _express = require('express');
	Express = function() {
    var app = _express();
    WebApp.connectHandlers.use(Meteor.bindEnvironment(app));
    return app;
  };

	//Originally saved in public/templates_

	fs.readFile(staticDir + '/pod.html', 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
		templates.pod = _.template(data);//, null, { interpolate: /\{\{(.+?)\}\}/g } );
    });
	fs.readFile(staticDir + '/collection.html', 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
		templates.collection = _.template(data);
    });


  var app=Express();
	app.use('/doc-images', ecstatic({root: imagesDir}) );
  // app.use('/download/', ecstatic({root: downloadDir}) );
  app.use('/download/', _express.static(downloadDir));
	app.use('/doc', ecstatic({root: staticDir}));
	app.use('/doc/pod', ecstatic({root: staticDir}));
	app.use('/doc/collection/:id', ecstatic({root: staticDir}));
	app.use('/doc/pod/:id', ecstatic({root: staticDir}));
	app.use('/doc/collection', ecstatic({root: staticDir}));
	app.use('/sync/123456', Meteor.bindEnvironment((req,res)=>{
      DrupalSync.Sync();
		res.send(200,'done');
	}));
	app.use('/sync/password/:userName', Meteor.bindEnvironment((req,res)=>{
    DrupalSync.SetSyncUserPasswordPlease(req.params.userName);
		res.send(200,'done');
	}));
	app.get('/doc/pod/:id/:orderIndex/:docKey', Meteor.bindEnvironment(function(req, res) {
			var delivery = Deliveries.findOne(req.params.id);
			var data = {};
			var orderIndex = req.params.orderIndex;
      var docKey = req.params.docKey;
			//console.log(req.params.id);
			//res.send(200, JSON.stringify(doc.customer));

			try {
				var p = new PodAPI();
				p.setOrder(delivery, orderIndex);
				var documentData = p.getDoc(docKey);
				var orderData = p.getOrder();
				const doc = (path, def) => {
      		let value = _.deepGet(documentData, path);
      		if (_.isUndefined(value)) value = def;
      		// console.log([path, value]);
      		return value;
    		};
				const dlv = (path, def) => {
      		let value = _.deepGet(delivery, path);
      		if (_.isUndefined(value)) value = def;
      		// console.log([path, value]);
      		return value;
    		};

				const order = (path, def) => {
      		let value = _.deepGet(orderData, path);
      		if (_.isUndefined(value)) value = def;
      		// console.log([path, value]);
      		return value;
    		};

				var m = new moment(doc('signature_customer.time'));

				data.signedDate = m.toLocaleString();
				data.kmDistance = parseInt(doc('km_after')) - parseInt(doc('km_before'));
				data.arrival_time = moment(doc('arrival_time')*1000).format('YYYY/MM/DD')
        data.departure_time = moment(doc('departure_time')*1000).format('YYYY/MM/DD')
				data.doc = doc;
				data.dlv = dlv;
				data.order = order;
				data.imageBaseUrl = '';
				// if (req.params.dump === '1') {
        if ('never' === '1') {
				  res.send(200, '<pre>'+ JSON.stringify(orderData,null,2) +'</pre>')
				} else {
          res.send(200, templates.pod(data));
				}
			} catch (e) {
				console.log(e);
				res.send(444, 'error');
			}
	}));

}
