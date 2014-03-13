(function () {

    var updatePeriod = 30000;

    var ctxEM = new EffectiveMemoryPie('#effectiveMemoryChart', 'эффективное место'),
        ctxTM = new TotalMemoryPie('#totalMemoryChart', 'общее место'),
        ctxRDEM = new EffectiveMemoryPie('#realDataEffMemoryChart', 'размер данных*', true),
        ctxC = new GroupsPie('#couplesChart', 'каплы', true),
        ctxMDC = new MemoryBar('#dscMemoryChart', 'память по датацентрам'),
        ctxGDC = new GroupsBar('#dscGroupsChart', 'группы по датацентрам');

    ctxMDC.onBarClick(showDcTreeMap);

    var ns_container = $('.namespaces'),
        namespaces_menu = $('.namespaces-menu'),
        namespaces = {};

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

            var m_chart = $('<div class="chart m-chart-' + ns + '">').appendTo(chart_set),
                c_chart = $('<div class="chart c-chart-' + ns + '">').appendTo(chart_set),
                m_bars = new MemoryBar('.m-chart-' + ns, 'память'),
                c_bars = new GroupsBar('.c-chart-' + ns, 'каплы'),

                spanMenuItem = $('<span class="menu-item">').appendTo(namespaces_menu),
                menuItem = $('<a href="#' + ns + '">').appendTo(spanMenuItem);

            menuItem.text(ns);
            chart_label.text('Неймспейс ' + ns);

            $('<span class="clear">').appendTo(chart_set);

            namespaces[ns] = {
                'm_bars': m_bars,
                'c_bars': c_bars
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

                ctxEM.update(data);
                ctxTM.update(data);
                ctxRDEM.update(data['real_data']);
                ctxC.update(data);

                ctxMDC.update(data['dc']);
                ctxGDC.update(data['dc']);

                var ns_items = iterItems(data['namespaces']);

                // namespaces stats
                for (var idx in ns_items) {

                    var ns = nsChart(ns_items[idx][0]),
                        ns_data = ns_items[idx][1];

                    ns.m_bars.update(ns_data);
                    ns.c_bars.update(ns_data);
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
