(function () {

    var updatePeriod = 30000;

    var ctxEM = new EffectiveMemoryPie('#effectiveMemoryChart', 'реплики: эффективное место'),
        ctxELRCM = new LrcEffectiveMemoryPie('#LrcEffectiveMemoryChart', 'LRC: эффективное место'),
        ctxTM = new TotalMemoryPie('#totalMemoryChart', 'реплики: общее место'),
        ctxTLRCM = new LrcMemoryPie('#LrcMemoryChart', 'LRC: общее место'),
        ctxC = new CouplesPie('#couplesChart', 'каплы', true),
        ctxUG = new UnusedGroupsPie('#UnusedGroupsChart', 'неиспользуемые группы', true),
        ctxUS = new UnusedSpacePie('#UnusedSpaceChart', 'неиспользуемое место', true),
        ctxEMDC = new MemoryBar('#dscMemoryChart', 'реплики: эффективное место по дц'),
        ctxTMDC = new TotalMemoryBar('#dscTotalMemoryChart', 'реплики: общее место по дц'),
        ctxLRCDC = new LrcTotalMemoryBar('#dscLrcMemoryChart', 'LRC: общее место по датацентрам'),
        ctxKDC = new KeysBar('#dscKeysChart', 'ключи по датацентрам'),
        ctxCDC = new CouplesBar('#dscCouplesChart', 'каплы по датацентрам'),
        ctxUGDC = new UnusedGroupsBar('#dscUnusedGroupsChart', 'неипользуемые группы по дц');

    var barClicks = [[ctxEMDC, 'free_space'],
                     [ctxKDC, 'fragmentation'],
                     [ctxCDC, 'couple_status']];

    var settings = ((localStorage &&
                     localStorage['ns'] &&
                     JSON.parse(localStorage['ns'])) ||
                    {});

    barClicks.forEach(function (el, idx) {
        el[0].onBarClick(function (dc) {
            PseudoURL.setPath('/map/')
                .setParam('t', el[1])
                .setParam('path', dc)
                .load();
        });
    });

    var ns_container = $('.namespaces'),
        namespaces_menu = $('.namespaces-menu'),
        namespaces = {},
        namespaces_per_dc_data = {},
        namespaces_data = {};
        namespaces_menus = {};

    var selectAllMI = $('<span class="menu-item ns-menu-item">'),
        selectAllL = $('<label>').appendTo(selectAllMI),
        selectAllCb = $('<input type="checkbox" value="">').appendTo(selectAllL);

    namespaces_menu.append(selectAllMI);
    selectAllCb.change(function () {
        var self = this;
        namespaces_menu.find('.ns-display-cb').each(function () {
            $(this).prop('checked', self.checked).trigger('change');
        });
    });

    selectAllL.append(document.createTextNode('выбрать все'));

    $(window).on('hashchange', function () {
        PseudoURL.parse(window.location.hash);
        checkHash();
    });

    $('body').keyup(function (event) {
        if (event.which == 27) {
            if ($('div.context-menu').length) {
                $('div.context-menu').remove();
                return;
            }
            if (PseudoURL.params['info']) {
                PseudoURL.setParam('info', null).load();
                return;
            }
            var search_field = $('input.search-field');
            if (search_field.is(':focus')) {
                search_field.blur();
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
                    filter = PseudoURL.params['filter'],
                    highlight = PseudoURL.params['highlight'];

                if (treemap.map && treemap.map.ns == ns) {
                    treemap.map.paint(type);
                    treemap.map.zoom_by_path(path);
                    treemap.map.highlight(highlight);
                } else {
                    hideDcTreeMap();
                    showDcTreeMap(path, type, ns, filter);
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

    function renderMenuItem(ns, init) {
        var spanMenuItem = namespaces_menu.find('.menu-item-ns-' + ns),
            menuItemCb = spanMenuItem.find('.ns-display-cb');

        checked = settings[ns] == true;

        if (checked) {
            spanMenuItem.find('.label').remove();
            menuItemLabel = $('<a class="label" href="#' + ns + '">' + ns + '</a>').
                appendTo(spanMenuItem);
            if (!init) {
                // was a user click, not initialization of menu item
                location.hash = '#' + ns;
            }
        } else {
            spanMenuItem.find('.label').remove();
            menuItemLabel = $('<a class="label unchecked" href="#' + ns + '">' + ns + '</a>').
                appendTo(spanMenuItem);
            menuItemLabel.click(function () {
                menuItemCb.prop('checked', true).trigger('change');
                return false;
            });
        }
    }

    function nsMenuItem(ns) {
        if (namespaces_menus[ns]) return;

        var spanMenuItem = $('<span class="menu-item ns-menu-item menu-item-ns-' + ns + '">'),
            // menuItem = $('<label>').appendTo(spanMenuItem),
            menuItemCb = $('<input class="ns-display-cb" type="checkbox" value="' + ns + '">').appendTo(spanMenuItem);

        insertAlphabetically(spanMenuItem, namespaces_menu, function (el) {
            return el.find('input').attr('value');
        });

        renderMenuItem(ns, true);

        // menuItem.append(document.createTextNode(ns));

        checked = settings[ns];
        menuItemCb.attr('checked', checked ? 'checked' : null);

        if (localStorage !== undefined) {
            menuItemCb.change(function () {
                if (this.checked) {
                    settings[$(this).val()] = true;
                    display_ns(ns);
                    var all_checked = true;
                    namespaces_menu.find('.ns-display-cb').each(function () {
                        if (!this.checked) {
                            all_checked = false;
                            return false;
                        }
                    });
                    if (all_checked) {
                        selectAllCb.prop('checked', true);
                    }
                    renderMenuItem(ns);
                } else {
                    delete settings[$(this).val()];
                    display_ns(ns);
                    selectAllCb.prop('checked', false);
                    renderMenuItem(ns);
                }
                localStorage['ns'] = JSON.stringify(settings);
            });
        }
        namespaces_menus[ns] = true;
    }

    function display_ns(ns) {
        if (settings[ns] == true) {

            var ns_chart = nsChart(ns),
                ns_per_dc_data = namespaces_per_dc_data[ns];
                ns_data = namespaces_data[ns];

            ns_chart.m_bars.update(ns_per_dc_data);
            ns_chart.em_bars.update(ns_per_dc_data);
            ns_chart.lrc_m_bars.update(ns_per_dc_data);
            ns_chart.lrc_em_pies.update(ns_data);
            ns_chart.lrc_tm_pies.update(ns_data);
            ns_chart.k_bars.update(ns_per_dc_data);
            ns_chart.c_bars.update(ns_per_dc_data);
            ns_chart.co_bars.update(ns_per_dc_data);
        } else {
            delete namespaces[ns];
            $('.namespaces #' + ns).remove();
        }
    }

    function byId(el) {
        return el.attr('id');
    }

    function nsChart(ns) {
        if (!namespaces[ns]) {

            var chart_set = $('<div class="chart-set" id="' + ns + '">'),
                chart_label = $('<span class="ns-chart-label">').appendTo(chart_set),
                clear2 = $('<span class="clear">').appendTo(chart_set);

            insertAlphabetically(chart_set, ns_container, byId);

            var m_chart = $('<div class="chart m-chart-' + ns + '">').appendTo(chart_set),
                em_chart = $('<div class="chart em-chart-' + ns + '">').appendTo(chart_set),
                lrc_em_chart = $('<div class="chart lrc-em-chart-' + ns + '">').appendTo(chart_set),
                lrc_tm_chart = $('<div class="chart lrc-tm-chart-' + ns + '">').appendTo(chart_set),
                lrc_chart = $('<div class="chart lrc-m-chart-' + ns + '">').appendTo(chart_set),
                k_chart = $('<div class="chart k-chart-' + ns + '">').appendTo(chart_set),
                c_chart = $('<div class="chart c-chart-' + ns + '">').appendTo(chart_set),
                co_chart = $('<div class="chart co-chart-' + ns + '">').appendTo(chart_set),
                m_bars = new TotalMemoryBar('.m-chart-' + ns, 'общее место'),
                em_bars = new MemoryBar('.em-chart-' + ns, 'эффективное место'),
                lrc_em_pies = new LrcEffectiveMemoryPie('.lrc-em-chart-' + ns, 'LRC: эффективное место'),
                lrc_tm_pies = new LrcMemoryPie('.lrc-tm-chart-' + ns, 'LRC: общее место'),
                lrc_m_bars = new LrcTotalMemoryBar('.lrc-m-chart-' + ns, 'LRC: общее место'),
                k_bars = new KeysBar('.k-chart-' + ns, 'ключи'),
                c_bars = new CouplesBar('.c-chart-' + ns, 'каплы'),
                co_bars = new OutagesBar('.co-chart-' + ns, 'отключение ДЦ*', '* что произойдет, если отключится конкретный ДЦ');

            chart_label.text('Неймспейс ' + ns);

            $('<span class="clear">').appendTo(chart_set);

            namespaces[ns] = {
                'm_bars': m_bars,
                'em_bars': em_bars,
                'lrc_m_bars': lrc_m_bars,
                'lrc_em_pies': lrc_em_pies,
                'lrc_tm_pies': lrc_tm_pies,
                'k_bars': k_bars,
                'c_bars': c_bars,
                'co_bars': co_bars
            };

            var barClicks = [[m_bars, 'free_space'],
                             [em_bars, 'free_space'],
                             [k_bars, 'fragmentation'],
                             [c_bars, 'couple_status'],
                             [co_bars, 'couple_status']];

            barClicks.forEach(function (el, idx) {
                el[0].onBarClick(function (dc) {
                    PseudoURL.setPath('/map/')
                        .setParam('t', el[1])
                        .setParam('ns', ns)
                        .setParam('path', dc)
                        .load();
                });
            });
        }

        return namespaces[ns];
    }

    initLoad = true;
    function updateStats() {
        $.ajax({
            url: '/json/stat/',
            data: {ts: new Date().getTime()},
            timeout: 10000,
            dataType: 'json',
            success: function (data) {

                ctxEM.update(data);
                ctxELRCM.update(data);
                ctxTM.update(data);
                ctxTLRCM.update(data);
                ctxC.update(data);
                ctxUG.update(data);
                ctxUS.update(data);

                ctxEMDC.update(data['dc']);
                ctxTMDC.update(data['dc']);
                ctxLRCDC.update(data['dc']);
                ctxKDC.update(data['dc']);
                ctxCDC.update(data['dc']);
                ctxUGDC.update(data['dc']);

                var ns_per_dc_items = iterItems(data['namespaces']),
                    ns_items = iterItems(data['namespaces_only']);

                // namespaces stats
                var new_ns_per_dc_data = {};
                for (var idx in ns_per_dc_items) {
                    var ns = ns_per_dc_items[idx][0],
                        ns_per_dc_data = ns_per_dc_items[idx][1];
                    new_ns_per_dc_data[ns] = ns_per_dc_data;
                }
                var new_ns_data = {};
                for (var idx in ns_items) {
                    var ns = ns_items[idx][0],
                        ns_data = ns_items[idx][1];
                    new_ns_data[ns] = ns_data;
                }

                namespaces_per_dc_data = new_ns_per_dc_data;
                namespaces_data = new_ns_data;

                if (initLoad) {
                    maybe_ns = location.hash.substr(1);
                    if (namespaces_per_dc_data[maybe_ns] !== undefined
                        && namespaces_data[maybe_ns] !== undefined) {
                        settings[maybe_ns] = true;
                        localStorage['ns'] = JSON.stringify(settings);
                    }
                }

                for (var ns in namespaces_per_dc_data) {
                    nsMenuItem(ns);
                    display_ns(ns);
                }

                if (initLoad) {
                    maybe_ns = location.hash.substr(1);
                    if (namespaces_per_dc_data[maybe_ns] !== undefined
                        && namespaces_data[maybe_ns] !== undefined) {
                        // hash is a namespace, move to the anchor
                        location.hash = '#dummy';
                        location.hash = '#' + maybe_ns;
                    }
                }

                // no more animation, i'm begging you
                options.animation = false;
                initLoad = false;
            }
        })
    }

    function periodicTask() {
        updateStats();
        setTimeout(periodicTask, updatePeriod);
    }
    periodicTask();

    checkHash();

})();
