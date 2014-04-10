var treemap;


function showDcTreeMap(dc, type, ns) {
    var container = $('.inner-content'),
        layer = $('<div>');

    layer.addClass('treemap');

    layer.appendTo(container);

    var closeBtn = $('<div>').addClass('close')
        .on('click', function () { window.location.hash = ''; })
        .text('X')
        .appendTo(layer);

    var spinner = new Spinner('div.treemap');
    spinner.start();

    var tries = 0,
        max_tries = 3,
        url = '/json/map/';

    if (ns) {
        url += ns + '/';
    }

    (function loadTreemap() {
        $.ajax({
            url: url,
            method: 'get',
            dataType: 'json',
            success: function (data) {
                spinner.stop();
                treemap = new TreeMap('div.treemap', data, labels, dc, type, ns);
            },
            error: function () {
                tries += 1;
                if (tries >= max_tries) {
                    failTreemapLoad(layer);
                    return;
                }
                setTimeout(loadTreemap, 2000);
            }
        });
    })();
}

function hideDcTreeMap() {
    $('div.treemap').remove();
    treemap = null;
}


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


function TreeMap(container, data, labels, curvalue, curtype, ns) {

    var self = this;

    self.data = data;
    self.ns = ns;
    self.labels = labels;
    self.container = d3.select(container);
    self.jqContainer = $(container);

    self.margin = {top: 40, right: 10, bottom: 20, left: 10};
    self.updateSize();
    self.sidepanel_width = 0;

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

    self.container.append('div')
        .attr('class', 'sidepanel');
    self.sidepanel = $('div.sidepanel');

    self.createTopline();

    d3.select(window).on('resize', self.resize.bind(self));

    self.type = 'free_space';


    self.nodes = self.treemap.nodes(self.data);
    self.cur_depth = 0;
    self.cur_node = self.nodes[0];
    self.click_timer = null;
    self.max_depth = d3.max(self.nodes, function (d) { return d.depth; });

    var max_space = d3.max(self.nodes, function (d) { return d.total_space; });

    self.colors = {
        free_space: d3.scale.threshold()
                        .domain([max_space * 0.05, max_space * 0.10, max_space * 0.15,
                                 max_space * 0.25, max_space * 0.50, max_space * 1.0])
                        .range([d3.rgb('#a70000'),
                                d3.rgb('#f22b00'),
                                d3.rgb('#ff9000'),
                                d3.rgb('#ffe000'),
                                d3.rgb('#9fff00'),
                                d3.rgb('#62ff58')]),
        free_space_legend_label: function (val) {
            return Math.round((1 - val / max_space) * 100) + '%';
        },
        couple_status: d3.scale.ordinal()
                           .domain(['OK', 'BAD', 'FROZEN', 'CLOSED', 'FULL', null])
                           .range([d3.rgb('#4ec96a'), d3.rgb('#f04848'), d3.rgb('#96c5ff'),
                                   d3.rgb('#bbb'), d3.rgb('#bbb'), d3.rgb('#f2ee60')]),
        couple_status_legend_label: function (val) {
            return (val != null ) ? val : 'NOT COUPLED';
        }
    };

    self.crumbs = [];

    var cell = self.svg.selectAll('g.cell')
        .data(self.nodes)
    .enter()
        .append('g')
        .attr('class', 'cell')
        .call(self.handleClick.bind(self))
        .call(self.handleMouseEnter.bind(self))
        .call(self.handleMouseLeave.bind(self));

    cell.append('rect')
        .attr('width', function (d) { return 0; })
        .attr('height', function (d) { return 0; })
        .attr('fill', function (d) {
            if (d.depth == self.max_depth) return self.container.style('background-color');
            return null;
        })
        .attr('fill-opacity', function (d) {
            if (d.depth == self.max_depth) return 0.75;
            return 0;
        });

    self.createSearch();

    self.resize();
    self.createSwitcher(curtype);


    if (curvalue == undefined)
        curvalue = '';

    self.zoom_by_path(curvalue);
};

TreeMap.prototype.close = function () {
    var self = this;
    if (d3.event.keyCode == 27) {
        window.location.hash = '';
    }
};

TreeMap.prototype.createTopline = function () {
    var self = this;

    self.topline_margin = {left: self.margin.left, right: 200 + self.margin.right};

    self.svg_topline = self.svg_container
        .append('g')
            .attr('class', 'topline')
            .attr('transform', 'translate(' + self.topline_margin.left + ',0)');

    self.svg_topline
        .append('clipPath')
            .attr('id', 'topline_clippath')
            .attr('class', 'clippath')
        .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', parseInt(self.container.style('width')) - self.topline_margin.left - self.topline_margin.right)
            .attr('height', 40);

    self.svg_topline
        .append('rect')
            .attr('class', 'topline-bg')
            .attr('width', parseInt(self.container.style('width')) - self.margin.left - self.margin.right)
            .attr('height', 40);

    self.svg_topline_text = self.svg_topline
        .append('text')
            .attr('class', 'crumbs')
            .attr('y', self.margin.top / 2)
            .attr('clip-path', 'url(#topline_clippath)');

    self.svg_topline_text_additional = self.svg_topline
        .append('text')
            .attr('class', 'precrumbs')
            .attr('y', self.margin.top / 2)
            .attr('clip-path', 'url(#topline_clippath)');
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

    var switcher = self.jqContainer.find('div.switcher');

    switcher.find('input[name=type]').on('click', function() {
        // self.paint(this.value);
        PseudoURL.setParam('t', this.value).load();
    });

    // switcher.find('input[name=type][value=' + default_val + ']').click();
    self.paint(default_val);
};

TreeMap.prototype.createSearch = function() {
    var self = this,
        lookupData = [],
        focus_time = 150,
        right_margin = 200,
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
        autoSelectFirst: false,
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

    self.updateSize();

    self.svg_container
        .attr('width', self.width + self.margin.left + self.margin.right)
        .attr('height', self.height + self.margin.top + self.margin.bottom);

    self.svg_legend
        .attr('transform', 'translate(' + self.margin.left + ',' + (self.margin.top + self.height) + ')');

    self.resizeTreeMap(false);
    self.renderCrumbs();
};

TreeMap.prototype.resizeTreeMap = function (transition) {

    var self = this;

    self.treemap.size([self.width - self.sidepanel_width, self.height]);

    self.nodes = self.treemap.nodes(self.data);

    var kx = (self.width - self.sidepanel_width) / self.cur_node.dx,
        ky = self.height / self.cur_node.dy;
    self.xScale.domain([self.cur_node.x, self.cur_node.x + self.cur_node.dx])
        .range([0, self.width - self.sidepanel_width]);
    self.yScale.domain([self.cur_node.y, self.cur_node.y + self.cur_node.dy])
        .range([0, self.height]);

    var cell = self.svg.selectAll('g.cell')
        .data(self.nodes);
    if (transition) cell = cell.transition();

    cell.attr('transform', function (d) { return 'translate(' + self.xScale(d.x) + ',' + self.yScale(d.y) + ')'; });

    var rects = self.svg.selectAll('g.cell').selectAll('rect');
    if (transition) rects = rects.transition();

    rects
        .attr('width', function (d) { return kx * d.dx; })
        .attr('height', function (d) { return ky * d.dy; });

    cell.select('rect')
        .filter(function (d) { return (d.parent == self.cur_node);})
        .each(function (d, i) {
            var clippaths = self.svg_labels
                .select('#node_clip' + i)
                .select('rect');
            if (transition) clippaths = clippaths.transition();

            clippaths
                .attr('x', self.xScale(d.x) + 4)
                .attr('y', self.yScale(d.y) + 4)
                .attr('width', kx * d.dx - 8)
                .attr('height', ky * d.dy - 8);

            var labels = self.svg_labels
                .select('#node' + i);
            if (transition) labels = labels.transition();

            labels
                .attr('x', self.xScale(d.x))
                .attr('y', self.yScale(d.y));
        });
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

    // and here are falling through levels consisting of one child element
    while (d.depth < self.max_depth - 1) {
        if (d.children.length == 1) {
            d = d.children[0];
        }
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
    self.hideSidePanel()
    self.go(d);
};

TreeMap.prototype.showSidePanel = function(node) {

    var self = this;

    self.sidepanel
        .css({display: 'block'})
        .animate({opacity: 1});

    self.sidepanel_width = 200;

    self.sidepanel.find('div').remove();

    $('<div>').addClass('leftcolumn')
        .addClass('title')
        .text(self.typeLabel(node.type) + ':')
        .appendTo(self.sidepanel);
    $('<div>').addClass('rightcolumn')
        .addClass('title')
        .text(self.nameLabel(node.type, node.name))
        .appendTo(self.sidepanel);
    $('<div>').addClass('clear')
        .appendTo(self.sidepanel);

    $('<div>').addClass('splitter')
        .appendTo(self.sidepanel);

    $('<div>').addClass('leftcolumn')
        .text('капл:')
        .appendTo(self.sidepanel);
    $('<div>').addClass('rightcolumn')
        .text(node.couple || 'не в капле')
        .appendTo(self.sidepanel);
    $('<div>').addClass('clear')
        .appendTo(self.sidepanel);

    if (node.couple) {
        $('<div>').addClass('leftcolumn')
            .text('статус капла:')
            .appendTo(self.sidepanel);
        $('<div>').addClass('rightcolumn')
            .text(node.couple_status)
            .appendTo(self.sidepanel);
        $('<div>').addClass('clear')
            .appendTo(self.sidepanel);

    }

    $('<div>').addClass('leftcolumn')
        .text('всего:')
        .appendTo(self.sidepanel);
    $('<div>').addClass('rightcolumn')
        .text(prefixBytes(node.total_space))
        .appendTo(self.sidepanel);
    $('<div>').addClass('clear')
        .appendTo(self.sidepanel);

    $('<div>').addClass('leftcolumn')
        .text('свободно:')
        .appendTo(self.sidepanel);
    $('<div>').addClass('rightcolumn')
        .text(prefixBytes(node.free_space))
        .appendTo(self.sidepanel);
    $('<div>').addClass('clear')
        .appendTo(self.sidepanel);

    self.resizeTreeMap(true);
};

TreeMap.prototype.hideSidePanel = function(node) {

    var self = this;

    self.sidepanel
        .animate({opacity: 0}, 300, function () {
            self.sidepanel.css({display: 'none'});
        });

    self.sidepanel_width = 0;

    self.resizeTreeMap(true);
};


TreeMap.prototype.zoom_by_name = function (name) {
    var self = this;
    if (name == '') {
        // default empty name is root
        self.zoom(self.nodes[0]);
        return;
    }
    self.nodes.forEach(function (d) {
        if (d.name == name) self.zoom(d);
    });
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

    var kx = (self.width - self.sidepanel_width) / node.dx,
        ky = self.height / node.dy;
    self.xScale.domain([node.x, node.x + node.dx]);
    self.yScale.domain([node.y, node.y + node.dy]);

    var t = self.svg.selectAll('g.cell').transition()
        .attr('transform', function(d) { return "translate(" + self.xScale(d.x) + "," + self.yScale(d.y) + ")"; });

    t.select('rect')
        .attr('width', function(d) { return kx * d.dx; })
        .attr('height', function(d) { return ky * d.dy; })
        .attr('fill', function(d) {
            if (d.depth == self.max_depth) {
                return self.colors[self.type](d[self.type]);
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
                    .attr('width', kx * d.dx - 8)
                    .attr('height', ky * d.dy - 8);

            self.svg_labels
                .append('text')
                .attr('class', 'node-label')
                .attr('id', 'node' + i)
                .attr('clip-path', 'url(#node_clip' + i + ')')
                .attr('x', self.xScale(d.x))
                .attr('y', self.yScale(d.y))
                .attr('dy', 15)
                .attr('dx', 15)
                .style('fill', '#333')
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
        crumbs.push([self.typeLabel(node.type), self.nameLabel(node.type, node.name)]);
        node = node.parent;
    }

    if (node.type != 'root') {
        crumbs.push([self.typeLabel(node.type), self.nameLabel(node.type, node.name)]);
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


TreeMap.prototype.renderCrumbs = function(additional) {

    var self = this;

    var parts = [];
    self.crumbs.forEach(function (p) {
        parts.push(p.join(': '))
    });


    self.svg_topline_text
        .text(parts.join(' > '));

    if (additional != undefined) {
        var prefix = '';
        if (parts.length > 0) {
            prefix = ' > ';
        }
        self.svg_topline_text_additional
            .attr('x', self.svg_topline_text.attr('x') + self.svg_topline_text.node().getComputedTextLength())
            .text(prefix + additional.join(': '));
    } else {
        self.svg_topline_text_additional.text('');
    }

    var text_length = self.svg_topline_text.node().getComputedTextLength() +
                      self.svg_topline_text_additional.node().getComputedTextLength() + 5,
        available_length = parseInt(self.container.style('width')) - self.topline_margin.left -
                           self.topline_margin.right - self.search.outerWidth(),
        offset = available_length - text_length;

    var text_offset = d3.min([offset, 0]);

    self.svg_topline.select('.clippath').select('rect')
        .transition()
        .attr('width', parseInt(self.container.style('width')) - self.topline_margin.left - self.topline_margin.right);
    self.svg_topline.select('.topline-bg')
        .transition()
        .attr('width', parseInt(self.container.style('width')) - self.margin.left - self.margin.right);
    self.svg_topline_text
        .transition()
        .attr('dx', text_offset);
    self.svg_topline_text_additional
        .transition()
        .attr('dx', text_offset + 5);
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

            self.renderCrumbs([self.typeLabel(node.type), self.nameLabel(node.type, node.name)]);
        });
};

TreeMap.prototype.handleMouseLeave = function(selection) {
    var self = this;

    selection
        .on('mouseleave', function (d) {
            self.svg.selectAll('g.selection').remove();
            // self.renderCrumbs();
        });
};

