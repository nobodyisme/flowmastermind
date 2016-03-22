find -L . -type f -regex '.*\.\(py\|js\|json\|css\|png\|gif\|html\)'  -print0 | tar czvf ../package.tar.gz --null -T - &&\
    cocaine-tool app upload --package ../package.tar.gz -n flowmastermind --manifest flowmastermind.manifest &&
    cocaine-tool app restart -n flowmastermind -r flowmastermind &&
    rm ../package.tar.gz
