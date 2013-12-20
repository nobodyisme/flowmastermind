(function () {

    var updatePeriod = 10000;

    var ctxEM = document.getElementById('effectiveMemoryChart').getContext('2d');
    var ctxTM = document.getElementById('totalMemoryChart').getContext('2d');
    var ctxC = document.getElementById('couplesChart').getContext('2d');
    var ctxMDC = document.getElementById('dscMemoryChart').getContext('2d');
    var ctxGDC = document.getElementById('dscGroupsChart').getContext('2d');

    var effectiveMemoryChart = new Chart(ctxEM);
    var totalMemoryChart = new Chart(ctxTM);
    var couplesChart = new Chart(ctxC);
    var dcMemoryChart = new Chart(ctxMDC);
    var dcGroupsChart = new Chart(ctxGDC);

    var options = {
        //String - Animation easing effect
        animation: true,
        animationEasing: "easeOutQuart",
        barStrokeWidth: 2,
        labelFontFamily: 'Verdana',
        showTooltips: true
    };

    var prefixes = ['б', 'кб', 'Мб', 'Гб', 'Тб', 'Пб'],
        gb = 1024 * 1024 * 1024;

    var dc_names = {'ugr': 'Угрешка',
                    'myt': 'Мытищи',
                    'sas': 'Сасово',
                    'fol': 'Фольга',
                    'iva': 'Ивантеевка'}

    function prefixBytes(bytes) {
        var res = bytes;
        for (var i in prefixes) {
            if (res < 1024) {
                return res.toFixed(2) + ' ' + prefixes[i];
            }
            res = res / 1024;
        }
        return res.toFixed(2) + ' ' + prefixes[prefixes.length - 1];
    }

    function renderMemoryChart(chart, data) {
        var m_data = [
            {
                value: data[0].value,
                // color: "#467EE2",
                color : "rgba(88, 218, 119, 1.0)",
                label: '  ' + data[0].label + '  ',
                labelAlign: 'right',
                labelFontSize: '14',
                labelColor: "#334153"
                // labelColor: "#9DC7FD"
            },
            {
                value : data[1].value,
                // color : "#9DC7FD",
                color : "#eee",
                label: '  ' + data[1].label + '  ',
                labelFontSize: '14',
                // labelColor: "#00509E"
                // labelColor: "#467EE2"
                labelColor: "#b6b6b6"
            }
        ];

        chart.Pie(m_data, options);
    }

    function renderCouplesChart(chart, data) {
        var c_data = [
            {
                value: data[0].value,
                color : "#fdb45c",
                label: '  ' + data[0].label + '  ',
                labelAlign: 'right',
                labelFontSize: '14',
                labelColor: "#422C12"
            },
            {
                value: data[1].value,
                color : "#cfe4ff",
                label: '  ' + data[1].label + '  ',
                labelAlign: 'right',
                labelFontSize: '14',
                labelColor: "#422C12"
            },
            {
                value : data[2].value,
                color : "#eee",
                label: '  ' + data[2].label + '  ',
                labelFontSize: '14',
                labelColor: "#b6b6b6"
            }
        ];

        chart.Pie(c_data, options);
    }

    function renderDcMemoryChart(chart, labels, data, barlabels) {

        var dc_options = clone(options),
            maxValue = 0.0;

        for (i in data) {
            for (j in data[i]) {
                if (data[i][j] > maxValue) {
                    maxValue = data[i][j];
                }
            }
        }

        dc_options.scaleOverride = true;
        dc_options.scaleSteps = 15;
        dc_options.scaleStepWidth = Math.ceil(maxValue / dc_options.scaleSteps);
        dc_options.scaleStartValue = 0;

        var mdc_data = {
            labels: labels,
            datasets: [
                {
                    fillColor : "rgba(255, 250, 121, 0.5)",
                    strokeColor : "rgba(255, 250, 121, 1.0)",
                    data : data[0],
                    labelFontSize: '10',
                    labels: barlabels[0],
                    labelColor: "rgba(102, 99, 37, 1)",
                    overlap: true
                },
                {
                    fillColor : "rgba(235,235,235,1)",
                    strokeColor : "rgba(220,220,220,1)",
                    data : data[1],
                    labelFontSize: '10',
                    labels: barlabels[1],
                    labelColor: "#b6b6b6",
                    overlap : true
                },
                {
                    fillColor : "rgba(88, 218, 119, 0.5)",
                    strokeColor : "rgba(88, 218, 119, 1)",
                    data : data[2],
                    labelFontSize: '10',
                    labelColor: '#1D421D',
                    labels: barlabels[2]
                }
            ]
        };

        chart.Bar(mdc_data, dc_options);
    }

    function renderDcGroupsChart(chart, labels, data, barlabels) {

        var dc_options = clone(options),
            maxValue = 0.0;

        for (i in data) {
            for (j in data[i]) {
                if (data[i][j] > maxValue) {
                    maxValue = data[i][j];
                }
            }
        }

        dc_options.scaleOverride = true;
        dc_options.scaleSteps = 15;
        dc_options.scaleStepWidth = Math.ceil(maxValue / dc_options.scaleSteps);
        dc_options.scaleStartValue = 0;

        var mdc_data = {
            labels: labels,
            datasets: [
                {
                    fillColor : "rgba(255, 250, 121, 0.5)",
                    strokeColor : "rgba(255, 250, 121, 1.0)",
                    data : data[0],
                    labelFontSize: '10',
                    labels: barlabels[0],
                    labelColor: "rgba(102, 99, 37, 1)",
                    overlap: true
                },
                {
                    fillColor : "rgba(235,235,235,1)",
                    strokeColor : "rgba(220,220,220,1)",
                    data : data[1],
                    labelFontSize: '10',
                    labels: barlabels[1],
                    labelColor: "#b6b6b6",
                    overlap : true
                },
                {
                    fillColor : "rgba(160, 202, 255, 0.5)",
                    strokeColor : "rgba(160, 202, 255, 1)",
                    data : data[2],
                    labelFontSize: '10',
                    labelColor: 'rgba(65, 44, 19, 1)',
                    labels: barlabels[2],
                    overlap: true
                },
                {
                    fillColor : "rgba(254, 218, 172, 1)",
                    strokeColor : "rgba(253, 180, 92, 1)",
                    data : data[3],
                    labelFontSize: '10',
                    labelColor: 'rgba(65, 44, 19, 1)',
                    labels: barlabels[3]
                }
            ]
        };

        chart.Bar(mdc_data, dc_options);
    }

    function updateStats() {
        $.ajax({
            url: '/json/stat/',
            data: {ts: new Date().getTime()},
            timeout: 3000,
            dataType: 'json',
            success: function (data) {

                var free_space = data['free_space'],
                    occ_space = data['total_space'] - free_space,
                    effective_occ_space = occ_space,
                    effective_free_space = data['effective_free_space'],

                    open_couples = data['open_couples'],
                    frozen_couples = data['frozen_couples'],
                    closed_couples = data['total_couples'] - open_couples - frozen_couples,

                    free_space_label = prefixBytes(free_space),
                    occ_space_label = prefixBytes(occ_space),
                    effective_free_space_label = prefixBytes(effective_free_space),
                    effective_occ_space_label = prefixBytes(effective_occ_space);

                renderMemoryChart(effectiveMemoryChart, [
                    {value: effective_free_space,
                     label: effective_free_space_label},
                    {value: effective_occ_space,
                     label: effective_occ_space_label}
                ]);

                renderMemoryChart(totalMemoryChart, [
                    {value: free_space,
                     label: free_space_label},
                    {value: occ_space,
                     label: occ_space_label}
                ]);

                renderCouplesChart(couplesChart, [
                    {value: open_couples,
                     label: open_couples},
                    {value: frozen_couples,
                     label: frozen_couples},
                    {value: closed_couples,
                     label: closed_couples}
                ]);


                var labels = [],
                    dcdata = [[], [], []],
                    barlabels = [[], [], []];

                for (dc in data['dc']) {
                    labels.push(dc_names[dc]);
                    var uncoupled_acc = data['dc'][dc]['uncoupled_space'] + data['dc'][dc]['effective_space'];
                    dcdata[0].push(uncoupled_acc / gb);
                    dcdata[1].push(data['dc'][dc]['effective_space'] / gb);
                    dcdata[2].push(data['dc'][dc]['effective_free_space'] / gb);

                    barlabels[0].push(prefixBytes(data['dc'][dc]['uncoupled_space']));
                    barlabels[1].push(prefixBytes(data['dc'][dc]['effective_space'] - data['dc'][dc]['effective_free_space']));
                    barlabels[2].push(prefixBytes(data['dc'][dc]['effective_free_space']));

                }
                $('#dscMemoryChart').attr('width', 30 + labels.length * 100).css({width: 30 + labels.length * 100 + 'px'});
                renderDcMemoryChart(dcMemoryChart, labels, dcdata, barlabels);



                var labels = [],
                    dcdata = [[], [], [], []],
                    barlabels = [[], [], [], []];

                for (dc in data['dc']) {
                    labels.push(dc_names[dc]);
                    var uncoupled_acc = data['dc'][dc]['uncoupled_groups'] + data['dc'][dc]['total_couples'];
                    dcdata[0].push(uncoupled_acc);
                    dcdata[1].push(data['dc'][dc]['total_couples']);
                    dcdata[2].push(data['dc'][dc]['frozen_couples'] + data['dc'][dc]['open_couples']);
                    dcdata[3].push(data['dc'][dc]['open_couples']);

                    barlabels[0].push(data['dc'][dc]['uncoupled_groups']);
                    barlabels[1].push(data['dc'][dc]['total_couples'] - data['dc'][dc]['open_couples'] - data['dc'][dc]['frozen_couples']);
                    barlabels[2].push(data['dc'][dc]['frozen_couples']);
                    barlabels[3].push(data['dc'][dc]['open_couples']);

                }
                $('#dscGroupsChart').attr('width', 30 + labels.length * 100).css({width: 30 + labels.length * 100 + 'px'});
                renderDcGroupsChart(dcGroupsChart, labels, dcdata, barlabels);


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


    $(".menu-item").mouseover(function() {
        $(this).stop(true, true).animate({ borderColor: "rgba(200, 200, 200, 1.0)" }, "fast");
    });

    $(".menu-item").mouseout(function() {
        $(this).stop(true, true).animate({ borderColor: "rgba(200, 200, 200, 0.0)" }, "fast");
    });

})();


function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}