(function() {

    var cmd_containers = $('.cmd-containers'),
        year = cmd_containers.attr('year'),
        month = cmd_containers.attr('month');

    function updateStats() {
        $.ajax({
            url: '/json/commands/history/' + year + '/' + month + '/',
            data: {ts: new Date().getTime()},
            timeout: 3000,
            dataType: 'json',
            success: function (data) {

                console.log('processing commands');

                for (var idx in data) {
                    var state = data[idx];

                    Commands.model.update(state.host, state.uid, state);
                }
            }
        })
    }

    updateStats();

})();
