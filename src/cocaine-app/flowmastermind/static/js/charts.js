(function () {

    var updatePeriod = 30000;

    var ctxEM = document.getElementById('effectiveMemoryChart').getContext('2d'),
        ctxTM = document.getElementById('totalMemoryChart').getContext('2d'),
        ctxRDEM = document.getElementById('realDataEffMemoryChart').getContext('2d'),
        ctxC = document.getElementById('couplesChart').getContext('2d'),
        ctxMDC = document.getElementById('dscMemoryChart').getContext('2d'),
        ctxGDC = document.getElementById('dscGroupsChart').getContext('2d'),

        effectiveMemoryChart = new Chart(ctxEM),
        totalMemoryChart = new Chart(ctxTM),
        realDataEffMemoryChart = new Chart(ctxRDEM),
        couplesChart = new Chart(ctxC),
        dcMemoryChart = new Chart(ctxMDC),
        dcGroupsChart = new Chart(ctxGDC);

    var ns_container = $('.namespaces'),
        namespaces_menu = $('.namespaces-menu'),
        namespaces = {};

    function addLegend(chart_set) {

        var legends = [
            {label: ' — свободно',
             labelclass: 'color-memory-free'},
            {label: ' — занято',
             labelclass: 'color-memory-occ',
             padding: true},
            {label: ' — в капле, открыта',
             labelclass: 'color-dc-couples-open'},
            {label: ' — в капле, заморожена',
             labelclass: 'color-dc-couples-frozen'},
            {label: ' — в капле, закрыта',
             labelclass: 'color-dc-couples-total'},
            {label: ' — не в капле',
             labelclass: 'color-dc-groups-uncoupled'},
        ];

        var chart_legend = $('<div class="chart-legend">').appendTo(chart_set),
            item_dummy = $('<div class="chart-legend-item">'),
            color_sample_dummy = $('<span class="chart-legend-color-sample">');

        for (idx in legends) {
            var item = item_dummy.clone().appendTo(chart_legend),
                color_sample = color_sample_dummy.clone().appendTo(item),
                textNode = document.createTextNode(legends[idx].label);
            item.append(textNode);
            color_sample.addClass(legends[idx].labelclass);

            if (legends[idx].padding) {
                item_dummy.clone().appendTo(chart_legend);
            }
        }
    }

    function transpose(source) {

        var result = [],
            length = source[0].length;

        while (length--) {
            result.push([]);
        }

        source.forEach(function (inner) {
            inner.forEach(function (item, index) {
                result[index].push(item);
            });
        });

        return result;
    }

    function nsChart(ns) {
        if (!namespaces[ns]) {

            var chart_set = $('<div class="chart-set" id="' + ns + '">').appendTo(ns_container),
                chart_label = $('<span class="ns-chart-label">').appendTo(chart_set),
                clear2 = $('<span class="clear">').appendTo(chart_set);

            addLegend(chart_set);

            var m_chart = $('<div class="chart">').appendTo(chart_set),
                m_chart_canvas = $('<canvas height="300" width="750">').appendTo(m_chart),
                c_chart = $('<div class="chart">').appendTo(chart_set),
                c_chart_canvas = $('<canvas height="300" width="750">').appendTo(c_chart),

                ctxNSMDC = m_chart_canvas[0].getContext('2d'),
                ctxNSCDC = c_chart_canvas[0].getContext('2d'),

                spanMenuItem = $('<span class="menu-item">').appendTo(namespaces_menu),
                menuItem = $('<a href="#' + ns + '">').appendTo(spanMenuItem);

            menuItem.text(ns);
            chart_label.text('Неймспейс ' + ns);

            $('<span class="clear">').appendTo(chart_set);


            namespaces[ns] = {
                'm_chart': new Chart(ctxNSMDC),
                'c_chart': new Chart(ctxNSCDC),
                'm_canvas': m_chart_canvas,
                'c_canvas': c_chart_canvas
            };
        }

        return namespaces[ns];
    }

    function updateStats() {
        $.ajax({
            url: '/json/stat/',
            data: {ts: new Date().getTime()},
            timeout: 3000,
            dataType: 'json',
            success: function (data) {

                var open_couples = data['open_couples'],
                    frozen_couples = data['frozen_couples'],
                    closed_couples = data['total_couples'] - open_couples - frozen_couples;

                renderEffectiveMemoryPie(effectiveMemoryChart, data);
                renderTotalMemoryPie(totalMemoryChart, data);
                renderEffectiveMemoryPie(realDataEffMemoryChart, data['real_data']);
                renderCouplesPie(couplesChart, data);

                renderMemoryBars($('#dscMemoryChart'), dcMemoryChart, data['dc']);
                renderCoupleBars($('#dscGroupsChart'), dcGroupsChart, data['dc']);

                var ns_items = iterItems(data['namespaces']);

                // namespaces stats
                for (var idx in ns_items) {

                    var ns = nsChart(ns_items[idx][0]),
                        ns_data = ns_items[idx][1];

                    renderMemoryBars(ns.m_canvas, ns.m_chart, ns_data);
                    renderCoupleBars(ns.c_canvas, ns.c_chart, ns_data);
                }

                // no more animation, i'm begging you
                options.animation = false;
            }
        })
    }

    function periodicTask() {
        updateStats();
        setTimeout(periodicTask, updatePeriod);
    }
    periodicTask();

    $(document).on("mouseover", ".menu-item", function() {
        // $(this).stop(true, true).animate({ borderBottomColor: "rgba(200, 200, 200, 1.0)",
        //                                    borderTopColor: "rgba(200, 200, 200, 1.0)" }, 0.5);
    });

    $(document).on("mouseout", ".menu-item", function() {
        // $(this).stop(true, true).animate({ borderColor: "rgba(200, 200, 200, 0.0)" }, 0.1);
        // $(this).stop(true, true).animate({ borderBottomColor: "rgba(200, 200, 200, 0.0)",
        //                                    borderTopColor: "rgba(200, 200, 200, 0.0)" }, 0.5);

    });

})();
