(function () {

    var updatePeriod = 30000,
        jobs_container = $('.jobs-containers'),
        limit = jobs_container.attr('job-limit'),
        paginator_container = jobs_container.find('.paginator_container'),
        jobs_updater = JobsUpdater(30),
        executing_request = null;

    function Request(form, offset) {
        this.form = form;
        this.offset = offset;
        this.spinner = null;
        this.running = false;
        this.retryTimeout = 5000;
    };

    Request.prototype.run = function() {
        var self = this;

        self.running = true;

        Jobs.model.clear();
        paginator.model.clear();

        self.spinner = new Spinner('div.jobs-filter-spinner', jobs_container.width());
        self.spinner.start();

        self.perform();
    };

    Request.prototype.cancel = function () {
        this.running = false;
        if (self.spinner) {
            self.spinner.stop();
        }
    };

    Request.prototype.perform = function () {

        var self = this;

        if (!self.running) {
            return;
        }

        var form_data = self.form.serialize(),
            request_jobs_limit = parseInt(self.form.find('input[name=limit]').val());

        $.ajax({
            url: '/json/jobs/filter/?offset=' + self.offset,
            data: form_data,
            timeout: 30000,
            dataType: 'json',
            type: 'GET',
            success: function (response) {

                if (response['status'] == 'success') {
                    self.spinner.stop();
                    var data = response['response'];

                    for (var idx in data['jobs']) {
                        var state = data['jobs'][idx];

                        Jobs.model.update(state.id, state);
                    }
                    paginator.model.update({
                        total: data['total'],
                        offset: self.offset,
                        limit: request_jobs_limit,
                        baseUrl: '/jobs/filter/',
                    });

                    Jobs.view.updateContainers();

                    jobs_updater.reset();
                } else {
                    self.spinner.blink('#ab2d2d');
                    setTimeout(self.perform.bind(self), self.retryTimeout);
                }
            },
            error: function (data) {
                self.spinner.blink('#ab2d2d');
                setTimeout(self.perform.bind(self), self.retryTimeout);
            }
        });
    };

    function setup_job_types_filter() {

        var dst_filter_container = $('.jobs-filter .job-types-filter .filter-setter');

        JobTypesGroups.forEach(function (job_types_group) {
            var job_types_group_container = $('<div class="job-types-group-container">');
            
            job_types_group_label = $('<label>');
            job_types_group_label.text(job_types_group.label);
            job_types_group_container.append(job_types_group_label);

            job_types = $('<div class="job-types-groups">');
            job_types_group.job_types.forEach(function (job_type_id) {
                var job_type = JobTypes[job_type_id],
                    job_type_container = $('<div class="job-types-group">');

                var job_type_sel = $('<input>');
                job_type_sel.attr('id', 'job_type_' + job_type.id);
                job_type_sel.attr('type', 'checkbox');
                job_type_sel.attr('name', 'job_types');
                job_type_sel.attr('value', job_type.id);

                job_type_container.append(job_type_sel);

                var job_type_label = $('<label>');
                job_type_label.attr('for', 'job_type_' + job_type.id);
                job_type_label.text(job_type.label);

                job_type_container.append(job_type_label);

                job_types.append(job_type_container);
            });

            job_types_group_container.append(job_types);

            dst_filter_container.append(job_types_group_container);
        });
    };

    function setup_job_statuses_filter() {

        var dst_filter_container = $('.jobs-filter .job-statuses-filter .filter-setter');
            job_statuses = $('<div class="statuses-filters">');

        JobStatuses.forEach(function (job_status) {
            var job_status_container = $('<div class="job-status">');

            var job_status_sel = $('<input>');
            job_status_sel.attr('id', 'job_status_' + job_status.id);
            job_status_sel.attr('type', 'checkbox');
            job_status_sel.attr('name', 'job_statuses');
            job_status_sel.attr('value', job_status.id);

            job_status_container.append(job_status_sel);

            var job_status_label = $('<label>');
            job_status_label.attr('for', 'job_status_' + job_status.id);
            job_status_label.text(job_status.label);

            job_status_container.append(job_status_label);

            job_statuses.append(job_status_container);
        });

        dst_filter_container.append(job_statuses);
    };

    function setup_job_datetimes_filter() {
        jQuery.datetimepicker.setLocale('ru');
        jQuery('.datetimepicker').datetimepicker();
    };

    function setup_tags_filters() {
        $('.jobs-filter .tags-filter').find('.filter-setter textarea').each(function (i, el) {
            $(el).textext({
                plugins : 'tags autocomplete'
            })
            .bind('getSuggestions', function(e, data) {
                  var list = [
                    'Basic',
                    'Closure',
                    'Cobol',
                    'Delphi',
                    'Erlang',
                    'Fortran',
                    'Go',
                    'Groovy',
                    'Haskel',
                    'Java',
                    'JavaScript',
                    'OCAML',
                    'PHP',
                    'Perl',
                    'Python',
                    'Ruby',
                    'Scala'
                ],
                textext = $(e.target).textext()[0],
                query = (data ? data.query : '') || ''
                ;

                $(this).trigger(
                    'setSuggestions',
                    { result : textext.itemManager().filter(list, query) }
                );
            });
        })
    };

    function filterJobs(offset) {
        var form = $('#filters-form'),
            offset = offset || 0;

        if (executing_request) {
            executing_request.cancel();
        }

        executing_request = new Request(form, offset);
        executing_request.run();
    };

    var paginator = Paginator(paginator_container, filterJobs);

    function setup_filters_height() {
        var max_height = 0;
        $('.filter-column').each(function (i, column) {
            max_height = Math.max(max_height, $(column).outerHeight());
        });

        $('.filters').height(max_height);
    }

    setup_job_types_filter();
    setup_job_statuses_filter();
    setup_job_datetimes_filter();
    setup_tags_filters();
    setup_filters_height();
    jobs_updater.run();

    $('.submit_filter_button .button-label').click(function () {
        filterJobs(0);
    });
})();
