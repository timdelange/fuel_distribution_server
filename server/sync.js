/* jshint esversion: 6 */
import _ from 'lodash';
DrupalSync = {
    baseURL: Meteor.settings.syncBaseUrl,
    syncUsername: Meteor.settings.syncUsername,
    syncPassword: Meteor.settins.syncPassword,
    lock: false,
    Sync: function () {
      try {
        if (DrupalSync.lock) return false;
        const auth = DrupalSync.AppConnectorLogin2Bf();
        if (!auth) { console.error('Sync: could not log in'); return false; }
        const depots = DrupalSync.RequestDepots(auth.token, auth.cookie);
        if (!depots) { console.error('Sync: could not request depots'); return false; }
        DrupalSync.SyncDepots(depots);
        const contacts = DrupalSync.RequestContacts(auth.token, auth.cookie);
        if (!contacts) { console.error('Sync: could not request contacts'); return false; }
        DrupalSync.SyncContacts(contacts);
        const drivers = DrupalSync.RequestDrivers(auth.token, auth.cookie);
        if (!drivers) { console.error('Sync: could not request drivers'); return false; }
        DrupalSync.SyncDrivers(drivers);
        const orders = DrupalSync.RequestOrders(auth.token, auth.cookie);
        if (!orders) { console.error('Sync: could not request orders'); return false; }
        DrupalSync.SyncOrders(orders);
        const deliveries = DrupalSync.RequestDeliveries(auth.token, auth.cookie);
        if (!deliveries) { console.error('Sync: could not request deliveries'); return false; }
        DrupalSync.SyncDeliveries(deliveries);
      } catch (e) {
        console.log(['Error syncing exception',e]);
      }
    },
    SyncContacts: function (contacts) {
		check(contacts, [Object]);
        const contactCount = contacts.length;
        for (let i = 0; i < contactCount ; i++) {
            let changed, address;
            if (_.deepHas(contacts[i], ['field_field_changed','0','raw','value']))
                changed = contacts[i].field_field_changed[0].raw.value;
            if (_.deepHas(contacts[i], ['field_field_delivery_address','0','raw']))
                address = contacts[i].field_field_delivery_address[0].raw;
            let users_name = _.deepGet(contacts[i], 'users_name' );
            const contact = {
                uid: contacts[i].uid,
                changed: changed,
                address: address,
                users_name: users_name
            };
            const storedContact = Contacts.findOne({uid: contact.uid});
            // console.log([contact.changed, storedContact.changed, contact.users_name])
            if (_.isUndefined(storedContact)) {
                Contacts.insert(contact);
            } else if ( contact.changed != storedContact.changed ) {
                let update = {};
                _.extend(update, storedContact, contact);
                console.log(contact);
                Contacts.update(storedContact._id, update);
            }
        }
    },
    SyncOrders: function (orders) {
		check(orders, [Object]);
        const orderCount = orders.length;
        for (let i=0; i < orderCount; i++) {
            const storedOrder = Orders.findOne({entityform_id: orders[i].entityform_id});
            if (_.isUndefined(storedOrder)) {
                Orders.insert(orders[i]);
            } else if( storedOrder.changed != orders[i].changed ){
                let updatedOrder = {};
                _.extend(updatedOrder, storedOrder, orders[i]);
				console.log("update sync order "+ updatedOrder.entityform_id);
                Orders.update(storedOrder._id,updatedOrder );
            }
            //console.log([storedOrder.changed,orders[i].changed]);
        }
    },
    SyncDeliveries: function (remotedata) {
        //const remotedata = remotedata.deliveries;
		check(remotedata, [Object]);
        const count = remotedata.length;
        for (let i=0; i < count; i++) {
			DrupalSync.SyncDelivery(remotedata[i]);
        }
    },
	SyncDelivery: function (remoteRawdelivery) {
	    const delivery = DrupalSync.AssembleDelivery(remoteRawdelivery);
		check(delivery, Match.ObjectIncluding({entityform_id: String}));
		const query = {entityform_id: delivery.entityform_id};
        const collection = Deliveries;
		const storedItem = collection.findOne(query);
		if (_.isUndefined(storedItem)) {
			collection.insert(delivery);
		} else if( DrupalSync.DeliveryTimeStampsDiffer(storedItem,delivery)){
		  let update = {};
			_.extend(update, storedItem,delivery);
			console.log("update " + storedItem._id + "  " + storedItem.changed);
			collection.update(storedItem._id,update);
		}


	},

	DeliveryTimeStampsDiffer: function (a,b) {
		keys = [
				[ 'changed' ],
				[ 'original_order', 'changed' ],
				[ 'original_order', 'customer','changed' ],
				[ 'depot', 'changed' ],
				[ 'driver_details', 'changed' ],
			];
		for (let i = 0 ; i < keys.length;  i++) {
			let key = _.clone(keys[i]);
			let changedA = _.deepGet(a, key);
			let changedB = _.deepGet(b, key);
			if (changedA != changedB) {
				console.log(keys[i] + "::" + changedA + "/" + changedB);
				return true;
			}

		}
		return false;


	},
	AssembleDelivery: function (rawDelivery) {
		check(rawDelivery, Match.ObjectIncluding({entityform_id: String}));
		const delivery = _.clone(rawDelivery);



		const orderId = _.deepGet(rawDelivery, ['customer_order', 'id']);
		if (orderId) {
			const order = Orders.findOne({entityform_id: orderId});
			delivery.original_order = DrupalSync.AssembleOrder(order);
		}

    if (_.deepGet(rawDelivery,'customer_order.length') >= 1) {
      const orderIds = rawDelivery.customer_order;
      delivery.customer_orders  = orderIds.map((orderRef)=>{
          const rawOrder = Orders.findOne({entityform_id: orderRef.id});
          return DrupalSync.AssembleOrder(rawOrder);
      });
    }

		const depotId = _.deepGet(rawDelivery, ['collection_depot', 'id']);
		if (depotId) {
			const depot = Depots.findOne({entityform_id: depotId});
			delivery.depot = depot;
		}
		const driverId = _.deepGet(rawDelivery, ['driver', 'id']);
		if (driverId) {
			const driver = Drivers.findOne({Uid: driverId});
			delivery.driver_details = driver;
		}
		return delivery;
	},
	AssembleOrder: function (rawOrder){
		check(rawOrder, Match.ObjectIncluding({user: Object}));
		const order = _.clone(rawOrder);
		const contactId = _.deepGet(rawOrder, ['customer','id']);
		if (contactId) {
			const contact = Contacts.findOne({uid: contactId});
			if (contact) {
				order.customer = contact;
			}
		}
		order.documents = {...order.documents, ...{POD:[]}};
		return order;
	},
	SyncDepots: function (remotedata) {
        //const remotedata = remotedata.deliveries;
		check(remotedata, [Match.ObjectIncluding({entityform_id: String})]);
        const count = remotedata.length;
        const collection = Depots;
        const syncKey = "entityform_id";
        const query = {};
        for (let i=0; i < count; i++) {
            let row = remotedata[i];
            query[syncKey] = row[syncKey];
            const storedItem = collection.findOne(query);
            if (_.isUndefined(storedItem)) {
                collection.insert(row);
            } else if( storedItem.changed != row.changed ){
                _.extend(storedItem, row);
                collection.update(storedItem._id,storedItem );
            }

        }
    },
    SyncDrivers: function (remotedata) {
		check(remotedata, Match.ObjectIncluding({ drivers: [Match.ObjectIncluding({driver: Object})] }));
        remotedata = remotedata.drivers;
        const count = remotedata.length;
        const collection = Drivers;
        const syncKey = "Uid";
        const query = {};
        for (let i=0; i < count; i++) {
            row = remotedata[i].driver;
            query[syncKey] = row[syncKey];
            const storedItem = collection.findOne(query);
            if (_.isUndefined(storedItem)) {
                row.syncPasswordPlease = true;
                collection.insert(row);
            } else if( storedItem.changed != row.changed ){
                row.syncPasswordPlease = true;
                _.extend(storedItem, row);
                collection.update(storedItem._id,storedItem );
            }

        }
    },
    AppConnectorLogin2Bf: function () {
	      var _ = require('lodash');
        const loginURL = this.baseURL + '/api/v1/user/login';
        const loginOptions = {
            "headers": {
                "content-type": "application/json",
                "accept": "application/json",
                "cache-control": "no-cache"
            },
            "data": {
                username: this.syncUsername,
                password: this.syncPassword
            }
        };

        const result = {};

        try {
            const response = HTTP.call("POST", loginURL, loginOptions);
            if (_.has(response,'headers')) {
                if (_.has(response.headers, 'set-cookie')) {
                   result['cookie'] = response.headers['set-cookie'];
                } else {
                    console.log("No cookie set by Drupal server");
                    return false;
                }
            } else {
                console.log( "No headers received with login call");
                return false;
            }
            if (_.has(response,'data')) {
                if (_.has(response.data, 'token')) {
                    result['token'] = response.data['token'];
                } else {
                    console.log("No token set by Drupal server");
                    return false;
                }
            } else {
                console.log( "No data received with login call");
                return false;
            }
        } catch (e) {
            console.error(e + ":   Could not log in to drupal site");
            return false;
        }
        // console.log(result);
        return result;


    },
	RequestDeliveries: function (csrfToken, loginCookie) {
        const URL = this.baseURL + '/api/v1/entity_entityform';
        const options = {
            headers: {
                "content-type": "application/json",
                "accept": "application/json",
                "x-csrf-token": csrfToken,
                "cache-control": "no-cache",
                "cookie": loginCookie
            },
            params: {
                "parameters[type]": "delivery_orders",
                "pagesize": "10000",
                "direction": "DESC",
                "sort": "entityform_id",
                "page": 0
            }
        };
        let result = {};

        try {
            const response = HTTP.call("GET", URL, options);
            result = response.data;
        } catch (e) {
            console.error(e + ":   Could not request deliveries");
            return false;
        }

        return result;
    },
    RequestDepots: function (csrfToken, loginCookie) {
        const _ = require('lodash');
	      if(_.isEmpty(csrfToken) || _.isEmpty(loginCookie)) return false;
        const URL = this.baseURL + '/api/v1/entity_entityform';
        const options = {
            headers: {
                "content-type": "application/json",
                "accept": "application/json",
                "x-csrf-token": csrfToken,
                "cache-control": "no-cache",
                "cookie": loginCookie
            },
            params: {
                "parameters[type]": "collection_depot",
                "pagesize": "10000",
                "direction": "DESC",
                "sort": "entityform_id",
                "page": 0
            }
        };
        let result = {};

        try {
            const response = HTTP.call("GET", URL, options);
            result = response.data;
        } catch (e) {
            console.error(e + ":   Could not request depots");
            return false;
        }

        return result;
    },
    RequestOrders: function (csrfToken, loginCookie) {
        const ordersURL = this.baseURL + '/api/v1/entity_entityform';
        const ordersOptions = {
            headers: {
                "content-type": "application/json",
                "accept": "application/json",
                "x-csrf-token": csrfToken,
                "cache-control": "no-cache",
                "cookie": loginCookie
            },
            params: {
                "parameters[type]": "truck_orders",
                "pagesize": "10000",
                "direction": "DESC",
                "sort": "entityform_id",
                "page": 0
            }
        };
        let result = {};

        try {
            const response = HTTP.call("GET", ordersURL, ordersOptions);
            //console.log(response);
            result = response.data;
        } catch (e) {
            console.error(e + ":   Could not request orders");
            return false;
        }

        return result;


    },
    RequestContacts: function (csrfToken, loginCookie) {
        // const URL = this.baseURL + '/api/v1/views/contacts';
        const URL = this.baseURL + '/fuel_/api/contacts';
        options = {
            headers: {
                "content-type": "application/json",
                "accept": "application/json",
                "x-csrf-token": csrfToken,
                "cache-control": "no-cache",
                "cookie": loginCookie
            },
            params: {
                "format_output": 0
            }
        };
        let result = {};

        try {
            const response = HTTP.call("GET", URL, options);
            //console.log(response);
            result = response.data;
        } catch (e) {
            console.error(e + ":   Could not request Clients");
            return false;
        }

        return result;


    },
    RequestDrivers: function (csrfToken, loginCookie) {
        const URL = this.baseURL + '/drivers';
        options = {
            headers: {
                "content-type": "application/json",
                "accept": "application/json",
                "x-csrf-token": csrfToken,
                "cache-control": "no-cache",
                "cookie": loginCookie
            },
            params: {
                "format_output": 0
            }
        };
        let result = {};

        try {
            const response = HTTP.call("GET", URL, options);
            //console.log(response);
            result = response.data;
        } catch (e) {
            console.error(e + ":   Could not request Drivers");
            return false;
        }

        return result;


    },
    Login2Drupal: function (username, password) {
        const loginURL = this.baseURL + '/api/v1/user/login';
        const loginOptions = {
            "headers": {
                "content-type": "application/json",
                "accept": "application/json",
                "cache-control": "no-cache"
            },
            "data": {
                username: username,
                password: password
            }
        };

        let result = {};

        try {
            const response = HTTP.call("POST", loginURL, loginOptions);
            if (_.has(response,'headers')) {
                if (_.has(response.headers, 'set-cookie')) {
                    result['cookie'] = response.headers['set-cookie'];
                } else {
                    console.error("No cookie set by Drupal server");
                    return false;
                }
            } else {
                console.error( "No headers received with login call");
                return false;
            }
            if (_.has(response,'data')) {
                if (_.has(response.data, 'token')) {
                    result['token'] = response.data['token'];
                } else {
                    console.error("No token set by Drupal server");
                    return false;
                }
            } else {
                console.error( "No data received with login call");
                return false;
            }
        } catch (e) {
            return false;
        }

        return result;
    },
    SetSyncUserPasswordPlease: function(userName) {
      const driver  = Drivers.findOne({name: userName});
      if (driver) {
        driver.syncPasswordPlease = true;
        Drivers.update(driver._id, driver);
      }
    },
    ValidateUser: function (loginDetails) {
        if (loginDetails.username == "admin") return true;
        const driver  = Drivers.findOne({name: loginDetails.username});
        const localAccount = Accounts.users.findOne({username: loginDetails.username});
        if (driver) {
            if (driver.syncPasswordPlease) {
                const drupalAuth = DrupalSync.Login2Drupal(loginDetails.username, loginDetails.password);
                if (drupalAuth) {
                    if (!localAccount) {
                        const newId = Accounts.createUser(loginDetails);
						Accounts.users.update(newId, {$set: {Uid: driver.Uid}});
                    } else {
                        Accounts.setPassword(localAccount._id, loginDetails.password);
						Accounts.users.update(localAccount._id, {$set: {Uid: driver.Uid}});
                    }
                    driver.syncPasswordPlease = false;
                    Drivers.update(driver._id, driver);
                    return true;
                }
            }
            return true;
        }
        return false;
    },
	SyncEvery: function (interval) {
		DrupalSync._interval = interval;
		let firstRun = true;
		const syncIt = () => {
			if (firstRun) {
				firstRun = false;
			 } else {
				console.log("Sync: " + (new Date()));
				try {
					DrupalSync.Sync();
				} catch (error) {
					console.log(error.stack);
					//throw(error);
				}
			}
			if (DrupalSync._interval > 0) {
				console.log("Schedule next sync in " + DrupalSync._interval/1000 + " seconds.");
				DrupalSync._timeOut = setTimeout(Meteor.bindEnvironment(syncIt), DrupalSync._interval);
			}
		};
		if (interval > 0 ) {
			if (DrupalSync._timeOut) clearTimeout(DrupalSync._timeOut);
			syncIt();
		}
	}

};
