var group_info;


function showGroupInfo(group_id) {
    hideGroupInfo();
    var container = '.inner-content';
    new GroupInfo(group_id, container);
}

function hideGroupInfo() {
    $('div.group-info-container').remove();
}

function GroupInfo(group_id, container) {
    var self = this;

    self.group_id = group_id;
    self.container = d3.select(container);

    self.group_info_container = $('<div>')
        .addClass('group-info-container')
        .appendTo($(container));

    var block_layer = $('<div>')
        .addClass('block-layer')
        .appendTo(self.group_info_container);;

    self.layer = $('<div>')
        .addClass('group-info')
        .appendTo(block_layer);

    var closeBtn = $('<div>').addClass('close')
        .on('click', function () { PseudoURL.setParam('info', null).load(); })
        .text('X')
        .appendTo(self.layer);

    self.labels = labels || {"types": {}};

    self.margin = {top: 40, right: 10, bottom: 20, left: 10};

    self.d3layer = d3.select('div.group-info');

    self.updateSize();

    self.loadData();
}

GroupInfo.prototype.loadData = function () {
    var self = this,
        spinner = new Spinner('div.group-info'),
        max_tries = 3, tries = 0;

    spinner.start();

    (function loadGroupInfo() {
        $.ajax({
            url: '/json/group/' + self.group_id + '/',
            method: 'get',
            dataType: 'json',
            success: function (data) {
                spinner.stop();
                setTimeout(function() {
                    self.renderCoupleGraph(data);
                    data.groups.forEach(function (group) {
                        if (group.id == self.group_id) {
                            self.renderEntityData(group);
                        }
                    });
                }, 500);
            },
            error: function () {
                tries += 1;
                if (tries >= max_tries) {
                    spinner.stop();
                    // failTreemapLoad(layer);
                    return;
                }
                setTimeout(loadGroupInfo, 2000);
            }
        });
    })();
};


GroupInfo.prototype.updateSize = function() {
    var self = this;

    self.width = parseInt(self.container.style('width')) - self.margin.left - self.margin.right;
    self.height = parseInt(self.container.style('height')) - self.margin.top - self.margin.bottom;
}


GroupInfo.prototype.renderCoupleGraph = function (data) {

    var self = this;

    self.svg = self.d3layer
        .append('svg');

    self.couple_graph_width = 150;

    var R = self.couple_graph_width / 2,
        groups_scale = 0.8,
        is_coupled = data['stats'];

    self.svg_couple_graph = self.svg
        .append('g')
            .attr('transform', 'translate(' + (self.margin.left + self.couple_graph_width) + ', ' +
                  (self.margin.top + self.couple_graph_width * 3/4) + ')');

    if (is_coupled) {
        self.svg_couple_graph
            .append('path')
            .attr('class', 'couple-graph')
            .datum(data)
            .style('fill', status_color(data['couple_status']))
            .attr('d', d3.svg.arc().innerRadius(0).outerRadius(R)
                                   .startAngle(0).endAngle(240)())
            .on('mouseenter', function () { self.highlight.bind(self)(this)})
            .on('mouseleave', self.cancelHighlight.bind(self));
    }

    var groups_num = data.groups.length,
        offset_angle = 360 / groups_num,
        start_offset_angle = (groups_num % 2) ? 0 : offset_angle / 2,
        r_max = (groups_num > 1) ? R * Math.sin((offset_angle / 2) / 180 * Math.PI) * groups_scale : R * groups_scale,
        max_used_space = d3.max(data.groups, function (d) { return d['stats']['used_space']; });


    data.groups.forEach(function (group, i) {
        if (group.nodes.length == 1) {
            group['dc'] = group.nodes[0]['dc'];
            group['hostname'] = group.nodes[0]['hostname'];
            group['path'] = group.nodes[0]['path'];
        }
    });

    data.groups.forEach(function (group, i) {

        var r = r_max * Math.sqrt(group['stats']['used_space'] / max_used_space),
            angle = start_offset_angle + offset_angle * i;

        self.svg_couple_graph
            .append('path')
            .attr('class', 'group-info')
            .datum(group)
            .attr('transform', function (d) {
                if (!is_coupled) return null;
                return 'translate(' + (R * Math.sin(angle / 360 * 2 * Math.PI)) + ', '
                                    + (-R * Math.cos(angle / 360 * 2 * Math.PI)) + ')';
            })
            .attr('d', d3.svg.arc().innerRadius(0).outerRadius(r - 10)
                                  .startAngle(0).endAngle(2 * Math.PI)())
            .style('fill', status_color(group.status))
            .on('mouseenter', function () { self.highlight.bind(self)(this)})
            .on('mouseleave', self.cancelHighlight.bind(self))
            .on('click', function () {
                if (group.nodes.length == 1) {
                    var node = group.nodes[0];
                    self.treemapZoom.bind(self)(node, group);
                }
            });

        var node_start_angle = 0;
        group.nodes.forEach(function (node, j) {
            var node_angle = node['stats']['used_space'] / group['stats']['used_space'] * (2 * Math.PI),
                fragm_angle = node_angle * node['stats']['fragmentation'];

            self.svg_couple_graph
                .append('path')
                .attr('class', 'node-info')
                .datum(node)
                .attr('transform', function (d) {
                    if (!is_coupled) return null;
                    return 'translate(' + (R * Math.sin(angle / 360 * 2 * Math.PI)) + ', '
                                        + (-R * Math.cos(angle / 360 * 2 * Math.PI)) + ')';
                })
                .attr('d', d3.svg.arc().innerRadius(r - 10).outerRadius(r)
                                      .startAngle(node_start_angle).endAngle(node_start_angle + node_angle)())
                .style('fill', status_color(node['status']))
                .on('mouseenter', function () { self.highlight.bind(self)(this); })
                .on('mouseleave', self.cancelHighlight.bind(self))
                .on('click', function () { self.treemapZoom.bind(self)(node, group); });

            // fragmentation
            self.svg_couple_graph
                .append('path')
                .datum(node)
                .attr('transform', function (d) {
                    if (!is_coupled) return null;
                    return 'translate(' + (R * Math.sin(angle / 360 * 2 * Math.PI)) + ', '
                                        + (-R * Math.cos(angle / 360 * 2 * Math.PI)) + ')';
                })
                .attr('d', d3.svg.arc().innerRadius(r - 4).outerRadius(r)
                                      .startAngle(node_start_angle).endAngle(node_start_angle + fragm_angle)())
                .style('fill', 'rgb(121,146,155)')
                .on('mouseenter', function () { self.highlight.bind(self)(this); })
                .on('mouseleave', self.cancelHighlight.bind(self))
                .on('click', function () { self.treemapZoom.bind(self)(node, group); });

            node_start_angle += node_angle;
        });

    });
};


GroupInfo.prototype.highlight = function (obj) {
    var self = this;

    self.d3layer.selectAll('path')
        .transition()
        .duration(200)
        .style('fill-opacity', function (d) { return (this != obj) ? 0.5 : 0.9; });

    self.renderEntityData(obj.__data__)
};

GroupInfo.prototype.cancelHighlight = function () {
    var self = this;

    self.d3layer.selectAll('path')
        .transition()
        .duration(200)
        .style('fill-opacity', 0.75);
};


GroupInfo.prototype.treemapZoom = function (node, group) {
    var node_name = group.id,
        host_name = node.hostname,
        host,
        node;

    treemap.map.nodes.forEach(function (d) {
        if (d.name == host_name) {
            host = d;
        }
    });

    host.children.forEach(function (d) {
        if (d.name == node_name) {
            node = d;
        }
    });

    if (node != undefined) {
        PseudoURL.setParam('info', null);
        treemap.map.go(host, node);
    }
}

GroupInfo.prototype.renderEntityData = function (data) {
    var self = this,
        node_type;

    self.layer
        .find('.entity-data').remove();

    var data_block = $('<div>')
        .addClass('entity-data')
        .appendTo(self.layer);

    if (data['groups'] != undefined) {
        // this is couple
        node_type = 'couple';
        node_type_label = 'Капл';
    } else if (data['nodes'] != undefined) {
        node_type = 'group';
        node_type_label = 'Группа';
    } else {
        node_type = 'node';
        node_type_label = 'Нода';
    }

    $('<div>')
        .addClass('leftcolumn')
        .addClass('title')
        .appendTo(data_block)
        .text(node_type_label + ':');
    $('<div>')
        .addClass('rightcolumn')
        .addClass('title')
        .appendTo(data_block)
        .text(data['id'] || data['addr']);

    $('<div>').addClass('clear').appendTo(data_block);

    $('<div>')
        .addClass('splitter')
        .appendTo(data_block);

    function renderField(label, value) {
        $('<div>')
            .addClass('leftcolumn')
            .appendTo(data_block)
            .text(label + ':');
        $('<div>')
            .addClass('rightcolumn')
            .appendTo(data_block)
            .text(value);
    }

    renderField('Статус', entity_status(node_type, data['status']));
    if (data['namespace']) {
        renderField('Неймспейс', data['namespace']);
    }
    if (data['dc']) {
        renderField('Датацентр', self.labels['types']['dc'] && self.labels['types']['dc'][data['dc']] || data['dc']);
        renderField('Хост', data['hostname']);
        renderField('Путь', data['path']);
    }
    renderField('Всего', prefixBytes(data['stats']['total_space']));
    renderField('Свободно', prefixBytes(data['stats']['free_space']));
    renderField('Занято', prefixBytes(data['stats']['used_space']));

    if (data['stats']['fragmentation'] != undefined) {
        renderField('Фрагментация', (data['stats']['fragmentation'] * 100).toFixed(2) + '%');
    }
};

function entity_status(type, status) {
    var labels = STATUS_LABELS[type + '_labels'];

    if (labels == undefined)
        return '';

    return labels[status];
}
