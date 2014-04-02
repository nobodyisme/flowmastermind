

var PseudoURL = {
    url: '',
    path: '',
    params: {},
    params_list: [],

    parse: function(hash) {
        var self = this;
        self.url = hash.substr(1);
        self.path = self.url.split('?', 1)[0];
        self.params = {};
        self.params_list = [];

        var pseudoparamsstr = self.url.substr(self.path.length + 1);

        pseudoparamsstr.split('&').forEach(function (keyval) {
            if (keyval == '') return;
            param = keyval.split('=');
            self.params[param[0]] = param[1];

            if (self.params_list.indexOf(param[0]) == -1) {
                self.params_list.push(param[0]);
            }
        });
    },

    setUrl: function (url) {
        var self = this;
        self.parse('#' + url);
        return self;
    },

    setPath: function (path) {
        var self = this;
        self.path = path;
        return self;
    },

    setParam: function(key, value) {
        var self = this,
            idx = self.params_list.indexOf(key);

        if (value == null) {
            // removing value from params
            if (idx != -1) {
                self.params_list.splice(idx, 1);
            }
            delete self.params[key];
        } else {
            // adding or updating value
            if (idx == -1) {
                self.params_list.push(key);
            }
            self.params[key] = value;
        }
        return self;
    },

    constructUrl: function() {
        var self = this,
            params = [];

        self.params_list.forEach(function (key) {
            params.push([key, self.params[key]].join('='));
        });
        var paramsstr = params.join('&');
        return self.path + (paramsstr ? '?' + params.join('&') : '');
    },

    load: function() {
        var self = this;
        window.location.hash = self.constructUrl();
    }
};

PseudoURL.parse(window.location.hash);

console.log(PseudoURL);
