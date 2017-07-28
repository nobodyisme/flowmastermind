(function() {

    var updatePeriod = 15000,
        graphs = $('.namespaces'),
        namespaces_menu = $('.namespaces-menu'),
        checkbox_set = new CheckboxSet(namespaces_menu, true),
        namespaces_data = {};

    var settings = ((localStorage &&
                     localStorage['monitor-cefs-ns'] &&
                     JSON.parse(localStorage['monitor-cefs-ns'])) ||
                    {});

    // spinner.start();
    //
    //
    checkbox_set.set_settings(settings);
    
    checkbox_set.set_add_item_cb(function (item_id, item) {
        var cbItem = item.find('input[type=checkbox]');

        item.addClass('menu-item').addClass('ns-menu-item');
        cbItem.addClass('ns-display-cb');
    });
    
    function save_settings(settings) {
        if (localStorage !== undefined) {
            localStorage['monitor-cefs-ns'] = JSON.stringify(settings);
        }
    }
    checkbox_set.set_update_settings_cb(save_settings);

    checkbox_set.set_check_item_cb(function (ns, item) {
        console.log('adding', ns);
        var ns_data = namespaces_data[ns];
        if (ns_data == undefined) {
            ns_data = namespaces_data[ns] = process_namespace(ns);
        }
        ns_data.show();
    });
    checkbox_set.set_uncheck_item_cb(function (ns, item) {
        var ns_data = namespaces_data[ns];
        ns_data.hide();
    });


    function GraphController(namespace_idx, slider, canvas) {
        this.namespace_idx = namespace_idx;
        this.slider = slider;
        this.graph = Graph(
            canvas.get(0),
            canvas.attr('width'),
            parseInt(canvas.attr('height')) - 40,
            0,
            0
        );
        this.total_rec = null;
        this.intervals = new IntervalData();
        this._processing_change = false;

        this.native_resolution = parseInt(canvas.attr('width'));
        this.current_resolution = this.native_resolution;

        this.load(
            undefined,
            this.current_resolution,
            this.init_slider.bind(this)
        );
    
        this.prev_min = null;
        this.prev_max = null;
    };

    GraphController.prototype.view = function (start, count) {
        console.log(start, count, this.intervals);
        var samples = [],
            slice = this.intervals.getSlice(start, count);

        console.log('Slice: ', slice.length);

        var ratio = this.current_resolution / this.native_resolution;
        
        for (var idx=0; idx < this.native_resolution; idx++) {
            var select_idx = Math.round(idx * ratio);
            if (slice[select_idx] == undefined) {
                console.log('Undefined data for index', select_idx);
                break;
            }
            samples.push(slice[select_idx].free_space_percentage_distribution);
        }

        console.log('Length', samples.length);

        this.graph.model.clear();
        this.graph.model.update(samples);
    };

    GraphController.prototype.init_slider = function(response) {
        var self = this;
        this.slider.rangeSlider(
            'values',
            self.total_rec - response['samples'].length,
            self.total_rec - 1
        );
        this.intervals.insert(
            self.total_rec - response['samples'].length,
            response['samples'].length,
            response['samples']
        );

        this.prev_min = self.total_rec - response['samples'].length;
        this.prev_max = self.total_rec - 1;

        var start = this.intervals.intervals[0][0];
        this.view(start, this.native_resolution);

        this.slider.on(
            'userValuesChanged',
            function (e, data) {
                if (self.processing_change) return;
                self._processing_change = true;

                self._adjust_slider();

                var values = self.slider.rangeSlider('values');
                self.prev_min = values.min;
                self.prev_max = values.max;

                // Selected range may be updated by _adjust_slider method.
                // This is required to provide minimal range interval of self.native_resolution
                var data = self.slider.rangeSlider('values');

                var start_idx = data.min,
                    count = data.max - data.min + 1,
                    missing_intervals = self.intervals.missingIntervals(start_idx, count),
                    counter = 0;

                self.current_resolution = Math.max(count, self.native_resolution);

                function on_data_load() {
                    counter += 1;
                    if (counter == missing_intervals.length) {
                        self.view(start_idx, self.current_resolution);
                    }
                }

                console.log('Missing intervals: ', missing_intervals);
                if (missing_intervals.length) {
                    for (var idx = 0; idx < missing_intervals.length; idx++) {
                        var interval = missing_intervals[idx];
                        self.load(interval[0], interval[1], on_data_load);
                    }
                } else {
                    self.view(start_idx, self.current_resolution);
                }

                self._processing_change = false;
            }
        );
    };

    GraphController.prototype._adjust_slider = function() {
        var self = this;

        var data = self.slider.rangeSlider('values'),
            cur_min = data.min,
            cur_max = data.max;

        if (data.max > self.total_rec - 1) {
            cur_max = self.total_rec - 1;
        }
        if (data.min < 0) {
            cur_min = 0;
        }

        console.log(cur_min, cur_max, self.native_resolution);
        if (self.prev_min < cur_min && cur_max - cur_min + 1 < self.native_resolution) {
            // moving left as far as we can
            console.log(11);
            var diff = self.native_resolution - (cur_max - cur_min + 1);
            cur_min = Math.max(0, cur_min - diff);
        }
        
        console.log(cur_min, cur_max, self.native_resolution);
        if (self.prev_max > cur_max && cur_max - cur_min + 1 < self.native_resolution) {
            // moving right as far as we can
            console.log(22);
            var diff = self.native_resolution - (cur_max - cur_min + 1);
            cur_max = Math.min(self.total_rec - 1, cur_max + diff);
        }

        if (cur_min != data.min || cur_max != data.max) {
            // updating slider values
            console.log('Fixing slider values from ', [data.min, data.max], 'to', [cur_min, cur_max]);
            self.slider.rangeSlider('values', cur_min, cur_max);
        }
    };

    GraphController.prototype.load = function(start, limit, success_cb) {
        var self = this;

        self.slider.rangeSlider(
            'option',
            {enabled: false}
        );

        var request_params = {
            ts: new Date().getTime(),
            limit: limit
        };

        if (start !== undefined) {
            request_params['offset'] = self.total_rec - (start + limit);
        }

        json_ajax({
            url: '/json/monitor/couple-free-effective-space/' + this.namespace_idx + '/',
            data: request_params, 
            timeout: 15000,
            dataType: 'json',
            success: function (response) {

                // spinner.stop();
                // console.log(canvas);
                self.total_rec = response['total'];
                self.slider.rangeSlider('bounds', 0, self.total_rec - 1);

                // Reverse is required to properly merge data blocks
                // into interval data structure (self.intervals);
                response['samples'].reverse();

                console.log('inserting', response['samples'].length, 'records from', start);

                if (start !== undefined) {
                    self.intervals.insert(
                        start,
                        response['samples'].length,
                        response['samples']
                    );
                }

                if (success_cb !== undefined) {
                    success_cb(response);
                }

                self.slider.rangeSlider(
                    'option',
                    {enabled: true}
                );
            },
            error: function (data) {
                // spinner.blink('#ab2d2d');
                setTimeout(
                    function () {
                        self.load(start, limit, success_cb);
                    },
                    updatePeriod
                );
            }
        });
    }
    
    function process_namespace(namespace_idx) {
        var ns_container = $('<div class="ns-container">'),
            ns_graph_title = $('<div class="ns-graph-title">').appendTo(ns_container),
            ns_graph = $('<canvas class="ns-graph-canvas">').appendTo(ns_container),
            ns_graph_slider = $('<div class="ns-graph-slider">').appendTo(ns_container);
    
        ns_container.attr('id', namespace_idx);
        ns_container.attr('namespace', namespace_idx);
        ns_graph_title.text('Неймспейс ' + namespace_idx);
        ns_graph.attr('width', 900).attr('height', 340);
        ns_graph_slider.rangeSlider({
            bounds: {
                min: 0,
                max: 100
            },
            defaultValues: {
                min: 0,
                max: 100
            },
            step: 1,
            enabled: false,
            arrows: false,
            valueLabels: "hide"
        });

        insertAlphabetically(ns_container, graphs, function (el) {
            return el.attr('namespace'); 
        });

        new GraphController(namespace_idx, ns_graph_slider, ns_graph);

        return ns_container;
    }

    function process_namespaces(namespaces) {

        var namespace_ids = [];
        for (var idx = 0; idx < namespaces.length; idx++) {
            namespace_ids.push(namespaces[idx].namespace);
        }

        namespace_ids.sort(SortByAlphanum);

        // fetching namespace from fragment url part
        // and updating settings if found
        maybe_ns = location.hash.substr(1);
        if (namespace_ids.indexOf(maybe_ns) != -1) {
            settings[maybe_ns] = true;
            save_settings(settings);
        }

        namespace_ids.forEach(function (ns) { checkbox_set.add(ns); });

        maybe_ns = location.hash.substr(1);
        if (namespaces_data[maybe_ns] !== undefined) {
            // hash is a namespace, move to the anchor
            location.hash = '#dummy';
            location.hash = '#' + maybe_ns;
        }
    }


    function load_namespaces(on_success) {
        json_ajax({
            url: '/json/namespaces/',
            timeout: 10000,
            success: function (response) {
                var namespaces = response;
                on_success(namespaces);
            },
            error: function (response) {
                setTimeout(
                    function () {
                        load_namespaces(on_success);
                    },
                    updatePeriod
                );
            }
        });
    }

    load_namespaces(process_namespaces);

})();



    function IntervalData() {
        this.intervals = [];
        this.intervals_map = {};
    }

    IntervalData.prototype.getSlice = function(start_idx, count) {
        for (var idx = 0; idx < this.intervals.length; idx++) {
            var interval = this.intervals[idx];
            console.log('start_idx ', start_idx, 'interval', interval);
            if (start_idx >= interval[0] && start_idx < interval[1]) {
                var interval_offset = start_idx - interval[0];
                console.log('internal offset', interval_offset,
                            'whole slice length', this.intervals_map[interval].length,
                            'after offset length', this.intervals_map[interval].slice(interval_offset, interval_offset + count).length);
                return this.intervals_map[interval].slice(interval_offset, interval_offset + count);
            }
            if (start_idx < interval[0]) {
                break;
            }
        }
        return [];
    };

    IntervalData.prototype.missingIntervals = function(start_idx, count) {
        var missing_intervals = [];
        if (this.intervals.length == 0) {
            missing_intervals.push([start_idx, count]);
            return missing_intervals;
        }
        for (var idx = 0; idx < this.intervals.length; idx++) {
            var interval = this.intervals[idx];
            if (start_idx < interval[0]) {
                var c = Math.min(count, interval[0] - start_idx);
                missing_intervals.push([start_idx, c]);
                start_idx = interval[0];
                count -= c;
            }
            if (start_idx <= interval[1]) {
                var c = Math.min(count, interval[1] - start_idx);
                start_idx = interval[1];
                count -= c;
            }
            if (c <= 0) break;
        }
        if (count > 0) {
            var interval = this.intervals[this.intervals.length - 1];
            missing_intervals.push([interval[1], count]);
        }
        return missing_intervals;
    };

    IntervalData.prototype.insert = function(start_idx, count, values) {
        var insert_idx = 0;
        for (var idx = 0; idx < this.intervals.length; idx++) {
            if (this.intervals[idx][0] > start_idx) {
                break;
            }
            insert_idx += 1;
        }
        this.intervals.splice(insert_idx, 0, [start_idx, start_idx + count]);
        this.intervals_map[[start_idx, start_idx + count]] = values;

        if (insert_idx < this.intervals.length - 1) {
            this._mergeIntervals(insert_idx, insert_idx + 1);
        }
        if (insert_idx > 0) {
            this._mergeIntervals(insert_idx - 1, insert_idx);
        }
    };

    IntervalData.prototype._mergeIntervals = function(idx1, idx2) {
        var interval1 = this.intervals[idx1],
            interval2 = this.intervals[idx2];

       if (interval1[1] == interval2[0]) {
           var interval1_values = this.intervals_map[interval1],
               interval2_values = this.intervals_map[interval2];

           delete this.intervals_map[interval1];
           delete this.intervals_map[interval2];

           interval1[1] = interval2[1];

           this.intervals_map[interval1] = interval1_values.concat(interval2_values);

           this.intervals.splice(idx2, 1);
       }
    };
