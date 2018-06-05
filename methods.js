Meteor.methods({
	ValidateUser: function(loginDetails) {
		if (Meteor.isServer)
		{
			return DrupalSync.ValidateUser(loginDetails);
		}
	},
	SyncDrupal: function () {
		//get latest orders from Drupal site
		if (Meteor.isServer) {
			this.unblock();
			DrupalSync.Sync();
		}
	},
	SendDeliveryDoc: function (deliveryId, orderIndex, docKey) {
		if (! Meteor.userId()) {
			throw new Meteor.Error('not authorized');
		}
			this.unblock();

		if (Meteor.isServer) {
			SendDoc.Send(Meteor.userId(), deliveryId, orderIndex, docKey);
		}

	}
});
