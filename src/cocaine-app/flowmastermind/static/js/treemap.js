function showDcTreeMap() {
    var container = $('.inner-content'),
        layer = $('<div>');

    layer.addClass('treemap');

    layer.appendTo(container);

    var spinner = new Spinner('div.treemap');
    spinner.start();

    $.ajax({
        url: '/json/treemap/',
        method: 'get',
        dataType: 'json',
        success: function (data) {

            var labels = {"types": {}};

            $.ajax({
                url: '/external/labels.json',
                method: 'get',
                dataType: 'json',
                success: function (data) {
                    labels = data;
                    buildTreeMap();
                },
                error: function (data) {
                    buildTreeMap();
                }
            });

            function buildTreeMap() {
                spinner.stop();
                treemap = new TreeMap('div.treemap', data, labels);
            }

        },
        error: function () {

        }
    });
}



function Spinner(container) {
    var self = this,
        container = d3.select(container),
        thickness = 7,
        endAngle = Math.PI * 3 / 2;
    self.svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

    self.width = 30;
    self.height = 30;

    self.spinner = self.svg.append('g')
        .attr('transform', 'translate(' + (self.width / 2 + 10) + ',' +
                                          (self.height / 2 + 10) + ') rotate(0)');

    var path = self.spinner
            .append('path')
            .attr('class', 'spinner')
            .attr('fill-opacity', 1),
        arc = d3.svg.arc()
            .outerRadius(self.height / 2)
            .innerRadius(self.height / 2 - thickness)
            .startAngle(0)
            .endAngle(endAngle);

    path.attr('d', arc());

}

Spinner.prototype.start = function () {
    var self = this;
    self.run = true;

    function rotate() {
        self.spinner
            .transition()
            .duration(2000)
            .ease('linear')
            .attrTween('transform', rotateTween)
            .each('end', rotate);
    }

    function rotateTween() {
        return function(t) {
            return 'translate(' + (self.width / 2 + 10) + ',' + (self.height / 2 + 10) + ') rotate(' + Math.round(t * 360) +')';
        }
    }
    rotate();
}

Spinner.prototype.stop = function () {
    var self = this;

    self.spinner.select('path')
        .transition(500)
        .attr('fill-opacity', 0)
        .each('end', function () {
            self.spinner
                .transition()
                .duration(0);
            self.spinner.remove();
            self.svg.remove();
        });
}




function TreeMap(container, data, labels) {

    var self = this;

    self.data = data;
    self.labels = labels;
    self.container = d3.select(container);

    self.margin = {top: 40, right: 10, bottom: 10, left: 10};
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

    self.svg = self.svg_container.append('g')
            .attr('transform', 'translate(' + self.margin.left + ',' + self.margin.top + ')');

    self.svg_labels = self.svg_container.append('g')
            .attr('transform', 'translate(' + self.margin.left + ',' + self.margin.top + ')');

    self.container.append('div')
        .attr('class', 'sidepanel');
    self.sidepanel = $('div.sidepanel');

    self.createTopline();

    d3.select(window).on('resize', self.resize.bind(self));
    d3.select('body').on('keyup', self.close.bind(self));

    self.type = 'free_space';


    self.nodes = self.treemap.nodes(self.data);
    self.cur_depth = 0;
    self.cur_node = self.nodes[0];
    self.click_timer = null;
    self.max_depth = d3.max(self.nodes, function (d) { return d.depth; });

    self.colors = {
        free_space: d3.scale.linear()
                        .domain([0, d3.max(self.nodes, function (d) { return d.total_space; })])
                        .range([d3.rgb('#ff0000'), d3.rgb('#ffeeee')]),
        free_space_label: [d3.rgb('#ff8888'), '#ffeeee', '#ff3333'],
        couple_status: d3.scale.ordinal()
                           .domain([null, 'OK', 'FROZEN', 'BAD', 'CLOSED'])
                           .range([d3.rgb('#f2ee60'), d3.rgb('#4ec96a'), d3.rgb('#96c5ff'),
                                   d3.rgb('#f04848'), d3.rgb('#787878')])
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
            if (d.depth == self.max_depth) return 0.7;
            return 0;
        });

    self.resize();
    self.createSwitcher();
}

TreeMap.prototype.close = function () {
    var self = this;
    if (d3.event.keyCode == 27) {
        self.container.remove();
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

    var switcher = $('div.switcher');

    switcher.find('input[name=type]').on('click', function() {

        switch (this.value) {
            case 'free_space':
                self.type = this.value;
                // self.treemap
                //     .value(function(d) { return d.total_space; });
                break;
            case 'couple_status':
                self.type = this.value;
                // self.treemap
                //     .value(function(d) { return d.status; });
                break;
        }


        switcher.find('label').removeClass('selected');
        switcher.find('label[for=' + $(this).attr('id') + ']').addClass('selected');

        self.zoom(self.cur_node);
    });

    switcher.find('input[name=type][value=' + default_val + ']').click();
};


TreeMap.prototype.updateSize = function() {
    var self = this;

    self.width = parseInt(self.container.style('width')) - self.margin.left - self.margin.right;
    self.height = parseInt(self.container.style('height')) - self.margin.top - self.margin.bottom;
}


TreeMap.prototype.resize = function () {
    var self = this;

    self.updateSize();

    self.svg_container
        .attr('width', self.width + self.margin.left + self.margin.right)
        .attr('height', self.height + self.margin.top + self.margin.bottom);

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
        self.showSidePanel(node);
        return;
    }

    if (self.cur_depth + 1 != newdepth) {
        return;
    }
    var d = node;
    while (d.depth > newdepth) {
        d = d.parent;
    }
    self.zoom(d);
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
    self.zoom(d);
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
                // return self.colors[self.type](self.treemap.value()(d));
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
}

TreeMap.prototype.nameLabel = function(type, name) {
    var self = this;
    return self.labels[type] && self.labels[type][name] || name;
}


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
        available_length = parseInt(self.container.style('width')) - self.topline_margin.left - self.topline_margin.right,
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
}


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
}

TreeMap.prototype.handleMouseLeave = function(selection) {
    var self = this;

    selection
        .on('mouseleave', function (d) {
            self.svg.selectAll('g.selection').remove();
            // self.renderCrumbs();
        });
}

