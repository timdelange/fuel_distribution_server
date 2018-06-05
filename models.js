/*jshint esversion: 6 */
import _ from 'lodash';
Globals = new Mongo.Collection('globals');


Orders = new Mongo.Collection('orders');
Contacts = new Mongo.Collection('contacts');
PickupDocs = new Mongo.Collection('PickupDocs');
PODDocs = new Mongo.Collection('PODDocs');
Drivers = new Mongo.Collection('Drivers');

Deliveries = new Mongo.Collection('deliveries');

if (Meteor.isCordova) {
	Ground.Collection(Deliveries);
	Ground.Collection(Meteor.users);
}

if (Meteor.isServer) {
  Deliveries._ensureIndex({ "changed": 1 });
  Deliveries._ensureIndex({ "driver_details.name": 1 });
  Deliveries._ensureIndex({ "driver_details.Uid": 1 });
  Meteor.publish("deliveries", function (options = { limit: 5 }) {
  _.defaults(options, {limit:20, sort: { changed: -1 } });
		if (this.userId) {
			var account = Accounts.users.findOne(this.userId);
			if (account.username == "admin") {
				return Deliveries.find({}, options);
			} else {
				return Deliveries.find(
					{
						$and:
						[
							{ "driver_details.Uid": account.Uid },
							/*{
								"changed": { $gt:
								look ar using session variables to set delivery limits
							}	*/
						]
					}, options
				);
			}
		}
	});
}
Deliveries.allow({
	update: function (userId, delivery, fields, modifier) {
		if (userId) {
			return true;
		} else {
			return false;
		}
	}
});

if (Meteor.isClient) { 
      Session.set('jobLimit', Meteor.settings.public.jobLimit || 5);
      Tracker.autorun(function () {
        Meteor.subscribe("deliveries", { limit: Session.get('jobLimit')});
      });
}

Depots = new Mongo.Collection('Depots');
