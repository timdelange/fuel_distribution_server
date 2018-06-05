//import _ from 'lodash';

if (Meteor.isServer) {

    Meteor.startup ( function () {
		process.env.MAIL_URL= Meteor.settings.MAIL_URL;
        //======  admin user =========
        if (Accounts.findUserByUsername('admin')) {
            console.log("Found admin user:\t\t OK.");
        } else {
            console.warn("Found admin user:\t FAIL.");
            var result = Accounts.createUser({
                 username: "admin",
                    email: "timdelange@gmail.com",
                 password: "xzxc"
                });
            setTimeout( function () {
                if (result) {
                    console.log('Created admin user:\t\t OK.');
                } else {
                    console.log('Created admin user:\t\t FAIL.');
                }
            },1000);
        }

        //====== orders collection=========
        if (Orders.findOne({})) {
            console.log("Found orders in db:\t\t OK.");
        } else {
            console.log("Syncing with Drupal:\t\t OK.");
            Meteor.setTimeout(()=>{ DrupalSync.Sync();},10);
        }

		Global = Globals.findOne({name: "rover-global"});
		if (Global) {
            console.log("Found global in db:\t\t OK.");
		} else {
			Global = Globals.insert({name: "rover-global"});
		}


		//===== Periodic Sync ===============
		DrupalSync.SyncEvery(Meteor.settings.drupalSyncInterval * 1000);
    });
   //========Periodic Images Archival=======
   // DISABLED cause images.js needs to be redone to support the new data structures
	 //setInterval(Meteor.bindEnvironment(Images.archiveNow), 60 * 60 * 12 * 1000);

}
