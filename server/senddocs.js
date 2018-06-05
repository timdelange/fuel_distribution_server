/*jshint esversion: 6 */
import { Email } from 'meteor/email';
import _ from 'lodash';

SendDoc = {
	Send: function (userId, deliveryId, orderIndex, docKey) {
		var data = {};
		console.log(deliveryId);
		var delivery = Deliveries.findOne(deliveryId);
		if (delivery) {
			var pdf = PDF.getDoc(deliveryId, orderIndex, docKey);
			if (pdf)
			{
				var email = {};
				driver = _.deepGet(Meteor.user(), ['username']) || "";
				email.from = driver + " using " +  Meteor.settings.mailFrom;
				email.to = Meteor.settings.docRecipients;
				email.subject = "(POD)" +" Document for sales order: " + delivery.sales_order_number;

				var attachment = {};
				attachment.filename="POD_"+delivery.sales_order_number+'-'+docKey+'.pdf';
				attachment.content=pdf.data;
				email.attachments = [ attachment ];
				// console.log(email);
				email.text = "Hi there.\n Please find your proof of delivery document attached. \n\nKind Regards\nYour App\n\n";
				console.log("Sending mail..");
				Email.send(email);
			} else {
				console.error('pdf not generated for DeliveryId: "' + deliveryId + '" OrderIndex: "' + orderIndex + '"  DocKey: "'+ docKey +'"');
				return false;
			}
		} else {
			console.error("could not send email with unfound deliveryId");
			return false;
		}
	}
};
PDF = {
	getDocUrl: function (deliveryId,orderIndex, docKey) {
		var docUrl = Meteor.settings.docBaseUrl + '/doc/pod/' + deliveryId + '/' + orderIndex + '/' + docKey;
		console.log({docurl: docUrl});
		var serviceUrl = Meteor.settings.pdfServiceUrl;
		var query =
		   	"?url="        + encodeURIComponent(docUrl) +
			"&download="   + 'false' +
			"&format="     + 'A4' +
			"&orientation=" + 'portrait' +
			"&margin="      + '1cm' ;
		var requestUrl = serviceUrl + '/' + query;
		return requestUrl;
	},
	getDoc: function (id, orderIndex, docKey) {
		var docUrl = PDF.getDocUrl(id, orderIndex, docKey);
		console.log(docUrl);
		var result;
		try {
			result = { data: HTTP.get(docUrl, { responseType: "buffer"}).content};
			return result;
		} catch (e) {
			console.error("pdf template did not render: deliveryId:" + id +" orderIndex: " + orderIndex + " docKey: " + docKey);
		}
	}
};
