function MemoryBar(container, chartLabel, chartLabelSmall) {

    var self = this;
    self.constructor.super.call(self, container, chartLabel, chartLabelSmall);

    self.yAxis.tickFormat(prefixBytesRound);
}


function TotalMemoryBar(container, chartLabel, chartLabelSmall) {

    var self = this;
    self.constructor.super.call(self, container, chartLabel, chartLabelSmall);

    self.yAxis.tickFormat(prefixBytesRound);
}


function GroupsBar(container, chartLabel, chartLabelSmall) {

    var self = this;
    self.constructor.super.call(self, container, chartLabel, chartLabelSmall);
}

function KeysBar(container, chartLabel, chartLabelSmall) {

    var self = this;
    self.constructor.super.call(self, container, chartLabel, chartLabelSmall);

    self.max_value = 0;

    self.yAxis.tickFormat(function (val) {
        return prefixNumRound(val, self.max_value);
    });
}

function OutagesBar(container, chartLabel, chartLabelSmall) {

    var self = this;
    self.constructor.super.call(self, container, chartLabel, chartLabelSmall);
}


function Bar(container, chartLabel, chartLabelSmall) {

    var self = this;

    self.barCoef = 50;
    self.width = 100;
    self.height = 200;

    var barClickHandler = null;

    self.svg_container = d3.select(container).insert('svg', ':first-child');
    self.svg = self.svg_container
            .attr('width', self.width + self.margin.left + self.margin.right)
            .attr('height', self.height + self.margin.bottom + self.margin.top)
        .append('g')
            .attr('transform', 'translate(' + self.margin.left + ',' + self.margin.top + ')');

    self.chart_label = self.svg_container
        .append('g')
            .attr('class', 'chart-label')
            .attr('transform', 'translate(' + self.margin.left + ',' + (self.margin.top + self.height + 30) + ')')
        .append('text')
            .attr('fill-opacity', 0)
            .attr('x', 0)
            .text(chartLabel);

    self.chart_label_small = undefined;
    if (chartLabelSmall) {
        self.chart_label_small = self.svg_container
            .append('g')
                .attr('class', 'chart-label-small')
                .attr('transform', 'translate(' + self.margin.left + ',' + (self.margin.top + self.height + 50) + ')')
            .append('text')
                .attr('fill-opacity', 0)
                .attr('x', 0)
                .text(chartLabelSmall);
    }

    self.addLegend();

    self.tooltip = new Tooltip(true);
    self.tooltip.appendTo(container);

    self.yScale = d3.scale.linear()
        .domain([0, 100 * 1024 * 1024 * 1024])
        .range([self.height, 0]);

    self.xScale = d3.scale.ordinal()
        .rangeRoundBands([0, self.width], .08);

    self.xAxis = d3.svg.axis()
        .scale(self.xScale)
        .orient('bottom')
        .tickFormat(function (d) { return (d.length > 10) ? d.slice(0, 8) + '...' : d; });

    self.yAxis = d3.svg.axis()
        .scale(self.yScale)
        .ticks(8)
        .tickSize(-self.width)
        .orient('left');

    self.xAxisContainer = self.svg
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + self.height + ')')
        .call(self.xAxis);

    self.yAxisContainer = self.svg
        .append('g')
        .attr('class', 'y axis')
        .call(self.yAxis);
}


function extend(Child, Parent) {
    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
    Child.super = Parent;
}

extend(TotalMemoryBar, Bar);
extend(MemoryBar, Bar);
extend(KeysBar, Bar);
extend(GroupsBar, Bar);
extend(OutagesBar, Bar);


MemoryBar.prototype.color = d3.scale.ordinal()
    .domain(['effective_occupied_space', 'effective_free_space', 'uncoupled_space'])
    .range(['rgb(200,200,200)', 'rgb(78,201,106)', 'rgb(242,238,96)']);

MemoryBar.prototype.labels = {
    effective_occupied_space: 'занято',
    effective_free_space: 'свободно',
    uncoupled_space: 'не используется'
};

MemoryBar.prototype.margin = {top: 50, right: 10, left: 50, bottom: 60};


MemoryBar.prototype.prepareData = function (rawdata) {
    rawdataEntries = d3.entries(rawdata).sort(function (a, b) { return (a.key < b.key) ? -1 : 1; });

    var data = [],
        keys = rawdataEntries.map(function (d) { return d.key; });

    rawdataEntries.forEach(function (d, i) {
        var el = [];
        el.push({x: d.key,
                 y: d.value['effective_space'] - d.value['effective_free_space'],
                 type: 'effective_occupied_space'});
        el.push({x: d.key,
                 y: d.value['effective_free_space'],
                 type: 'effective_free_space'});
        el.push({x: d.key,
                 y: d.value['uncoupled_space'],
                 type: 'uncoupled_space'});
        data.push(el);
    });

    data = d3.transpose(
        d3.layout.stack()(d3.transpose(data)));

    return {data: data,
            keys: keys};
}

MemoryBar.prototype.addLegend = function () {

    var self = this;

    self.legend = self.svg_container
        .append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + self.margin.left + ',0)');

    var labels = self.color.domain().slice(),
        colors = self.color.range().slice();

    var labelLength = 140;

    d3.zip(colors, labels).reverse().forEach(function (cl, i) {
        self.legend
            .append('rect')
            .attr('class', 'legend-colorsample')
            .attr('height', 10)
            .attr('width', 10)
            .attr('transform', 'translate(' + (i * labelLength) + ',15)')
            .style('fill', cl[0]);

        self.legend
            .append('text')
            .attr('class', 'legend-label')
            .attr('transform', 'translate(' + (i * labelLength + 15) + ',15)')
            .attr('y', 4)
            .text('— ' + self.labels[cl[1]]);
    });
};


MemoryBar.prototype.tooltipFormatter = prefixBytes;
MemoryBar.prototype.barLabelFormatter = prefixBytesRound;


TotalMemoryBar.prototype.color = d3.scale.ordinal()
    .domain(['occupied_space', 'free_space', 'uncoupled_space'])
    .range(['rgb(200,200,200)', 'rgb(78,201,106)', 'rgb(242,238,96)']);

TotalMemoryBar.prototype.labels = {
    occupied_space: 'занято',
    free_space: 'свободно',
    uncoupled_space: 'не используется'
};

TotalMemoryBar.prototype.margin = {top: 50, right: 10, left: 50, bottom: 60};


TotalMemoryBar.prototype.prepareData = function (rawdata) {
    rawdataEntries = d3.entries(rawdata).sort(function (a, b) { return (a.key < b.key) ? -1 : 1; });

    var data = [],
        keys = rawdataEntries.map(function (d) { return d.key; });

    rawdataEntries.forEach(function (d, i) {
        var el = [];
        el.push({x: d.key,
                 y: d.value['total_space'] - d.value['free_space'],
                 type: 'occupied_space'});
        el.push({x: d.key,
                 y: d.value['free_space'],
                 type: 'free_space'});
        el.push({x: d.key,
                 y: d.value['uncoupled_space'],
                 type: 'uncoupled_space'});
        data.push(el);
    });

    data = d3.transpose(
        d3.layout.stack()(d3.transpose(data)));

    return {data: data,
            keys: keys};
}

TotalMemoryBar.prototype.addLegend = MemoryBar.prototype.addLegend;


TotalMemoryBar.prototype.tooltipFormatter = prefixBytes;
TotalMemoryBar.prototype.barLabelFormatter = prefixBytesRound;


KeysBar.prototype.labels = {
    keys: 'живые ключи',
    removed_keys: 'удаленные ключи',
};

KeysBar.prototype.margin = {top: 50, right: 10, left: 70, bottom: 60};

KeysBar.prototype.color = d3.scale.ordinal()
    .domain(['keys', 'removed_keys'])
    .range(['rgb(232,207,179)', 'rgb(121,146,155)']);


KeysBar.prototype.prepareData = function (rawdata) {
    rawdataEntries = d3.entries(rawdata).sort(function (a, b) { return (a.key < b.key) ? -1 : 1; });

    var data = [],
        keys = rawdataEntries.map(function (d) { return d.key; });

    self.max_value = d3.max(rawdataEntries.map(function (d) { return d.value['total_keys']; }));

    rawdataEntries.forEach(function (d, i) {
        var el = [];
        el.push({x: d.key,
                 y: d.value['removed_keys'],
                 type: 'removed_keys'});
        el.push({x: d.key,
                 y: d.value['total_keys'] - d.value['removed_keys'],
                 type: 'keys'});
        data.push(el);
    });

    data = d3.transpose(
        d3.layout.stack()(d3.transpose(data)));

    return {data: data,
            keys: keys};
}

KeysBar.prototype.addLegend = function () {

    var self = this;

    self.legend = self.svg_container
        .append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + self.margin.left + ',0)');

    var labels = self.color.domain().slice(),
        colors = self.color.range().slice();

    var labelLength = 140;

    d3.zip(colors, labels).reverse().forEach(function (cl, i) {
        self.legend
            .append('rect')
            .attr('class', 'legend-colorsample')
            .attr('height', 10)
            .attr('width', 10)
            .attr('transform', 'translate(' + (i * labelLength) + ',15)')
            .style('fill', cl[0]);

        self.legend
            .append('text')
            .attr('class', 'legend-label')
            .attr('transform', 'translate(' + (i * labelLength + 15) + ',15)')
            .attr('y', 4)
            .text('— ' + self.labels[cl[1]]);
    });
};



KeysBar.prototype.tooltipFormatter = function (val) {
    return intGroupsDelimiter(val, ',');
};
KeysBar.prototype.barLabelFormatter = function (val) {
    return prefixNumRound(val, self.max_value);
};

GroupsBar.prototype.color = d3.scale.ordinal()
    .domain(['bad_couples', 'broken_couples', 'closed_couples', 'frozen_couples',
             'open_couples', 'uncoupled_groups'])
    .range(['rgb(240,72,72)', 'rgb(150,35,0)', 'rgb(200,200,200)', 'rgb(150,197,255)',
            'rgb(78,201,106)', 'rgb(242,238,96)']);

GroupsBar.prototype.labels = {
    bad_couples: 'недоступные для записи каплы',
    broken_couples: 'каплы с ошибкой конфигурации',
    closed_couples: 'заполненные каплы',
    frozen_couples: 'замороженные каплы',
    open_couples: 'открытые на запись каплы',
    uncoupled_groups: 'групп не в капле'
};

GroupsBar.prototype.margin = {top: 50, right: 10, left: 50, bottom: 60};

GroupsBar.prototype.addLegend = function () {

    var self = this;

    self.legend = self.svg_container
        .append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + self.margin.left + ',0)');

    var labels = self.color.domain().slice(),
        colors = self.color.range().slice();

    var labelLength = 185;
    var flatcl = d3.zip(colors, labels).reverse();
    var levelcl = [flatcl.slice(0, 3), flatcl.slice(3)];

    levelcl.forEach(function (cl, j) {
        cl.forEach(function (cl, i) {
            self.legend
                .append('rect')
                .attr('class', 'legend-colorsample')
                .attr('height', 10)
                .attr('width', 10)
                .attr('transform', 'translate(' + (i * labelLength) + ',' + (5 + (j * 15)) + ')')
                .style('fill', cl[0]);

            self.legend
                .append('text')
                .attr('class', 'legend-label')
                .attr('transform', 'translate(' + (i * labelLength + 15) + ',' + (5 + (j * 15)) + ')')
                .attr('y', 4)
                .text('— ' + self.labels[cl[1]]);
        });
    });
};


GroupsBar.prototype.prepareData = function (rawdata) {
    rawdataEntries = d3.entries(rawdata).sort(function (a, b) { return (a.key < b.key) ? -1 : 1; });

    var data = [],
        keys = rawdataEntries.map(function (d) { return d.key; });

    rawdataEntries.forEach(function (d, i) {
        var el = [];
        el.push({x: d.key,
                 y: d.value['bad_couples'],
                 type: 'bad_couples'});
        el.push({x: d.key,
                 y: d.value['broken_couples'],
                 type: 'broken_couples'});
        el.push({x: d.key,
                 y: d.value['closed_couples'],
                 type: 'closed_couples'});
        el.push({x: d.key,
                 y: d.value['frozen_couples'],
                 type: 'frozen_couples'});
        el.push({x: d.key,
                 y: d.value['open_couples'],
                 type: 'open_couples'});
        el.push({x: d.key,
                 y: d.value['uncoupled_groups'],
                 type: 'uncoupled_groups'});
        data.push(el);
    });

    data = d3.transpose(
        d3.layout.stack()(d3.transpose(data)));

    return {data: data,
            keys: keys};
}

OutagesBar.prototype.color = d3.scale.ordinal()
    .domain(['bad_couples', 'broken_couples', 'closed_couples', 'frozen_couples',
             'open_couples'])
    .range(['rgb(240,72,72)', 'rgb(150,35,0)', 'rgb(200,200,200)', 'rgb(150,197,255)',
            'rgb(78,201,106)']);

OutagesBar.prototype.labels = {
    bad_couples: 'недоступно для записи',
    broken_couples: 'ошибка конфигурации',
    closed_couples: 'заполнены',
    frozen_couples: 'заморожено',
    open_couples: 'открыто на запись'
};

OutagesBar.prototype.margin = {top: 50, right: 10, left: 50, bottom: 60};

OutagesBar.prototype.addLegend = function () {

    var self = this;

    self.legend = self.svg_container
        .append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + self.margin.left + ',0)');

    var labels = self.color.domain().slice(),
        colors = self.color.range().slice();

    var labelLength = 170;
    var flatcl = d3.zip(colors, labels).reverse();
    var levelcl = [flatcl.slice(0, 3), flatcl.slice(3)];

    levelcl.forEach(function (cl, j) {
        cl.forEach(function (cl, i) {
            self.legend
                .append('rect')
                .attr('class', 'legend-colorsample')
                .attr('height', 10)
                .attr('width', 10)
                .attr('transform', 'translate(' + (i * labelLength) + ',' + (5 + (j * 15)) + ')')
                .style('fill', cl[0]);

            self.legend
                .append('text')
                .attr('class', 'legend-label')
                .attr('transform', 'translate(' + (i * labelLength + 15) + ',' + (5 + (j * 15)) + ')')
                .attr('y', 4)
                .text('— ' + self.labels[cl[1]]);
        });
    });
};


OutagesBar.prototype.prepareData = function (rawdata) {
    rawdataEntries = d3.entries(rawdata).sort(function (a, b) { return (a.key < b.key) ? -1 : 1; });

    var data = [],
        keys = rawdataEntries.map(function (d) { return d.key; });

    rawdataEntries.forEach(function (d, i) {
        var el = [];
        el.push({x: d.key,
                 y: d.value['outages']['bad_couples'],
                 type: 'bad_couples'});
        el.push({x: d.key,
                 y: d.value['outages']['broken_couples'],
                 type: 'broken_couples'});
        el.push({x: d.key,
                 y: d.value['outages']['closed_couples'],
                 type: 'closed_couples'});
        el.push({x: d.key,
                 y: d.value['outages']['frozen_couples'],
                 type: 'frozen_couples'});
        el.push({x: d.key,
                 y: d.value['outages']['open_couples'],
                 type: 'open_couples'});
        data.push(el);
    });

    data = d3.transpose(
        d3.layout.stack()(d3.transpose(data)));

    return {data: data,
            keys: keys};
}


Bar.prototype.tooltipFormatter = function (d) { return d; };
Bar.prototype.barLabelFormatter = function (d) { return d; };


Bar.prototype.update = function (rawdata) {

    var self = this;

    var data = self.prepareData(rawdata);

    self.updateSize(data.keys.length);
    self.updateAxes(data.data, data.keys);
    self.updateBars(data.data);
};


Bar.prototype.updateSize = function (bars_num) {

    var self = this;

    self.width = bars_num * self.barCoef;

    self.width = d3.max([self.width, self.legend[0][0].getBBox().width + self.margin.left]);

    self.svg_container
            .attr('width', self.width + self.margin.left + self.margin.right);

    self.legend
        .attr('transform', 'translate(' + (self.width - self.legend[0][0].getBBox().width) + ',0)');

    self.chart_label
        .transition()
        .duration(500)
        .attr('fill-opacity', 1)
        .attr('x', Math.round(self.width / 2));

    if (self.chart_label_small) {
        self.chart_label_small
            .transition()
            .duration(500)
            .attr('fill-opacity', 1)
            .attr('x', Math.round(self.width / 2));
    }
};

Bar.prototype.updateAxes = function (data, keys) {

    var self = this,
        yMax = d3.max(data.map(
            function (d) { return d3.max(d, function (e) {return e.y0 + e.y; }); }));

    self.yAxis.tickSize(-self.width);

    self.xScale.rangeRoundBands([0, keys.length * self.barCoef], .08);
    self.yScale.domain([0, yMax]);

    self.xScale.domain(keys);

    self.yAxisContainer
        .transition()
        .duration(500)
        .call(self.yAxis);

    self.xAxisContainer
        .transition()
        .duration(500)
        .call(self.xAxis);
};

Bar.prototype.updateBars = function (data) {

    var self = this;

    self.svg.selectAll('g.bar')
        .data(data)
        .enter()
            .append('g')
            .attr('class', 'bar')
            .attr('transform', function (d, i) { return 'translate(' + self.xScale(d[0].x) + ',0)'; });

    self.removeTooltipHandlers();

    var updated_bars = self.svg.selectAll('g.bar')
        .selectAll('g.barpart')
        .data(function (d) { return d; });

    var new_bars = updated_bars
        .enter()
            .append('g')
            .attr('class', 'barpart');

    new_bars
            .append('rect')
            .attr('y', self.yScale(0))
            .attr('width', self.xScale.rangeBand())
            .attr('height', 0)
            .attr('fill', function (d, i) { return self.color(d.type) });

    new_bars
            .append('text')
            .attr('class', 'barlabel')
            .attr('x', function (d) { return self.xScale.rangeBand() / 2; })
            .attr('y', self.yScale(0));

    if (self.barClickHandler) {
        new_bars.on('click', function () {
            self.mouseLeave();
            /* pass some parameters, should decide which ones are needed */
            return self.barClickHandler(this.__data__.x, this.__data__.y);
        })
    }


    self.svg.selectAll('g.bar').selectAll('rect')
        .data(function (d) { return d; })
        .attr('fill-opacity', 0.6)
        .transition()
        .duration(500)
        .attr('y', function (d) { return self.yScale(d.y0 + d.y); })
        .attr('height', function (d) { return self.yScale(d.y0) - self.yScale(d.y0 + d.y); })
        .endall(function () { self.addTooltipHandlers(); });


    self.svg.selectAll('g.bar').selectAll('text')
        .data(function (d) { return d; })
        .transition()
        .duration(500)
        .delay(function (d, i) { return i * 50; })
        .attr('y', function (d) { return self.yScale(d.y0 + d.y) + (self.yScale(d.y0) - self.yScale(d.y0 + d.y)) / 2; })
        .text(function (d) { return (self.yScale(d.y0) - self.yScale(d.y0 + d.y) >= 15 ) ? self.barLabelFormatter(d.y) : ''; });
};

Bar.prototype.addTooltipHandlers = function () {
    var self = this,
        bars = self.svg.selectAll('g.barpart'),
        rects = self.svg.selectAll('rect');

    bars.on('mouseenter', function () {

        var data = this.__data__,
            curleft = self.xScale(data.x),
            curtop = d3.select(this).select('rect').attr('y'),
            testbarpart = d3.select(this).select('rect')[0][0];

        rects.transition()
            .duration(200)
            .style('fill-opacity', function (d) { return (this != testbarpart) ? 0.4 : 0.8 });

        self.tooltip.show(+curtop + self.margin.top - 10,
                          curleft + self.margin.left + Math.round(self.xScale.rangeBand()/2));
        self.tooltip.setDC(data.x);

        self.tooltip.setSpaceLabel(self.labels[data.type] + ': ');
        self.tooltip.setSpaceValue(self.tooltipFormatter(data.y));
    });

    bars.on('mouseleave', function () {
        self.mouseLeave();
    });
};

Bar.prototype.mouseLeave = function () {
    var self = this,
        rects = self.svg.selectAll('rect');

    rects.transition()
        .duration(200)
        .style('fill-opacity', 0.6);

    self.tooltip.hide();
}

Bar.prototype.onBarClick = function (handler) {
    var self = this;
    self.barClickHandler = handler;
}

Bar.prototype.removeTooltipHandlers = function () {
    var self = this,
        rects = self.svg.selectAll('rect');

    rects.on('mouseenter', null);
    rects.on('mouseleave', null);
};
