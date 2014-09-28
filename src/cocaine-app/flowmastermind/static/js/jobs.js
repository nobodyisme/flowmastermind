(function() {

    var updatePeriod = 5000,
        jobs_container = $('.jobs-containers'),
        job_type = jobs_container.attr('job-type'),
        spinner = new Spinner('div.job-init-spinner', jobs_container.width());

    spinner.start();

    function updateStats() {
        $.ajax({
            url: '/json/jobs/' + job_type + '/',
            data: {ts: new Date().getTime()},
            timeout: 3000,
            dataType: 'json',
            success: function (response) {

                if (response['status'] == 'success') {
                    spinner.stop();
                    var data = response['response'];

                    for (var idx in data) {
                        var state = data[idx];

                        Jobs.model.update(state.id, state);
                    }
                } else {
                    spinner.blink('#ab2d2d');
                }
            },
            error: function (data) {
                spinner.blink('#ab2d2d');
            }
        })
    }

    function periodicTask() {
        updateStats();
        setTimeout(periodicTask, updatePeriod);
    }
    periodicTask();

})();
