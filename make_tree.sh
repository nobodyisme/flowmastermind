#! /bin/sh

CURDIR=$PWD

#---------- mastermind code
cd $1/src/cocaine-app/
tar cvf $CURDIR/debian/tmp/usr/lib/flowmastermind/cocaine-app/flowmastermind.tar.gz *.py flowmastermind/*.py flowmastermind/templates/*.html flowmastermind/static
cd $CURDIR
cp $1/src/cocaine-app/*manifest $CURDIR/debian/tmp/usr/lib/flowmastermind/cocaine-app/
cp $1/src/cocaine-app/flowmastermind.profile $CURDIR/debian/tmp/usr/lib/flowmastermind/cocaine-app/
