(function() {

    var updatePeriod = 5000,
        jobs_container_path = 'div.jobs-containers',
        jobs_container = $(jobs_container_path),
        job_type = jobs_container.attr('job-type'),
        spinner = new Spinner(jobs_container_path, jobs_container.width());

    spinner.start();

    function updateStats() {
        $.ajax({
            url: '/json/jobs/' + job_type + '/',
            data: {ts: new Date().getTime()},
            timeout: 3000,
            dataType: 'json',
            success: function (data) {

                spinner.stop();

                for (var idx in data) {
                    var state = data[idx];

                    Jobs.model.update(state.id, state);
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
