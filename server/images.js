/* jshint esversion: 6 */
//import { fs } from 'fs';
//
//
//
//  THIS NEEDS TO BE REWORKED AS IT DOESNT SUPPORT MULTIPLE DOCUMENTS PER TYPE
//
//
//
//
import _ from 'lodash';
var fs = Npm.require('fs');
var shelljs = Npm.require('shelljs');
Images = {
	//extract images from older deliveries to disk, and so remove the overhead from the ddp sync.
	getDocumentIds: () => {
		//1 days ago
		var interval = 1000 * 60 * 60 * 24 * 1; //ms sec mins hrs days x 1
		var refTime = (new Date()).valueOf() - interval;
		var Ids = Deliveries.find(
		{
			$and:
			[
				{
					$and:
					[
							{ "documents.pod.signature.customer.time": {$lt: refTime} },
							{ "documents.pod.finalized": true },
							{ "documents.pod.images.0": { $exists: true }}
					]
				},{
					$and:
					[
							{ "documents.collection.signature.default.time": {$lt: refTime} },
							{ "documents.collection.finalized": true },
							{ "documents.collection.images.0": { $exists: true }}
					]
				}
			]
	   	},
		{
			fields: { _id: true }
		}).fetch();
		return Ids.map((v)=>{return(v._id);});
	},
  archiveNow: () => {
    Images.getDocumentIds().forEach( function (id) {
      Images.saveImagesToDisk(id);
    });
    console.log('Archive images to disk');
  },
	saveImagesToDisk: (deliveryId) => {
		var delivery = Deliveries.findOne(deliveryId);
		var imageFiles = { pod: [], collection: []};
		if (_.deepGet(delivery,'imagesArchived') === true) {
			return imageFiles;
		}
		var podImages = _.deepGet(delivery, 'documents.pod.images');
		var collectionImages = _.deepGet(delivery, 'documents.collection.images');
		var collectionSignatureImage = _.deepGet(delivery, 'documents.collection.signature.default.image');
		var podCustomerSignatureImage = _.deepGet(delivery, 'documents.pod.signature.customer.image');
		var podDriverSignatureImage = _.deepGet(delivery, 'documents.pod.signature.driver.image');
		var docType;
		var saveImage = (image, index = "") => {
				imageType = GetImageTypeFromURLString(image.substr(0,16));
				var base64Data ;
				if (imageType == "jpeg") { base64Data = image.replace(/^data:image\/jpeg;base64,/, ""); }
				if (imageType == "png") { base64Data = image.replace(/^data:image\/png;base64,/, ""); }
				var fileName = docType + "_" + deliveryId + "_" + index + "." + imageType;
				var subDir = deliveryId.substr(0,3).split('').join('/') + '/';
				var targetDir = Meteor.settings.imageBaseDir + subDir;
				var outFile = targetDir + fileName;
				shelljs.mkdir('-p', targetDir);
				fs.writeFileSync(outFile, base64Data, 'base64');
				return subDir + fileName;
		};
		if (_.isArray(podImages)) {
			docType = "pod";
			imageFiles.pod = podImages.map( saveImage );
			delivery.documents.pod.images = imageFiles.pod;
		}
		if (_.isArray(collectionImages)) {
			docType = "collection";
			imageFiles.collection = collectionImages.map ( saveImage );
			delivery.documents.collection.images = imageFiles.collection;
		}
		if (! _.isEmpty(collectionSignatureImage)) {
			docType = "collectionSignature";
			imageFiles.collectionSignature =  saveImage(collectionSignatureImage);
			delivery.documents.collection.signature.default.image = imageFiles.collectionSignature;
		}
		if (! _.isEmpty(podDriverSignatureImage)) {
			docType = "podDriverSignature";
			imageFiles.podDriverSignature =  saveImage(podDriverSignatureImage);
			delivery.documents.pod.signature.driver.image = imageFiles.podDriverSignature;
		}
		if (! _.isEmpty(podCustomerSignatureImage)) {
			docType = "podCustomerSignature";
			imageFiles.podCustomerSignature =  saveImage(podCustomerSignatureImage);
			delivery.documents.pod.signature.customer.image = imageFiles.podCustomerSignature;
		}
		delivery.imagesArchived = true;
		Deliveries.update({_id: deliveryId}, delivery);




		return imageFiles;
	}


};
