
var options = {
    //String - Animation easing effect
    animation: false,
    animationEasing: "easeOutQuart",
    barStrokeWidth: 2,
    labelFontFamily: 'Verdana',
    showTooltips: false
};

var dc_names = {'ugr': 'Угрешка',
                'myt': 'Мытищи',
                'sas': 'Сасово',
                'fol': 'Фольга',
                'iva': 'Ивантеевка'}


function accBar(values, labels, colors) {
    function get_values() {
        var aggVal = 0.0,
            res = [];
        for (var idx in values) {
            aggVal += values[idx];
        }

        for (var idx = values.length - 1; idx >= 0; idx--) {
            res.push(aggVal);
            aggVal -= values[idx];
        }

        return res;
    }

    return {
        values: get_values,
        colors: function() { return colors.reverse(); },
        labels: function() { return labels.reverse(); },
        overlaps: function() {
            var result = [];
            for (var i = 0; i <= colors.length - 2; i++) {
                result.push(true);
            }
            result.push(false);
            return result;
        }
    };
}

function renderPieByData(data_filter) {
    return function(chart, data) {
        var render_data = [],
            display_data = data_filter(data);

        display_data[0].forEach(function (value, idx) {
            var label = display_data[1][idx],
                color = display_data[2][idx];
            render_data.push({
                value: value,
                label: label,
                color: color.color,
                labelAlign: color.labelAlign,
                labelColor: color.labelColor,
                labelFontSize: color.labelFontSize
            });
        });
        chart.Pie(render_data, options);
    };
}

renderTotalMemoryPie = renderPieByData(function (stat) {
    return [
        [stat['free_space'],
         stat['total_space'] - stat['free_space']],
        [prefixBytes(stat['free_space']),
         prefixBytes(stat['total_space'] - stat['free_space'])],
        [PieColors.Green, PieColors.Gray]
    ];
});

renderEffectiveMemoryPie = renderPieByData(function (stat) {
    return [
        [stat['effective_free_space'],
         stat['total_space'] - stat['free_space']],
        [prefixBytes(stat['effective_free_space']),
         prefixBytes(stat['total_space'] - stat['free_space'])],
        [PieColors.Green, PieColors.Gray]
    ];
});

renderCouplesPie = renderPieByData(function (stat) {
    return [
        [stat['open_couples'],
         stat['frozen_couples'],
         stat['closed_couples'],
         stat['bad_couples']],
        [stat['open_couples'],
         stat['frozen_couples'],
         stat['closed_couples'],
         stat['bad_couples']],
        [PieColors.Orange, PieColors.Blue, PieColors.Gray, PieColors.Red]
    ];
});

function renderBars(chart, bars, base_labels) {
    var values = [],
        labels = [],
        colors = [],
        overlaps = [];

    bars.forEach(function (barset) {
        var barset_values = [],
            barset_labels = [];
        barset.forEach(function (bar) {
            barset_values = barset_values.concat(bar.values());
            barset_labels = barset_labels.concat(bar.labels());
        });
        values.push(barset_values);
        labels.push(barset_labels);
    });

    bars[0].forEach(function (bar) {
        colors = colors.concat(bar.colors());
        overlaps = overlaps.concat(bar.overlaps());
    });

    var datasets = [],
        chart_values = transpose(values),
        chart_labels = transpose(labels),
        dc_options = clone(options),
        maxValue = 0.0;

    for (i in values) {
        for (j in values[i]) {
            if (values[i][j] > maxValue) {
                maxValue = values[i][j];
            }
        }
    }

    dc_options.scaleOverride = true;
    dc_options.scaleSteps = 15;
    dc_options.scaleStepWidth = Math.ceil(maxValue / dc_options.scaleSteps);
    dc_options.scaleStartValue = 0;


    chart_values.forEach(function (valueset, idx) {
        var color = colors[idx],
            barlabels = chart_labels[idx],
            overlap = overlaps[idx];

        datasets.push({
            fillColor: color.fillColor,
            strokeColor: color.strokeColor,
            labelFontSize: color.labelFontSize,
            labelColor: color.labelColor,

            data: valueset,
            labels: barlabels,
            overlap: overlap
        });
    });

    chart.Bar({
        labels: base_labels,
        datasets: datasets
    }, dc_options);
}

function renderBarsByData(data_filter) {
    return function (div, chart, data) {
        var data_items = iterItems(data),
            bars = [],
            labels = [];

        for (idx in data_items) {
            var dc = data_items[idx][0],
                stat = data_items[idx][1];

            bars.push(data_filter(stat));
            labels.push(dc_names[dc]);

        }
        div.attr('width', 30 + labels.length * 100).css({width: 30 + labels.length * 100 + 'px'});
        renderBars(chart, bars, labels);
    };
}

renderMemoryBars = renderBarsByData(function (stat) {
    return [
        accBar(
            [(stat['effective_space'] - stat['effective_free_space']) / gb,
             stat['effective_free_space'] / gb,
             stat['uncoupled_space'] / gb],
            [prefixBytes(stat['effective_space'] - stat['effective_free_space']),
             prefixBytes(stat['effective_free_space']),
             prefixBytes(stat['uncoupled_space'])],
            [BarColors.Gray, BarColors.Green, BarColors.Yellow]
        )
    ];
});

renderCoupleBars = renderBarsByData(function (stat) {
    return [
        accBar(
            [stat['bad_couples'], stat['closed_couples'],
             stat['frozen_couples'], stat['open_couples'], stat['uncoupled_groups']],
            [stat['bad_couples'], stat['closed_couples'],
             stat['frozen_couples'], stat['open_couples'], stat['uncoupled_groups']],
            [BarColors.Red, BarColors.Gray,
             BarColors.Blue, BarColors.Orange, BarColors.Yellow]
        )
    ];
});
