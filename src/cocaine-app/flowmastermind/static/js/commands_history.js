(function() {

    var cmd_containers = $('.cmd-containers'),
        commands = Commands(cmd_containers);
        year = cmd_containers.attr('year'),
        month = cmd_containers.attr('month');

    function updateStats() {
        $.ajax({
            url: '/json/commands/history/' + year + '/' + month + '/',
            data: {ts: new Date().getTime()},
            timeout: 60000,
            dataType: 'json',
            success: function (data) {

                for (var idx in data) {
                    var state = data[idx];

                    commands.model.update(state.host, state.uid, state);
                }
            }
        })
    }

    updateStats();

})();
