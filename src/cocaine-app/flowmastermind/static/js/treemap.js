var treemap = {
    contextMenuVisible: false,
    map: null
};


function showDcTreeMap(dc, type, ns, filter) {
    var container = $('.inner-content'),
        layer = $('<div>');

    layer.addClass('treemap');

    layer.appendTo(container);

    var closeBtn = $('<div>').addClass('close')
        .on('click', function () { window.location.hash = ''; })
        .text('X')
        .appendTo(layer);

    treemap.map = new TreeMap('div.treemap', labels, dc, type, ns, filter);
}

function hideDcTreeMap() {
    $('div.treemap').remove();
    treemap.map = null;
}


function hideNodeContextMenu() {
    if (treemap.contextMenuVisible) {
        $('.context-menu').remove();
    }
}

$(document).on('click', function () {
    hideNodeContextMenu();
});


function failTreemapLoad(layer) {
    layer.children().remove();

    var error = $('<div>').addClass('errormsg')
        .appendTo(layer);

    var errorquote = $('<span>').addClass('quote')
        .appendTo(error)
        .html('Идут по улице три помидора. Папа-помидор, Мама-помидор и Малыш-помидор. <br />' +
              'Малыш-помидор начинает отставать, и Папа-помидор приходит в ярость. <br />' +
              'Он подбегает к нему, давит его ногой всмятку, и говорит: «Догоняй, кетчуп»<br />');
    $('<div>').addClass('qmark').addClass('lqmark')
        .text('«')
        .appendTo(errorquote);
    $('<div>').addClass('qmark').addClass('rqmark')
        .text('»')
        .appendTo(errorquote);
    $('<span>').addClass('quoter')
        .appendTo(error)
        .text('Миа, Криминальное чтиво');
}


function TreeMap(container, labels, curvalue, curtype, ns, filter) {

    var self = this;
    self.initvalue = (curvalue == undefined ? '' : curvalue);
    self.filter = filter;
    self.init(container, labels, ns, curtype);

    d3.select(window).on('resize', self.resize.bind(self));
};


TreeMap.prototype.init = function (container, labels, ns, inittype) {
    var self = this;

    self.virgin = true;
    self.ns = ns;
    self.labels = labels;
    self.container = d3.select(container);
    self.jqContainer = $(container);
    self.crumbs = [];
    self.click_timer = null;
    self.cur_depth = 0;

    self.margin = {top: 40, right: 10, bottom: 20, left: 10};
    self.updateSize();

    self.xScale = d3.scale.linear();
    self.yScale = d3.scale.linear();

    self.padding = d3.scale.linear()
        .domain([0, 5])
        .rangeRound([10, 0]);

    self.treemap = d3.layout.treemap()
        .size([self.width, self.height])
        .sticky(true)
        .round(true)
        .value(function(d) { return d.total_space; })
        .padding(function (d) { return self.padding(d.depth); });


    self.max_space = 100 * 1024 * 1024 * 1024;

    self.colors = {
        free_space: d3.scale.threshold()
                        .domain([self.max_space * 0.05, self.max_space * 0.10, self.max_space * 0.15,
                                 self.max_space * 0.25, self.max_space * 0.50, self.max_space * 1.0])
                        .range([d3.rgb('#a70000'),
                                d3.rgb('#f22b00'),
                                d3.rgb('#ff9000'),
                                d3.rgb('#ffe000'),
                                d3.rgb('#9fff00'),
                                d3.rgb('#62ff58')]),
        free_space_legend_label: function (val) {
            return Math.round((1 - val / self.max_space) * 100) + '%';
        },
        couple_status: d3.scale.ordinal()
                           .domain(['OK', 'BAD', 'BROKEN', 'FROZEN', 'CLOSED', 'FULL', null])
                           .range([d3.rgb('#4ec96a'), d3.rgb('#f04848'), d3.rgb('#962300'),
                                   d3.rgb('#96c5ff'), d3.rgb('#bbb'), d3.rgb('#bbb'),
                                   d3.rgb('#f2ee60')]),
        couple_status_legend_label: function (val) {
            return (val != null ) ? val : 'NOT COUPLED';
        },
        fragmentation: d3.scale.threshold()
                        .domain([0.1, 0.15, 0.25, 0.4])
                        .range([d3.rgb('#E7F8F2'),
                                d3.rgb('#A6A59D'),
                                d3.rgb('#645248'),
                                d3.rgb('#1e1815')]),
        fragmentation_legend_label: function (val) {
            return (val * 100).toFixed(2) + '%';
        }
    };

    self.svg_container = self.container
        .append('svg');

    self.svg = self.svg_container
        .append('g')
            .attr('transform', 'translate(' + self.margin.left + ',' + self.margin.top + ')');

    self.svg_labels = self.svg_container
        .append('g')
            .attr('transform', 'translate(' + self.margin.left + ',' + self.margin.top + ')');

    self.svg_legend = self.svg_container
        .append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(' + self.margin.left + ',' + (self.margin.top + self.height) + ')');

    self.createTopline();

    $(document).on('contextmenu', function (e) {
        var target = d3.select(e.target);
        if (target.attr('class') != 'cell-rect') {
            return true;
        }

        var d = e.target.__data__;
        while (d.depth > self.cur_depth) {
            d = d.parent;
        }

        if (d.depth != self.max_depth - 1) {
            return true;
        }

        self.showNodeContextMenu(e);
        e.preventDefault();
    });

    self.createSwitcher(inittype);

    self.periodicUpdate();
};


TreeMap.prototype.update = function (data) {

    var self = this;

    self.data = data;
    self.nodes = self.treemap.sticky(true).nodes(self.data);

    self.nodes.forEach(function (node) {
        if (node.colors == undefined) {
            node.colors = {
                free_space: d3.scale.threshold()
            }
        }
        node.colors.free_space.domain([node.total_space * 0.05, node.total_space * 0.10, node.total_space * 0.15,
                                       node.total_space * 0.25, node.total_space * 0.50, node.total_space * 1.0])
            .range([d3.rgb('#a70000'),
                    d3.rgb('#f22b00'),
                    d3.rgb('#ff9000'),
                    d3.rgb('#ffe000'),
                    d3.rgb('#9fff00'),
                    d3.rgb('#62ff58')]);
    });

    /// TODO: stupid crutch, fix it
    if (labels != self.labels) {
        self.labels = labels;
    }

    if (self.virgin) {
        self.cur_node = self.nodes[0];
    }
    self.max_depth = d3.max(self.nodes, function (d) { return d.depth; });
    self.max_space = d3.max(self.nodes, function (d) { return d.total_space; });

    // updating colors
    self.colors.free_space.domain([self.max_space * 0.05, self.max_space * 0.10, self.max_space * 0.15,
                                   self.max_space * 0.25, self.max_space * 0.50, self.max_space * 1.0]);

    var new_cell = self.svg.selectAll('g.cell')
        .data(self.nodes)
    .enter()
        .append('g')
        .attr('class', 'cell')
        .call(self.handleClick.bind(self))
        .call(self.handleMouseEnter.bind(self))
        .call(self.handleMouseLeave.bind(self));

    new_cell.append('rect')
        .attr('width', function (d) { return 20; })
        .attr('height', function (d) { return 20; })
        .attr('class', 'cell-rect')
        .attr('fill-opacity', function (d) {
            if (d.depth == self.max_depth) return 0.75;
            return 0;
        })
        .attr('fill', function (d) {
            if (d.depth == self.max_depth) return self.container.style('background-color');
            return null;
        });

    self.svg.selectAll('g.cell')
        .selectAll('rect')
        .data(function (d) { return d; });

    if (self.virgin) {
        self.createSearch();
        self.resize();
        self.zoom_by_path(self.initvalue);
    } else {
        self.repaintNodes();
    }
};


TreeMap.prototype.repaintNodes = function() {
    var self = this;

    var t = self.svg.selectAll('g.cell').select('rect').transition();

    t.attr('fill', function(d) {
        if (d.depth == self.max_depth) {
            if (self.type != 'free_space') {
                return self.colors[self.type](d[self.type]);
            } else {
                // each node has custom scale of free_space
                return d.colors[self.type](d[self.type]);
            }
        }
        return null;
    });
};


TreeMap.prototype.periodicUpdate = function () {

    var self = this,
        spinner = null;

    if (self.virgin) {
        spinner = new Spinner('div.treemap');
        spinner.start();
    }

    var tries = 0,
        max_tries = 3,
        url = '/json/map/';

    if (self.ns) {
        url += self.ns + '/';
    }

    function loadTreemap() {
        var params = {
            url: url,
            method: 'get',
            dataType: 'json',
            success: function (data) {
                if (self.virgin) spinner.stop();
                self.update(data);
                self.virgin = false;
            },
            error: function () {
                tries += 1;
                if (tries >= max_tries) {
                    if (self.virgin) failTreemapLoad(layer);
                    return;
                }
                setTimeout(loadTreemap, 2000);
            }
        };
        var couple_status = undefined;
        // TODO add info about archived_couples, service_active_couples, service_stalled_couples,
        // uncoupled_groups, occupied_space/used_space
        if (self.filter == 'uncoupled_space') {
            couple_status = 'UNCOUPLED';
        } else if (self.filter == 'free_space' || self.filter == 'open_couples') {
            couple_status = 'OK';
        } else if (self.filter == 'occupied_space' || self.filter == 'closed_couples') {
            couple_status = 'FULL';
        } else if (self.filter == 'bad_couples') {
            couple_status = 'BAD';
        } else if (self.filter == 'broken_couples') {
            couple_status = 'BROKEN';
        } else if (self.filter == 'frozen_couples') {
            couple_status = 'FROZEN';
        }
        if (couple_status) {
            params.data = {
                'couple_status': couple_status
            };
        }
        json_ajax(params);
    }

    loadTreemap(spinner);

    // setTimeout(self.periodicUpdate.bind(self), 30000);
}

TreeMap.prototype.close = function () {
    var self = this;
    if (d3.event.keyCode == 27) {
        window.location.hash = '';
    }
};

TreeMap.prototype.createTopline = function () {
    var self = this;

    self.topline_margin = {left: self.margin.left, right: 300 + self.margin.right};

    self.svg_topline = self.svg_container
        .append('g')
            .attr('class', 'topline')
            .attr('transform', 'translate(' + self.topline_margin.left + ',0)');

    self.svg_topline
        .append('rect')
            .attr('class', 'topline-bg')
            .attr('width', parseInt(self.container.style('width')) - self.margin.left - self.margin.right)
            .attr('height', 40);

    self.svg_topline_g = self.svg_topline
        .append('g');
};

TreeMap.prototype.paint = function(type) {
    var self = this,
        switcher = self.jqContainer.find('div.switcher'),
        radio = switcher.find('input[name=type][value=' + type + ']');

    switch (type) {
        case 'free_space':
            self.type = type;
            break;
        case 'couple_status':
            self.type = type;
            break;
        case 'fragmentation':
            self.type = type;
            break;
    }

    switcher.find('label').removeClass('selected');
    switcher.find('label[for=' + radio.attr('id') + ']').addClass('selected');

    self.drawLegend();
};

TreeMap.prototype.createSwitcher = function(default_val) {

    var self = this;

    if (default_val == undefined) {
        default_val = 'free_space';
    }

    self.switcher = self.container
        .append('div')
        .attr('class', 'switcher')
        .append('form');

    self.switcher
        .append('input')
        .attr('type', 'radio')
        .attr('name', 'type')
        .attr('value', 'free_space')
        .attr('id', 'type1');

    self.switcher
        .append('label')
        .attr('for', 'type1')
        .text('свободное место');

    self.switcher
        .append('input')
        .attr('type', 'radio')
        .attr('name', 'type')
        .attr('value', 'couple_status')
        .attr('id', 'type2');

    self.switcher
        .append('label')
        .attr('for', 'type2')
        .text('каплы');

    self.switcher
        .append('input')
        .attr('type', 'radio')
        .attr('name', 'type')
        .attr('value', 'fragmentation')
        .attr('id', 'type3');

    self.switcher
        .append('label')
        .attr('for', 'type3')
        .text('фрагментация');

    var switcher = self.jqContainer.find('div.switcher');

    switcher.find('input[name=type]').on('click', function() {
        PseudoURL.setParam('t', this.value).load();
    });

    self.paint(default_val);
};

TreeMap.prototype.createSearch = function() {
    var self = this,
        lookupData = [],
        focus_time = 150,
        right_margin = 300,
        folded_width = 90,
        full_width = 250;

    self.nodes.forEach(function (node) {
        if (node.type == 'root')
            return;

        lookupData.push({value: self.nameLabel(node.type, node.name),
                         data: node});
    });

    self.search = $('<div>')
        .addClass('search')
        .css({right: right_margin,
              width: folded_width + 40})
        .appendTo(self.jqContainer);

    $('<img>')
        .addClass('search-icon')
        .attr('src', '/static/img/find.png')
        .appendTo(self.search);

    self.search_field = $('<input>')
        .attr('type', 'text')
        .css('width', folded_width)
        .addClass('search-field')
        .appendTo(self.search);

    self.search_field.on('focus', function () {
        self.search.animate({
            width: full_width + 40
        }, focus_time);
        self.search_field.animate({
            width: full_width
        }, focus_time, function () {
            self.renderCrumbs();
        });
    });

    $(window).blur(function () {
        var search = $('input.search-field');
        if (search.data('autocomplete')) {
            search.data('autocomplete').hide();
        }
    });

    self.search_field.on('focusout', function () {
        self.search.animate({
            width: folded_width + 40
        }, focus_time);
        self.search_field.animate({
            width: folded_width
        }, focus_time, function () {
            self.renderCrumbs();
        });
    });

    // setting up autocomplete
    var ac = self.search_field.autocomplete({
        width: full_width + 8,
        maxHeight: 400,
        onSelect: function (value) {
            var node = value.data;
            if (node.type == 'group') {
                PseudoURL.setParam('info', node.name);
                node = node.parent;
                $(this).focusout();
            } else {
                PseudoURL.setParam('info', null);
            }
            self.go(node);
        },
        lookup: lookupData,
        autoSelectFirst: true,
        triggerSelectOnValidInput: false,
        tabDisabled: true,
        lookupFilter: function (suggestion, originalQuery, queryLowerCase) {
            return suggestion.value.toLowerCase().indexOf(queryLowerCase) === 0;
        },
        formatResult: function (suggestion, currentValue) {
            var pattern = '(' + $.Autocomplete.utils.escapeRegExChars(currentValue) + ')';

            var type_label = '<span class="label">' + self.typeLabel(suggestion.data.type) + '</span>';
            return type_label + '<span class="value">' +
                   suggestion.value.replace(new RegExp(pattern, 'i'), '<strong>$1<\/strong>') +
                   '</span>';
        },
        beforeRender: function (container) {
            container.css({'margin-left': folded_width - full_width});
        }
    });
};


TreeMap.prototype.updateSize = function() {
    var self = this;

    self.width = parseInt(self.container.style('width')) - self.margin.left - self.margin.right;
    self.height = parseInt(self.container.style('height')) - self.margin.top - self.margin.bottom;
};


TreeMap.prototype.drawLegend = function() {

    var self = this;

    self.svg_legend.selectAll('g').remove();

    self.colors[self.type].range().forEach(function (color, i) {
        var g = self.svg_legend
                    .append('g'),
            val = self.colors[self.type].domain()[i];
        g.append('rect')
            .attr('class', 'legend-colorsample')
            .attr('x', i * 100)
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill-opacity', 0.75)
            .style('fill', color);

        g.append('text')
            .attr('class', 'legend-label')
            .attr('class', 'label')
            .attr('x', i * 100 + 15)
            .attr('y', 4)
            .text('— ' + self.colors[self.type + '_legend_label'](val));
    });
};


TreeMap.prototype.resize = function () {
    var self = this;

    hideNodeContextMenu();

    self.updateSize();

    self.svg_container
        .attr('width', self.width + self.margin.left + self.margin.right)
        .attr('height', self.height + self.margin.top + self.margin.bottom);

    self.svg_legend
        .attr('transform', 'translate(' + self.margin.left + ',' + (self.margin.top + self.height) + ')');

    self.zoom(self.cur_node);

    self.renderCrumbs();
};


TreeMap.prototype.handleClick = function(selection) {
    var self = this;

    selection
        .on('click', function (d) {

            if (self.click_timer !== null) {

                clearTimeout(self.click_timer);
                self.click_timer = null;

                self.processDoubleClick(d, self.cur_depth - 1);

            } else {

                self.click_timer = setTimeout((function (d, newdepth) {
                    return function () {
                        res = self.processSingleClick(d, newdepth);
                        self.click_timer = null;
                        return res;
                    }
                })(d, self.cur_depth + 1), 230);

            }

            self.svg.selectAll('g.selection')
                .remove();
        });
};

TreeMap.prototype.processSingleClick = function(node, newdepth) {

    var self = this;

    if (newdepth == self.max_depth) {
        if (node.depth != self.max_depth)
            return;
        PseudoURL.setParam('info', node.name).load();
        return;
    }

    if (self.cur_depth + 1 != newdepth) {
        return;
    }

    // because actual click always happens on the lowest tree node,
    // we need to traverse back to the next depth level
    var d = node;
    while (d.depth > newdepth) {
        d = d.parent;
    }

    // and here we fall through the levels consisting of one child element
    while (d.depth < self.max_depth - 1 && d.children.length == 1) {
        d = d.children[0];
    }

    self.go(d);
};


TreeMap.prototype.go = function(node, highlight_node) {
    var self = this,
        nodes_path = [],
        x = node;

    while (x.name != 'root') {
        nodes_path.splice(0, 0, x.name);
        x = x.parent;
    }

    PseudoURL.setParam('path', nodes_path.join('|'));
    if (highlight_node) {
        PseudoURL.setParam('highlight', highlight_node.name);
    } else {
        PseudoURL.setParam('highlight', null);
    }
    PseudoURL.load();
};


TreeMap.prototype.processDoubleClick = function(node, newdepth) {

    var self = this;

    if (self.cur_depth - 1 != newdepth || newdepth < 0) {
        return;
    }
    var d = node;
    while (d.depth > newdepth) {
        d = d.parent;
    }
    self.go(d);
};


TreeMap.prototype.zoom_by_path = function (path) {
    var self = this,
        node_names = path.split('|'),
        curnode = self.nodes[0];

    for (var i = 0; i < node_names.length; i++) {
        var found = false;
        for (var j = 0; j < curnode.children.length; j++) {
            if (curnode.children[j].name == node_names[i]) {
                curnode = curnode.children[j];
                found = true;
                break;
            }
        }
        if (!found)
            break;
    }

    self.zoom(curnode);
};

TreeMap.prototype.highlight = function(name) {
    var self = this;

    self.svg.selectAll('g.cell')
        .select('rect')
        .attr('stroke', function (d) {
            if (d.depth == self.max_depth) {
                if (d.name == name) {
                    return '#444444';
                }
            }
            return null;
        })
        .attr('stroke-width', function (d) {
            if (d.depth == self.max_depth) {
                if (d.name == name) {
                    return 2;
                }
            }
            return null;
        });
};


TreeMap.prototype.zoom = function (node) {
    var self = this;

    // check if needed
    self.treemap.size([self.width, self.height]);

    self.nodes = self.treemap.nodes(self.data);

    self.nodes.forEach(function (node) {
        node.dx = Math.max(node.dx, 1);
        node.dy = Math.max(node.dy, 1);
    });

    // ----------------

    var kx = self.width / node.dx,
        ky = self.height / node.dy;
    self.xScale.domain([node.x, node.x + node.dx])
        .range([0, self.width]);
    self.yScale.domain([node.y, node.y + node.dy])
        .range([0, self.height]);


    var t = self.svg.selectAll('g.cell').transition()
        .attr('transform', function(d) { return "translate(" + self.xScale(d.x) + "," + self.yScale(d.y) + ")"; });

    t.select('rect')
        .attr('width', function(d) { return kx * d.dx; })
        .attr('height', function(d) { return ky * d.dy; })
        .attr('fill', function(d) {
            if (d.depth == self.max_depth) {
                if (self.type != 'free_space') {
                    return self.colors[self.type](d[self.type]);
                } else {
                    // each node has custom scale of free_space
                    return d.colors[self.type](d[self.type]);
                }
            }
            return null;
        });

    self.svg_labels.selectAll('.node-label')
        .transition()
        .duration(150)
        .style('opacity', 0)
        .each('end', function () {
            d3.select(this).remove();
        });

    self.svg_labels.selectAll('.clippath').remove();

    t.select('rect')
        .filter(function (d) { return (d.parent == node);})
        .each(function (d, i) {
            self.svg_labels
                .append('clipPath')
                    .attr('class', 'clippath')
                    .attr('id', 'node_clip' + i)
                .append('rect')
                    .attr('x', self.xScale(d.x) + 4)
                    .attr('y', self.yScale(d.y) + 4)
                    .attr('width', Math.max(kx * d.dx - 8, 0))
                    .attr('height', Math.max(ky * d.dy - 8, 0));

            self.svg_labels
                .append('text')
                .attr('class', 'node-label')
                .attr('id', 'node' + i)
                .attr('clip-path', 'url(#node_clip' + i + ')')
                .attr('x', self.xScale(d.x))
                .attr('y', self.yScale(d.y))
                .attr('dy', 15)
                .attr('dx', 15)
                .style('fill', (self.type == 'fragmentation') ? '#d57b23': '#333')
                .style('alignment-baseline', 'central')
                .style('text-anchor', 'start')
                .style('font-size', '11px')
                .style('opacity', 0)
                .text((ky * d.dy - 8 > 14) ? self.nameLabel(d.type, d.name): '')
                .transition()
                .duration(200)
                .style('opacity', 1);
        });

    self.cur_depth = node.depth;
    self.cur_node = node;

    var crumbs = [],
        node = self.cur_node;

    while (node.parent != undefined) {
        crumbs.push([self.typeLabel(node.type), node]);
        node = node.parent;
    }

    if (node.type != 'root') {
        crumbs.push([self.typeLabel(node.type), node]);
    }

    crumbs.reverse();
    self.crumbs = crumbs;

    self.renderCrumbs();
};

TreeMap.prototype.typeLabel = function(type) {
    var self = this;
    return self.labels['types'][type] || type;
};

TreeMap.prototype.nameLabel = function(type, name) {
    var self = this;
    return self.labels[type] && self.labels[type][name] || name;
};

TreeMap.prototype.showNodeContextMenu = function(event) {
    var self = this,
        data = event.target.__data__;

    treemap.contextMenuVisible = true;

    hideNodeContextMenu();

    var contextMenu = $('<div>').addClass('context-menu')
        .css({top: event.clientY,
              left: event.clientX})
        .appendTo(self.jqContainer);

    if (contextMenu.width() + event.clientX > $(window).width()) {
        contextMenu.css({left: $(window).width() - contextMenu.width() - 3});
    }

    contextMenu.on('click', function (e) {
        e.stopPropagation();
    });

    var label = $('<div>')
        .addClass('label')
        .text(data['node_addr'])
        .appendTo(contextMenu);

    var btn = $('<div>')
        .addClass('item')
        .appendTo(contextMenu);

    var btn_icon = $('<div>')
        .addClass('item-icon')
        .appendTo(btn);

    var btn_label = $('<div>')
        .addClass('item-label')
        .appendTo(btn);

    if (data['node_status'] == 'OK' || data['node_status'] == 'RO') {
        btn_label.text('Положить');
        btn.on('click', self.bindShutdownNode(btn, data));
    } else {
        btn_label.text('Поднять');
        btn.on('click', self.bindStartNode(btn, data));
    }
};

TreeMap.prototype.bindShutdownNode = function (btn, node) {
    var self = this;
    return self.shutdownNode.bind(self, btn, node);
};


TreeMap.prototype.bindStartNode = function (btn, node) {
    var self = this;
    return self.startNode.bind(self, btn, node);
};


TreeMap.prototype.executeNodeCmd = function (url, type) {

    var self = this;

    return function (btn, node) {

        var img = $('.img_container').find('.loader').clone(),
            btn_label = btn.find('.item-label'),
            btn_icon = btn.find('.item-icon');

        btn_icon.append(img);

        $.ajax(url, {
            type: 'POST',
            dataType: 'json',
            timeout: 3000,
            data: {
                'node': node['node_addr']
            },
            success: function (data) {
                if (data['status'] != 'success') {
                    console.log('error happened');
                    console.log(data);
                    cleanUp();
                    return;
                }

                var uid = data.response,
                    errors = 0;

                function checkUid() {

                    $.ajax('/json/commands/status/' + uid + '/', {
                        dataType: 'json',
                        timeout: 3000,
                        success: function (data) {
                            if (data['status'] != 'success') {
                                console.log('error happened');
                                console.log(data);
                                errors += 1;
                                if (errors >= 3) {
                                    console.log('Retry limit exceeded, stop checking');
                                    window.oNotifications.createNotification({
                                        title: 'Огого!',
                                        text: 'Не удалось проверить ' +
                                            'статус операции для ноды ' + node['node_addr'],
                                        onBeforeShow: self.errorNotification});
                                    cleanUp();
                                    return;
                                }
                                setTimeout(checkUid, 200);
                                return;
                            }

                            var status = data['response'];

                            if (status.progress == 1) {
                                console.log('completed');

                                window.oNotifications.createNotification({
                                    title: 'Огого!',
                                    text: (type == 'shutdown' ?
                                           'Нода ' + node['node_addr'] + ' опущена' :
                                           'Нода ' + node['node_addr'] + ' поднята'),
                                    onBeforeShow: self.successNotification
                                    });
                                cleanUp();

                                // Resetting button
                                btn_label.text(type == 'shutdown' ? 'Поднять' : 'Положить');
                                btn.off('click');
                                btn.on('click', (type == 'shutdown' ?
                                    self.bindStartNode.bind(self)(btn, node) :
                                    self.bindShutdownNode.bind(self)(btn, node)));

                                node.node_status = (type == 'shutdown' ? 'STALLED' : 'OK');

                                return;
                            }

                            console.log('Checking in 200ms again');
                            setTimeout(checkUid, 1200);
                        },
                        error: function (data) {
                            errors += 1;
                            if (errors >= 3) {
                                console.log('Retry limit exceeded, stop checking');
                                window.oNotifications.createNotification({
                                    title: 'Огого!',
                                    text: 'Не удалось проверить ' +
                                        'статус операции для ноды ' + node['node_addr'],
                                    onBeforeShow: self.errorNotification});
                                cleanUp();
                                return;
                            }
                            setTimeout(checkUid, 200);
                        }
                    });

                }

                setTimeout(checkUid, 200);

            },
            error: function (data) {
                window.oNotifications.createNotification({
                    title: 'Огого!',
                    text: 'Не удалось отправить ' +
                        'команду на ноду ' + node['node_addr'],
                    onBeforeShow: self.errorNotification});

                cleanUp();
            }
        });

        function cleanUp() {
            btn_icon.html('');
        }
    }
}


TreeMap.prototype.shutdownNode = TreeMap.prototype.executeNodeCmd(
    '/json/commands/execute/node/shutdown/', 'shutdown');


TreeMap.prototype.startNode = TreeMap.prototype.executeNodeCmd(
    '/json/commands/execute/node/start/', 'start');


TreeMap.prototype.successNotification = function (notification) {
    $(notification).addClass('o-notification-success');
};


TreeMap.prototype.errorNotification = function (notification) {
    $(notification).addClass('o-notification-error');
};


TreeMap.prototype.renderCrumbs = function(additional) {

    var self = this,
        padding = 5;

    self.svg_topline_g.selectAll('*').remove();
    var offset = 0;

    function render(p, i, crumbClass) {
        var link = (crumbClass == 'crumbs');
        var node = p[1],
            label = self.svg_topline_g
            .append('text')
            .attr('class', crumbClass)
            .attr('y', self.margin.top / 2)
            .attr('x', offset)
            .text((i == 0) ? p[0] + ': ' : ' > ' + p[0] + ': ');
        offset += label.node().getComputedTextLength() + padding;

        var value = self.svg_topline_g
            .append('text')
            .attr('class', link ? crumbClass + ' value' : crumbClass)
            .attr('y', self.margin.top / 2)
            .attr('x', offset)
            .text(self.nameLabel(node.type, node.name));

        if (link) {
            value.on('click', function () {
                self.go(node);
            });
        }

        offset += value.node().getComputedTextLength() + padding;

    }

    self.crumbs.forEach(function (p, i) {
        render(p, i, 'crumbs');
    });

    if (additional) {
        [additional].forEach(function (p, i) {
            render(p, self.crumbs.length + i, 'precrumbs');
        });
    }

    var text_length = self.svg_topline_g.node().getBBox().width,
        available_length = parseInt(self.container.style('width')) - self.topline_margin.left -
                           self.topline_margin.right - self.search.outerWidth(),
        offset = available_length - text_length;

    var text_offset = d3.min([offset, 0]);

    self.svg_topline_g
        .transition()
        .attr('transform', 'translate(' + text_offset + ',0)');
};


TreeMap.prototype.handleMouseEnter = function(selection) {
    var self = this;

    selection
        .on('mouseenter', function (d) {

            if (d.depth < self.cur_depth + 1) {
                return;
            }

            var node = d;
            while (node.depth > self.cur_depth + 1) {
                node = node.parent;
            }
            self.svg
                .insert('g', ':first-child')
                .attr('class', 'selection')
                .attr('transform', 'translate(' + self.xScale(node.x) + ',' + self.yScale(node.y) + ')')
                .append('rect')
                .attr('width', self.xScale(node.x + node.dx) - self.xScale(node.x))
                .attr('height', self.yScale(node.y + node.dy) - self.yScale(node.y))
                .attr('fill', '#ccc')
                .attr('fill-opacity', 0.5);

            self.renderCrumbs([self.typeLabel(node.type), node]);
        });
};

TreeMap.prototype.handleMouseLeave = function(selection) {
    var self = this;

    selection
        .on('mouseleave', function (d) {
            self.svg.selectAll('g.selection').remove();
        });
};

