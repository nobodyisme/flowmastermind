(function() {

    var retryPeriod = 30,
        jobs_container = $('.jobs-containers'),
        paginator_container = jobs_container.find('.paginator_container'),
        job_id = jobs_container.attr('job-id'),
        job_type = jobs_container.attr('job-type'),
        job_tag = jobs_container.attr('job-tag'),
        job_status = jobs_container.attr('job-status'),
        cur_year = jobs_container.attr('job-cur-year'),
        cur_month = jobs_container.attr('job-cur-month'),
        limit = jobs_container.attr('job-limit'),
        offset = jobs_container.attr('job-offset'),
        spinner = new Spinner('div.job-init-spinner', jobs_container.width()),
        job_id_search_form = $('.job-search'),
        jobs_updater = JobsUpdater(30),
        paginator = Paginator(paginator_container);

    spinner.start();

    function loadJobs() {
        var load_url;
        if (job_id) {
            load_url = '/json/jobs/' + job_id + '/';
        } else {
            load_url = '/json/jobs/' + job_type + '/' + job_status + '/' + job_tag + '/' + '?limit=' + limit + '&offset=' + offset;
        }
        $.ajax({
            url: load_url,
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

                    jobs_updater.run();
                } else {
                    spinner.blink('#ab2d2d');
                    setTimeout(loadJobs, retryPeriod);
                }
            },
            error: function (data) {
                spinner.blink('#ab2d2d');
                setTimeout(loadJobs, retryPeriod);
            }
        })
    }

    loadJobs();

    job_id_search_form.submit(function (event) {
        event.preventDefault();
        var job_id = job_id_search_form.find('.job-id-field').val();

        // special case since 'отменить' is frequently selected along with job id on double click
        // on pending jobs
        job_id = job_id.replace(/отменить$/, '');

        if (job_id) {
            window.location = '/job/' + job_id + '/';
        }
    });

})();
