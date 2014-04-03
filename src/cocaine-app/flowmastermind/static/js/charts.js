(function () {

    var updatePeriod = 30000;

    var ctxEM = new EffectiveMemoryPie('#effectiveMemoryChart', 'эффективное место'),
        ctxTM = new TotalMemoryPie('#totalMemoryChart', 'общее место'),
        ctxRDEM = new EffectiveMemoryPie('#realDataEffMemoryChart', 'размер данных*', true),
        ctxC = new GroupsPie('#couplesChart', 'каплы', true),
        ctxMDC = new MemoryBar('#dscMemoryChart', 'память по датацентрам'),
        ctxGDC = new GroupsBar('#dscGroupsChart', 'группы по датацентрам');

    ctxMDC.onBarClick(function (dc) {
        PseudoURL.setPath('/map/')
            .setParam('t', 'free_space')
            .setParam('path', dc)
            .load();
    });

    ctxGDC.onBarClick(function (dc) {
        PseudoURL.setPath('/map/')
            .setParam('t', 'couple_status')
            .setParam('path', dc)
            .load();
    });

    var ns_container = $('.namespaces'),
        namespaces_menu = $('.namespaces-menu'),
        namespaces = {};

    $(window).on('hashchange', function () {
        PseudoURL.parse(window.location.hash);
        checkHash();
    });

    $('body').keyup(function (event) {
        if (event.which == 27) {
            if (PseudoURL.params['info']) {
                PseudoURL.setParam('info', null).load();
                return;
            }
            PseudoURL.setUrl('').load();
        }
    });


    function checkHash() {

        switch (PseudoURL.path) {
            case '/map/':
                var type = PseudoURL.params['t'],
                    path = PseudoURL.params['path'],
                    ns = PseudoURL.params['ns'],
                    group_id = PseudoURL.params['info'],
                    highlight = PseudoURL.params['highlight'];

                if (treemap && treemap.ns == ns) {
                    console.log(treemap.ns, ns);
                    treemap.paint(type);
                    treemap.zoom_by_path(path);
                    treemap.highlight(highlight);
                } else {
                    hideDcTreeMap();
                    showDcTreeMap(path, type, ns);
                }
                if (group_id) {
                    showGroupInfo(group_id);
                } else {
                    hideGroupInfo();
                }
                break;
            case '':
            case undefined:
                hideDcTreeMap();
                hideGroupInfo();
                break;
        }

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

            m_bars.onBarClick(function (dc) {
                PseudoURL.setPath('/map/')
                    .setParam('t', 'free_space')
                    .setParam('ns', ns)
                    .setParam('path', dc)
                    .load();
            });

            c_bars.onBarClick(function (dc) {
                PseudoURL.setPath('/map/')
                    .setParam('t', 'couple_status')
                    .setParam('ns', ns)
                    .setParam('path', dc)
                    .load();
            });

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

    checkHash();

})();
