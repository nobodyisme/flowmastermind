(function() {

    var updatePeriod = 15000,
        jobs_container = $('.jobs-containers'),
        paginator_container = jobs_container.find('.paginator_container'),
        job_type = jobs_container.attr('job-type'),
        job_tag = jobs_container.attr('job-tag'),
        job_status = jobs_container.attr('job-status'),
        cur_year = jobs_container.attr('job-cur-year'),
        cur_month = jobs_container.attr('job-cur-month'),
        limit = jobs_container.attr('job-limit'),
        offset = jobs_container.attr('job-offset'),
        spinner = new Spinner('div.job-init-spinner', jobs_container.width()),
        paginator = Paginator(paginator_container);

    spinner.start();

    function loadJobs() {
        $.ajax({
            url: '/json/jobs/' + job_type + '/' + job_status + '/' + job_tag + '/' + '?limit=' + limit + '&offset=' + offset,
            data: {ts: new Date().getTime()},
            timeout: 30000,
            dataType: 'json',
            success: function (response) {

                if (response['status'] == 'success') {
                    spinner.stop();
                    var data = response['response'];

                    for (var idx in data['jobs']) {
                        var state = data['jobs'][idx];

                        Jobs.model.update(state.id, state);
                    }

                    paginator.model.update({
                        total: data['total'],
                        offset: offset,
                        limit: limit,
                        baseUrl: '/jobs/' + job_type + '/' + job_status + '/' + cur_year + '/' + cur_month + '/'
                    });

                    Jobs.view.updateContainers();

                    setTimeout(periodicTask, updatePeriod);
                } else {
                    spinner.blink('#ab2d2d');
                    setTimeout(loadJobs, updatePeriod);
                }
            },
            error: function (data) {
                spinner.blink('#ab2d2d');
                setTimeout(loadJobs, updatePeriod);
            }
        })
    }

    function updateJobs() {
        var job_ids = [];
        for (var id in Jobs.model.jobs) {
            job_ids.push(id);
        }
        if (job_ids.length == 0) return;

        $.ajax({
            url: '/json/jobs/update/',
            data: {jobs: job_ids,
                   ts: new Date().getTime()},
            timeout: 30000,
            dataType: 'json',
            type: 'POST',
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

    loadJobs();

    function periodicTask() {
        updateJobs();
        setTimeout(periodicTask, updatePeriod);
    }

})();
