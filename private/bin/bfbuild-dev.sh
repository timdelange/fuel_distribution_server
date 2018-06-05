#!/bin/bash
cd ~/dev/bf-rover
cp mobile-config.js-devtest mobile-config.js
meteor build ../ --server=http://dev:3000
pushd ../android
#keytool -genkey -alias CaltexD-Orders -keyalg RSA -keysize 2048 -validity 10000
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 release-unsigned.apk CaltexD-Orders
rm devtest.apk
/home/tim/.local/share/umake/android/android-sdk/build-tools/23.0.3/zipalign 4 release-unsigned.apk release-signed.apk
mv release-signed.apk devtest.apk
popd
rm mobile-config.js
