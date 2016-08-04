#! /bin/bash

DEPLOY_DIR="/usr/lib/flowmastermind"

echo "Clean old version of Flowmastermind:"

for app in 'flowmastermind';
do 
    rm -rf /var/lib/cocaine/apps/$app
    rm -f /var/lib/cocaine/manifests/$app
    rm -rf /var/spool/cocaine/$app
    rm -rf /var/cache/cocaine/apps/$app
    rm -f /var/cache/cocaine/manifests/$app
done


echo "Deploy New Flowmastermind:"
cocaine-tool app upload --manifest $DEPLOY_DIR/cocaine-app/flowmastermind.manifest --package $DEPLOY_DIR/cocaine-app/flowmastermind.tar.gz -n flowmastermind
cocaine-tool profile upload -n flowmastermind --profile $DEPLOY_DIR/cocaine-app/flowmastermind.profile
cocaine-tool runlist add-app -n default --app flowmastermind --profile flowmastermind --force

chown cocaine -R /usr/lib/flowmastermind
