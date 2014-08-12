var Jobs = (function () {

    var commands = Commands($('.jobs-containers'));

    function Jobs() {
        this.jobs = {};
        this.eventer = $('<i>');
    };

    Jobs.prototype.update = function(uid, state) {
        if (this.jobs[uid] == undefined) {
            this.jobs[uid] = {};
            this.eventer.trigger("create", [uid, state]);
        }

        this.eventer.trigger("update", [uid, state]);

        // update state
    };

    function JobsView(eventer) {
        this.eventer = eventer;

        this.container = $('.jobs-containers');
        this.not_approved_cont = this.container.find('.jobs-not-approved');
        this.not_approved_header = this.not_approved_cont.find('.jobs-header');
        this.executing_cont = this.container.find('.jobs-executing');
        this.executing_header = this.executing_cont.find('.jobs-header');
        this.finished_cont = this.container.find('.jobs-finished');
        this.finished_header = this.finished_cont.find('.jobs-header');

        var self = this;

        $(document).keydown(function (event) {
            if (event.which == 27) {
                self.closeCmdStatus();
            }
        });

        $(document).mouseup(function (event) {
            self.closeCmdStatus();
        });
    }

    JobsView.prototype.taskTitle = function(state) {
        var title = '';
        if (state['type'] == 'move_job') {
            title = 'Переезд группы ' + state['group'] + ' ' +
                    'с хоста <span class="composite-line">' + state['src_hostname'] +
                    ':' + state['src_port'] +
                    '<span class="composite-line-sub">' + state['src_host'] + '</span></span> ' +
                    'на хост <span class="composite-line">' + state['dst_hostname'] +
                    ':' + state['dst_port'] + '<span class="composite-line-sub">' +
                    state['dst_host'] + '</span></span>';
        }
        return title;
    };

    JobsView.prototype.renderTime = function(value, label_field, value_field) {
        if (value != null) {
            label_field.css({visibility: 'visible'});
            value_field.css({visibility: 'visible'});
            value_field.text(value);
        } else {
            label_field.css({visibility: 'hidden'});
            value_field.css({visibility: 'hidden'});
        }
    };

    JobsView.prototype.createJob = function(event, uid, state) {

        var job = $('<div class="job">'),
            job_desc_cont = $('<div class="job-description-container">').appendTo(job)
            job_management = $('<div class="job-management">').appendTo(job_desc_cont),
            job_desc = $('<div class="job-description">').appendTo(job_desc_cont),
            job_title = $('<div class="job-title">').appendTo(job_desc),
            job_start_time_label = $('<div class="job-start-time-label">').appendTo(job_desc),
            job_start_time_val = $('<div class="job-start-time-val">').appendTo(job_desc),
            job_finish_time_label = $('<div class="job-finish-time-label">').appendTo(job_desc),
            job_finish_time_val = $('<div class="job-finish-time-val">').appendTo(job_desc),
            job_id = $('<div class="job-id">').appendTo(job_desc),
            task_list = $('<div class="job-tasklist">').appendTo(job);

        job.attr('uid', uid);

        job_title.html(this.taskTitle(state));

        job_start_time_label.text('Начало:');
        job_finish_time_label.text('Конец:');

        // job_desc.dblclick(function (e) { console.log(e); e.preventDefault(); });
        job_desc_cont.on('click', function (task_list) { return function () {
            if (task_list.css('display') == 'block') {
                task_list.css('display', 'none');
            } else {
                task_list.css('display', 'block');
            }
            return false;
        }}(task_list));

        for (idx in state['tasks']) {
            this.createTask(task_list, state['tasks'][idx]);
        }

        job_id.text('id: ' + uid);

        job.appendTo(this.executing_cont);
    };

    JobsView.prototype.createTask = function(task_list, task_state) {
        var task = $('<div class="task">'),
            task_status_icon = $('<div class="task-status-icon">').appendTo(task),
            task_title = $('<div class="task-title">').appendTo(task),
            task_maintitle = $('<div class="task-maintitle">').appendTo(task_title),
            task_subtitle = $('<div class="task-subtitle">').appendTo(task_title),
            task_time = $('<div class="task-time">').appendTo(task),
            task_start_time_label = $('<div class="task-start-time-label">').appendTo(task_time),
            task_start_time_val = $('<div class="task-start-time-value">').appendTo(task_time),
            task_finish_time_label = $('<div class="task-finish-time-label">').appendTo(task_time),
            task_finish_time_val = $('<div class="task-finish-time-value">').appendTo(task_time),
            task_additional_data = $('<div class="task-additional-info">').appendTo(task),
            task_management = $('<div class="task-management">').appendTo(task);

        task_start_time_label.text('Начало:');
        task_finish_time_label.text('Конец:');

        this.renderCustomTaskFields(task_state, task_maintitle, task_subtitle, task_additional_data);

        task.appendTo(task_list);
    };

    JobsView.prototype.updateJob = function(event, uid, state) {
        var job = this.container.find('.job[uid=' + uid + ']'),
            job_start_time_label = job.find('.job-start-time-label'),
            job_start_time_val = job.find('.job-start-time-val'),
            job_finish_time_label = job.find('.job-finish-time-label'),
            job_finish_time_val = job.find('.job-finish-time-val'),
            job_management = job.find('.job-management'),
            task_list = job.find('.job-tasklist');

        var job_status_cls = 'job-status-' + state['status'];
        job.removeClass().addClass('job').addClass(job_status_cls);

        // TODO: think about when to do insertAfter
        // and maybe fix this in commands_view.js as well
        if (state['status'] == 'completed' || state['status'] == 'cancelled') {
            if (!job.parent().hasClass('jobs-finished')) {
                job_management.css('visibility', 'visible');
                job.insertAfter(this.finished_header);
            }
        } else if (state['status'] == 'not_approved') {
            if (!job.parent().hasClass('jobs-not-approved')) {
                job_management.css('visibility', 'visible');
                job.insertAfter(this.not_approved_header);
            }
        } else {
            if (!job.parent().hasClass('jobs-executing')) {
                job_management.css('visibility', 'visible');
                job.insertAfter(this.executing_header);
            }
        }

        if (state['status'] != 'broken' && state['status'] != 'pending' && state['status'] != 'not_approved') {
            job_management.empty();
        } else {

            if (state['status'] == 'not_approved' && job_management.find('.job-approve-btn').length == 0) {

                job_management.empty();

                var approve_btn = $('<a href="#" class="task-management-btn job-approve-btn">').appendTo(job_management);
                approve_btn.text('добро!');

                function approveJob(job_id, job_management) {
                    return function () {
                        job_management.css('visibility', 'hidden');
                        $.ajax({
                            url: '/json/jobs/approve/' + job_id + '/',
                            data: {ts: new Date().getTime()},
                            timeout: 3000,
                            dataType: 'json',
                            success: function (response) {
                                if (response['status'] == 'success') {
                                    var state = response['response'];
                                    self.updateJob({}, state.id, state);
                                }
                            },
                            error: function (response) {
                                job_management.css('visibility', 'visible');
                            }
                        });
                        return false;
                    }
                }

                approve_btn.on('click', approveJob(uid, job_management));

                $('<br>').appendTo(job_management);
            }

            // console.log(state['status']);
            // console.log(job_management.children().length);
            if (job_management.find('.job-cancel-btn').length == 0) {

                var cancel_btn = $('<a href="#" class="task-management-btn job-cancel-btn">').appendTo(job_management);
                cancel_btn.text('отменить');

                function cancelJob(job_id, job_management) {
                    return function () {
                        job_management.css('visibility', 'hidden');
                        $.ajax({
                            url: '/json/jobs/cancel/' + job_id + '/',
                            data: {ts: new Date().getTime()},
                            timeout: 3000,
                            dataType: 'json',
                            success: function (response) {
                                if (response['status'] == 'success') {
                                    var state = response['response'];
                                    self.updateJob({}, state.id, state);
                                }
                            },
                            error: function (response) {
                                job_management.css('visibility', 'visible');
                            }
                        });
                        return false;
                    }
                }

                cancel_btn.on('click', cancelJob(uid, job_management));
            }

        }

        this.updateContainers();

        this.renderTime(state['start_ts'], job_start_time_label, job_start_time_val);
        this.renderTime(state['finish_ts'], job_finish_time_label, job_finish_time_val);

        task_list.find('.job-errorlist').remove();

        if (state['error_msg'] && state['error_msg'].length) {
            task_list.find('.job-errorlist').remove();
            var error_list = $('<div class="job-errorlist">').prependTo(task_list),
                error_list_header = $('<div class="job-errorlist-header">').appendTo(error_list);

            error_list_header.text('Ошибки:');

            for (var i = 0; i < state['error_msg'].length; i++) {
                var job_error = $('<div class="job-error">'),
                    job_error_ts = $('<div class="job-error-ts">').appendTo(job_error),
                    job_error_msg = $('<div class="job-error-msg">').appendTo(job_error);

                job_error_ts.text(state['error_msg'][i]['ts']);
                job_error_msg.text(state['error_msg'][i]['msg']);

                error_list.append(job_error);
            }
        }

        var tasks = job.find('.task');
        for (idx in state['tasks']) {
            this.updateTask(tasks[idx], state['tasks'][idx], state['status'] == 'pending' || state['status'] == 'broken');
        }
    };

    JobsView.prototype.updateTask = function(task_div, task_state, manageable) {
        var self = this,
            task = $(task_div),
            job_id = task.parents('.job').attr('uid'),
            task_start_time_label = task.find('.task-start-time-label'),
            task_start_time_val = task.find('.task-start-time-value'),
            task_finish_time_label = task.find('.task-finish-time-label'),
            task_finish_time_val = task.find('.task-finish-time-value'),
            task_additional_data = task.find('.task-additional-info'),
            task_status_icon = task.find('.task-status-icon'),
            task_management = task.find('.task-management');

        var task_status_cls = 'task-status-' + task_state['status'];
        task.removeClass().addClass('task').addClass(task_status_cls);

        this.renderTime(task_state['start_ts'], task_start_time_label, task_start_time_val);
        this.renderTime(task_state['finish_ts'], task_finish_time_label, task_finish_time_val);

        var icon_hint = '';
        switch (task_state['status']) {
            case 'unknown': icon_hint = 'странный'; break;
            case 'queued': icon_hint = 'в очереди'; break;
            case 'executing': icon_hint = 'обрабатывается'; break;
            case 'failed': icon_hint = 'сломалось'; break;
            case 'skipped': icon_hint = 'пропущено'; break;
            case 'completed': icon_hint = 'готово'; break;
        }
        task_status_icon.attr('title', icon_hint);

        if (task_state['minion_cmd_id'] && task_additional_data.find('.task-cmd-status').length == 0) {
            var cmd_view = $('<a href="#" class="task-cmd-status">').appendTo(task_additional_data),
                self = this;

            cmd_view.text('статус');

            cmd_view.on('click', function () {

                self.closeCmdStatus();

                var task_cmd_state = $('<div class="task-cmd-stat">').appendTo(task_additional_data);

                $.ajax({
                    url: '/json/commands/status/' + task_state['minion_cmd_id'] + '/',
                    data: {ts: new Date().getTime()},
                    timeout: 3000,
                    dataType: 'json',
                    success: function (response) {

                        if (response['status'] == 'success') {
                            var cmd_status = response['response'];
                            commands.view.createCmd(undefined, task_state['host'], task_state['id'], cmd_status, task_cmd_state);
                            commands.view.updateCmd(undefined, task_state['host'], task_state['id'], cmd_status);

                            var closeBtn = $('<div>').addClass('close')
                                .on('click', function () { task_cmd_state.remove(); })
                                .text('X')
                                .appendTo(task_cmd_state);

                            task_cmd_state.mouseup(function (e) {
                                e.stopPropagation();
                            });

                            function updateCmdStatus() {

                                if (cmd_status.progress < 1.0) {
                                    // setting cmd status updater

                                    $.ajax({
                                        url: '/json/commands/status/' + task_state['minion_cmd_id'] + '/',
                                        data: {ts: new Date().getTime()},
                                        timeout: 3000,
                                        dataType: 'json',
                                        success: function (response) {
                                            if (response['status'] == 'success') {
                                                cmd_status = response['response'];
                                                commands.view.updateCmd(undefined, task_state['host'], task_state['id'], cmd_status);
                                            }
                                            setTimeout(updateCmdStatus, 3000);
                                        },
                                        error: function () {
                                            setTimeout(updateCmdStatus, 3000);
                                        }
                                    });

                                }
                            }

                            setTimeout(updateCmdStatus, 3000);
                        }
                    }
                });

                return false;
            });
        }

        if (task_state['status'] == 'failed' && manageable) {
            if (task_management.children().length == 0) {
                var retry_btn = $('<a href="#" class="task-management-btn">').appendTo(task_management),
                    br = $('<br>').appendTo(task_management),
                    skip_btn = $('<a href="#" class="task-management-btn">').appendTo(task_management);
                retry_btn.text('перезапустить');
                skip_btn.text('пропустить');

                function applyAction(action, job_id, task_id) {
                    return function () {
                        $.ajax({
                            url: '/json/jobs/' + action + '/' + job_id + '/' + task_id + '/',
                            data: {ts: new Date().getTime()},
                            timeout: 3000,
                            dataType: 'json',
                            success: function (response) {
                                if (response['status'] == 'success') {
                                    var state = response['response'];
                                    self.updateJob({}, state.id, state);
                                }
                            }
                        });
                        return false;
                    }
                }

                retry_btn.on('click', applyAction('retry', job_id, task_state.id));
                skip_btn.on('click', applyAction('skip', job_id, task_state.id));
            }
        } else {
            task_management.empty()
        }
    };

    JobsView.prototype.renderCustomTaskFields = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        if (task_state['type'] == 'minion_cmd' || task_state['type'] == 'node_stop_task') {
            this.renderMinionCmdFields(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'history_remove_node') {
            this.renderHistoryRemoveNodeFields(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else {
            console.log('Unknown task type: ' + task_state['type']);
        }
    };

    JobsView.prototype.renderMinionCmdFields = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        task_maintitle.text(task_state['cmd']);
        task_maintitle.attr('title', task_state['cmd']);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['hostname'] + '<span class="composite-line-sub">' +
            task_state['host'] + '</span></span>');
    };

    JobsView.prototype.closeCmdStatus = function () {
        this.container.find('.task-cmd-stat').remove();
    };

    JobsView.prototype.renderHistoryRemoveNodeFields = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var cleantitle = 'отвязывание ноды ' + task_state['hostname'] + ':' +
                        task_state['port'] + ' (' + task_state['host'] + ') ' +
                        'от группы ' + task_state['group'];
        task_maintitle.html(cleantitle);
        task_maintitle.attr('title', cleantitle);
        task_subtitle.text('очистка истории');
    }

    JobsView.prototype.updateContainers = function() {
        var containers = [this.not_approved_cont, this.executing_cont, this.finished_cont];
        for (var idx in containers) {
            var container = containers[idx];

            if (container.find('.job').length) {
                container.css({display: 'block'});
            } else {
                container.css({display: 'none'});
            }
        }
    };


    var jobs = new Jobs();
    var view = new JobsView(jobs.eventer);

    view.eventer.on("create", view.createJob.bind(view));
    view.eventer.on("update", view.updateJob.bind(view));


    return {
        model: jobs,
        view: view
    }
})();