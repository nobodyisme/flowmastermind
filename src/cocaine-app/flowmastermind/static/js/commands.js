(function() {

    var updatePeriod = 5000,
        commands = Commands($('.cmd-containers'));

    function updateStats() {
        $.ajax({
            url: '/json/commands/',
            data: {ts: new Date().getTime()},
            timeout: 3000,
            dataType: 'json',
            success: function (data) {

                for (var idx in data) {
                    var state = data[idx];

                    commands.model.update(state.host, state.uid, state);
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
