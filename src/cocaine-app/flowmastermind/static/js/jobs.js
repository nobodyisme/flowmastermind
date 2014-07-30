(function() {

    var updatePeriod = 5000;

    function updateStats() {
        $.ajax({
            url: '/json/jobs/',
            data: {ts: new Date().getTime()},
            timeout: 3000,
            dataType: 'json',
            success: function (data) {

                for (var idx in data) {
                    var state = data[idx];

                    Jobs.model.update(state.id, state);
                }
            }
        })
    }

    function periodicTask() {
        updateStats();
        setTimeout(periodicTask, updatePeriod);
    }
    periodicTask();

})();
