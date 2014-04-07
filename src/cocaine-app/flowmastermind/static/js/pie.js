// function MemoryPie(container) {
//     var self = this;
//     self.constructor.super.call(self, container);
// }

function EffectiveMemoryPie(container, chartLabel, renderLabels) {
    var self = this;
    self.width = 150;
    self.constructor.super.call(self, container, chartLabel, renderLabels);
}

function TotalMemoryPie(container, chartLabel, renderLabels) {
    var self = this;
    self.width = 150;
    self.constructor.super.call(self, container, chartLabel, renderLabels);
}

function GroupsPie(container, chartLabel, renderLabels) {
    var self = this;
    self.width = 275;
    self.constructor.super.call(self, container, chartLabel, renderLabels);
}

function Pie(container, chartLabel, renderLabels) {
    var self = this;

    self.height = 150;

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
            .attr('fill-opacity', 1)
            .attr('x', self.height / 2)
            .text(chartLabel);

    if (renderLabels) {
        self.addLegend();
    }

    self.tooltip = new Tooltip();
    self.tooltip.appendTo(container);

    self.gpie = self.svg
        .append('g')
        .attr('transform', 'translate(' + (self.height / 2) + ',' + (self.height / 2) + ')');

    self.pie = d3.layout.pie()
        .value(function (d) { return d.value; })
        .sort(null);

    self.arc = d3.svg.arc()
        .innerRadius(0)
        .outerRadius(Math.round(self.height / 2));
    self.labelArc = d3.svg.arc()
        .innerRadius(0)
        .outerRadius(Math.round(self.height / 2) + 15);
}


function extend(Child, Parent) {
    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
    Child.super = Parent;
}

// extend(MemoryPie, Pie);
extend(EffectiveMemoryPie, Pie);
extend(TotalMemoryPie, Pie);
extend(GroupsPie, Pie);


EffectiveMemoryPie.prototype.margin = {top: 50, right: 10, left: 50, bottom: 40};

EffectiveMemoryPie.prototype.labels = {
    free_space: 'свободно',
    occupied_space: 'занято',
};

EffectiveMemoryPie.prototype.color = d3.scale.ordinal()
    .domain(['free_space', 'occupied_space'])
    .range(['rgb(78,201,106)', 'rgb(200,200,200)']);

EffectiveMemoryPie.prototype.prepareData = function(rawdata) {
    var data = [];

    data.push({value: rawdata['effective_free_space'],
               type: 'free_space'});
    data.push({value: rawdata['total_space'] - rawdata['free_space'],
               type: 'occupied_space'});

    return {data: data};
};

EffectiveMemoryPie.prototype.pieLabelFormatter = prefixBytesRound;
EffectiveMemoryPie.prototype.tooltipFormatter = prefixBytes;
EffectiveMemoryPie.prototype.legendLabelOffset = 10;


TotalMemoryPie.prototype.margin = {top: 50, right: 10, left: 50, bottom: 40};

TotalMemoryPie.prototype.labels = {
    free_space: 'свободно',
    occupied_space: 'занято',
    uncoupled_space: 'не используется'
};

TotalMemoryPie.prototype.color = d3.scale.ordinal()
    .domain(['free_space', 'occupied_space', 'uncoupled_space'])
    .range(['rgb(78,201,106)', 'rgb(200,200,200)', 'rgb(246,244,158)']);

TotalMemoryPie.prototype.prepareData = function(rawdata) {
    var data = [];

    data.push({value: rawdata['free_space'],
               type: 'free_space'});
    data.push({value: rawdata['total_space'] - rawdata['free_space'],
               type: 'occupied_space'});
    data.push({value: rawdata['uncoupled_space'],
               type: 'uncoupled_space'})

    return {data: data};
};

TotalMemoryPie.prototype.pieLabelFormatter = prefixBytesRound;
TotalMemoryPie.prototype.tooltipFormatter = prefixBytes;



GroupsPie.prototype.margin = {top: 50, right: 10, left: 50, bottom: 40};

GroupsPie.prototype.color = d3.scale.ordinal()
    .domain(['bad_couples', 'closed_couples', 'frozen_couples',
             'open_couples'])
    .range(['rgb(240,72,72)', 'rgb(200,200,200)', 'rgb(150,197,255)',
            'rgb(78,201,106)']);

GroupsPie.prototype.labels = {
    bad_couples: 'недоступно для записи',
    closed_couples: 'заполнено',
    frozen_couples: 'заморожено',
    open_couples: 'открыто',
};

GroupsPie.prototype.prepareData = function(rawdata) {
    var data = [];

    data.push({value: rawdata['open_couples'],
               type: 'open_couples'});
    data.push({value: rawdata['frozen_couples'],
               type: 'frozen_couples'});
    data.push({value: rawdata['closed_couples'],
               type: 'closed_couples'});
    data.push({value: rawdata['bad_couples'],
               type: 'bad_couples'});

    return {data: data};
}


Pie.prototype.update = function (rawdata) {

    var self = this;

    var data = self.prepareData(rawdata);

    self.updateSlices(data.data);
};

Pie.prototype.pieLabelFormatter = function (d) { return d; };
Pie.prototype.tooltipFormatter = function (d) { return d; };
Pie.prototype.legendLabelOffset = 5;

Pie.prototype.updateSlices = function (data) {

    var self = this,
        piedata = self.pie(data);

    arcs = self.gpie.selectAll('g.arc')
        .data(piedata)
        .enter()
            .append('g')
            .attr('class', 'arc')
            .style('fill', function (d, i) { return self.color(d.data.type); })
            .style('fill-opacity', 0.6);
    arcs
        .append('path')
        .attr('d', function () { return self.arc({startAngle: 0, endAngle: 0}); })
        .each(function() { this._current = {startAngle: 0, endAngle: 0}; });
    arcs
        .append('text')
        .attr('class', 'pielabel')
        .attr('fill', 'rgb(120,120,120)')
        .attr('transform', function () { return 'translate(' + self.arc.centroid({startAngle: 0, endAngle: 0}) + ')'; })
        .each(function(d, i) { this._current = {startAngle: 0, endAngle: 0}; });


    arcs.on('mouseenter', function () {

        var data = this.__data__,
            testbarpart = d3.select(this)[0][0];

        self.gpie.selectAll('g.arc').transition()
            .duration(200)
            .style('fill-opacity', function (d) { return (this != testbarpart) ? 0.4 : 0.8 });

        self.tooltip.show(self.margin.top - 10,
                          self.margin.left + (self.height / 2));

        self.tooltip.setSpaceLabel(self.labels[data.data.type] + ': ');
        self.tooltip.setSpaceValue(self.tooltipFormatter(data.data.value));
    }).on('mouseleave', function () {

        self.gpie.selectAll('g.arc').transition()
            .duration(200)
            .style('fill-opacity', 0.6);

        self.tooltip.hide();
    });

    self.gpie.selectAll('g.arc path')
        .data(piedata)
        .transition()
        .duration(750)
        .attrTween('d', self.arcTween(self));

    self.gpie.selectAll('g.arc text')
        .data(piedata)
        .transition()
        .duration(750)
        .text(function (d) { return (d.endAngle - d.startAngle > Math.PI/4) ? self.pieLabelFormatter(d.data.value) : ''; })
        .attrTween('transform', self.arcLabelTween(self));
};

Pie.prototype.addLegend = function () {

    var self = this;

    self.legend = self.svg_container
        .append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + self.margin.left + ',0)');

    var labels = self.color.domain().slice(),
        colors = self.color.range().slice();

    var labelLength = 90;
    var flatcl = d3.zip(colors, labels).reverse();
    var levelcl = [flatcl.slice(0, 2), flatcl.slice(2)];

    levelcl.forEach(function (cl, j) {
        cl.forEach(function (cl, i) {
            self.legend
                .append('rect')
                .attr('class', 'legend-colorsample')
                .attr('height', 10)
                .attr('width', 10)
                .attr('transform', 'translate(' + (i * labelLength) + ',' + (self.legendLabelOffset + (j * 15)) + ')')
                .style('fill', cl[0]);

            self.legend
                .append('text')
                .attr('class', 'legend-label')
                .attr('transform', 'translate(' + (i * labelLength + 15) + ',' + (self.legendLabelOffset + (j * 15)) + ')')
                .attr('y', 4)
                .text('— ' + self.labels[cl[1]]);
        });
    });

    if (self.width - self.legend[0][0].getBBox().width > 0) {
        self.legend
            .attr('transform', 'translate(' + (self.width - self.legend[0][0].getBBox().width) + ',0)');
    }
};

Pie.prototype.arcTween = function (self) {
    return function (a) {
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function(t) {
            return self.arc(i(t));
        };
    }
}

Pie.prototype.arcLabelTween = function (self) {
    return function (a) {
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function(t) {
            var curd = i(t),
                cangle = curd.startAngle + (curd.endAngle - curd.startAngle) / 2,
                textangle = (cangle < Math.PI) ?
                    cangle - Math.PI/2 :
                    cangle - 3 * Math.PI/2;
            return 'translate(' + self.labelArc.centroid(curd) + ')' +
                   'rotate(' + Math.round(textangle / Math.PI * 180) + ')';
        };
    }
}