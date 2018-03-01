var JobsUpdater = function(update_period) {

    function Timer(cb) {
        this.update_timeout = undefined;
        this.update_period = update_period || 60;
        this.cb = cb;
    };

    Timer.prototype.run = function() {
        var self = this;
        self.reset();
    };

    Timer.prototype.reset = function() {
        var self = this;
        if (self.update_timeout) {
            clearTimeout(self.update_timeout);
            self.update_timeout = undefined;
        }
        self.update_timeout = setTimeout(self.tick.bind(self), self.update_period * 1000);
    };

    Timer.prototype.tick = function() {
        var self = this;
        self.cb();
        self.update_timeout = setTimeout(self.tick.bind(self), self.update_period * 1000);
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
                    var data = response['response'];

                    for (var idx in data) {
                        var state = data[idx];
                        Jobs.model.update(state.id, state);
                    }
                }
            },
            error: function (data) {
            }
        })
    };

    var timer = new Timer(updateJobs);

    return {
        run: timer.run.bind(timer),
        reset: timer.reset.bind(timer),
    }
};

var Jobs = (function () {

    var commands = Commands($('.jobs-containers'));

    function Jobs() {
        this.jobs = {};
        this.eventer = $('<i>');
    };

    Jobs.prototype.update = function(uid, state) {
        if (uid == undefined) {
            console.log('undefined', state);
        }
        if (this.jobs[uid] == undefined) {
            this.jobs[uid] = {};
            this.eventer.trigger("create", [uid, state]);
        }

        this.eventer.trigger("update", [uid, state]);

        // update state
    };

    Jobs.prototype.clear = function() {
        this.jobs = {};
        this.eventer.trigger("clear");
    };

    function JobsView(eventer) {
        this.eventer = eventer;

        this.container = $('.jobs-containers');
        this.cont = this.container.find('#jobs-list');
        this.jobs_status = this.container.attr('job-status');
        this.job_action_pb = $('.job-action-pb');
        this.job_list_empty = $('.job-list-empty');

        var self = this;

        $(document).keydown(function (event) {
            if (event.which == 27) {
                self.closeCmdStatus();
            }
        });

        $(document).mouseup(function (event) {
            self.closeCmdStatus();
        });

        this.container.find('label').on('click', function () {
            var type = $(this).parent().attr('class').substr(5);
            PseudoURL.setParam('type', type).setParam('job_id', null);
            PseudoURL.load();
            return false;
        });
    }

    JobsView.prototype.taskTitle = function(state) {
        var title = '';
        if (state['type'] == 'move_job') {
            title = 'Переезд группы ' + state['group'] + ' ' +
                    'с хоста <span class="composite-line">' + state['src_host'] +
                    ':' + state['src_port'] +
                    (state['src_backend_id'] != undefined ? '/' + state['src_backend_id'] : '') + '</span> ' +
                    'на хост <span class="composite-line">' + state['dst_host'] +
                    ':' + state['dst_port'] +
                    (state['dst_backend_id'] != undefined ? '/' + state['dst_backend_id'] : '') + '</span>';
        } else if (state['type'] == 'recover_dc_job') {
            if (state['couple']) {
                title = 'Восстановление ключей капла ' + state['couple'];
            } else {
                title = 'Восстановление ключей группы ' + state['group'];
            }
            title += ' ' +
                     'на хосте <span class="composite-line">' + state['host'] +
                     ':' + state['port'] +
                     (state['backend_id'] != undefined ? '/' + state['backend_id'] : '') + '</span>' +
                     (state['keys'] ? ', ключей в группах: [' + state['keys'].join(', ') + ']' : '');
        } else if (state['type'] == 'couple_defrag_job') {
            var fragmentation = [],
                efficiency = [],
                namespaces = state['namespaces'] || [];
            state['fragmentation'].forEach(function (data) {
                fragmentation.push(parseFloat(data * 100).toFixed(2) + '%');
            });
            state['efficiency'] = state['efficiency'] || [];
            state['efficiency'].forEach(function (data) {
                efficiency.push(parseFloat(data * 100).toFixed(2) + '%');
            });

            title = 'Дефрагментация капла ' + state['couple'] + ' из ns ['
                + namespaces.join(', ') + '], фрагментация: ['
                + fragmentation.join(', ') + ']' + ', эффективность ['
                + efficiency.join(', ') + ']';
        } else if (state['type'] == 'restore_group_job') {
            title = 'Восстановление группы ' + state['group'];
            if (state['uncoupled_group']) {
                title += ' в пустую группу ' + state['uncoupled_group'];
            }
        } else if (state['type'] == 'move_lrc_groupset_job') {
            title = 'Переезд групп ' + state['lrc_groups'] + ' ' +
                    'с хостов <span class="composite-line">' + state['src_hostnames'] + '</span> ' +
                    'на хосты <span class="composite-line">' + state['dst_hostnames'] + '</span>';
        } else if (state['type'] == 'make_lrc_groups_job') {
            title = 'Создание ' + state['lrc_groups'].length + ' lrc-групп' +
            ' на основе пустых групп ' + '[' + state['uncoupled_groups'].join(', ') + ']';
        } else if (state['type'] == 'make_lrc_reserved_groups_job') {
            title = 'Создание ' + state['lrc_groups'].length + ' резервных lrc-групп' +
            ' на основе пустой группы ' + state['uncoupled_group'];
        } else if (state['type'] == 'add_lrc_groupset_job') {
            var groupset = state['groups'].join(':');
            title = 'Создание lrc-групсета ' + groupset + ' ' +
            'для капла ' + state['couple'];
        } else if (state['type'] == 'add_groupset_to_couple_job') {
            var groupset = state['groups'].join(':');
            var src_groupset = state['src_groups'].join(':');
            title = 'Создание lrc-групсета ' + groupset + ' (' + state['groupset_key'] + ') ' +
            'для капла ' + state['couple'] + ' из групсета ' + src_groupset;
        } else if (state['type'] == 'convert_to_lrc_groupset_job') {
            title = create_convert_to_lrc_groupset_job_label(state);
        } else if (state['type'] == 'restore_lrc_group_job') {
            title = 'Восстановление lrc-группы ' + state['group'] + ' ' +
            'в резервную группу ' + state['lrc_reserve_group'] + ' ' +
            '(lrc-групсет ' + state['lrc_groupset'] + ', ' +
            'капл ' + state['couple'] + ')';
        } else if (state['type'] == 'restore_uncoupled_lrc_group_job') {
            title = 'Восстановление пустой lrc-группы ' + state['group'] + ' ' +
            'в резервную группу ' + state['lrc_reserve_group'] + ' ' +
            '(набор групп ' + state['lrc_groups'] + ')';
        } else if (state['type'] == 'recover_lrc_groupset_job') {
            title = 'Синхронизация lrc-группсета ' + state['lrc_groupset'];
        } else if (state['type'] == 'remove_lrc_groupset_job') {
            title = 'Удаление капла ' + state['couple_to_remove'] + ' из lrc-группсета ' + state['lrc_groupset'];
        } else if (state['type'] == 'ttl_cleanup_job') {
            title = 'Чистка ключей с истёкшим TTL, ';
            if (state['couple'] != undefined) {
                title += 'неймспейс ' + state['namespace'] + ', ';
                title += 'капл ' + state['couple'];
            } else {
                title += 'группа ' + state['iter_group'];
            }
        } else if (state['type'] == 'backend_cleanup_job') {
            title = 'Удаление бекенда ';
            title += 'группы  ' + state['group'];
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
            job_desc = $('<div class="job-description">').appendTo(job_desc_cont),
            job_title = $('<div class="job-title">').appendTo(job_desc),
            job_create_time_label = $('<div class="job-create-time-label">').appendTo(job_desc),
            job_create_time_val = $('<div class="job-create-time-val">').appendTo(job_desc),
            job_start_time_label = $('<div class="job-start-time-label">').appendTo(job_desc),
            job_start_time_val = $('<div class="job-start-time-val">').appendTo(job_desc),
            job_finish_time_label = $('<div class="job-finish-time-label">').appendTo(job_desc),
            job_finish_time_val = $('<div class="job-finish-time-val">').appendTo(job_desc),
            job_delayed_till_time_label = $('<div class="job-delayed-till-time-label">').appendTo(job_desc),
            job_delayed_till_time_val = $('<div class="job-delayed-till-time-val">').appendTo(job_desc),
            job_management = $('<div class="job-management">').appendTo(job_desc),
            job_id = $('<div class="job-id">').appendTo(job_management),
            job_management_btns = $('<div class="job-management-btns">').appendTo(job_management),
            task_list = $('<div class="job-tasklist">').appendTo(job);

        job.attr('uid', uid);

        job_title.html(this.taskTitle(state));

        job_create_time_label.text('Создание:');
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

        job_id.append("<span>id: </span>");
        var job_link = $('<a>');
        job_link.attr('href', '/job/' + uid + '/');
        job_link.text(uid);
        job_link.on('click', function (event) {
            event.stopPropagation();
        });
        job_id.append(job_link);

        var copy_job_id_icon = $('<img width="16" height="16" src="/static/img/copy.png" class="job-id-copy-icon">').appendTo(job_id);
        copy_job_id_icon.attr('alt', 'скопировать в буфер');
        copy_job_id_icon.on('click', function (event) {
            var self = $(this),
                job_link = self.siblings('a')[0];
            copyToClipboard(job_link);
            event.stopPropagation();

            copy_job_id_icon.attr('src', '/static/img/completed.png');
            setTimeout(function () {
                copy_job_id_icon.attr('src', '/static/img/copy.png');
            }, 1000);
        });

        job.appendTo(this.cont);
    };

    JobsView.prototype.createTask = function(task_list, task_state) {
        var task = $('<div class="task">'),
            task_status_icon = $('<div class="task-status-icon">').appendTo(task),
            task_title = $('<div class="task-title">').appendTo(task),
            task_id = $('<div class="task-id">').appendTo(task_title),
            task_maintitle = $('<div class="task-maintitle">').appendTo(task_title),
            task_subtitle = $('<div class="task-subtitle">').appendTo(task_title),
            task_time = $('<div class="task-time">').appendTo(task),
            task_start_time = $('<div class="task-start-time">').appendTo(task_time),
            task_finish_time = $('<div class="task-finish-time">').appendTo(task_time),
            task_retry_time = $('<div class="task-retry-time">').appendTo(task_time),
            task_additional_data = $('<div class="task-additional-info">').appendTo(task),
            task_management = $('<div class="task-management">').appendTo(task);
            task_run_history = $('<div class="task-run-history">').appendTo(task);

        this.renderCustomTaskFields(task_state, task_maintitle, task_subtitle, task_additional_data);

        task_id.append("<span>id: <span>");
        task_id.append('<span class="task-id-label">' + task_state['id'] + "</span>");
        var copy_task_id_icon = $('<img width="16" height="16" src="/static/img/copy.png" class="task-id-copy-icon">').appendTo(task_id);
        copy_task_id_icon.attr('alt', 'скопировать в буфер');
        copy_task_id_icon.on('click', function (event) {
            var self = $(this),
                task_id_label = self.siblings('span.task-id-label')[0];
            copyToClipboard(task_id_label);
            event.stopPropagation();

            copy_task_id_icon.attr('src', '/static/img/completed.png');
            setTimeout(function () {
                copy_task_id_icon.attr('src', '/static/img/copy.png');
            }, 1000);
        });

        task.appendTo(task_list);
    };

    JobsView.prototype.renderError = function (error) {
        var msg = error['msg'];
        if (error.code == 22) {
            msg = 'Некоторые из групп уже участвуют в задаче ' + error.holder_id;
        }
        return msg;
    };

    JobsView.prototype.updateJobBtns = {
        approve: {
            text: 'добро!',
            url: '/json/jobs/approve/{job_id}/',
            postprocess: function (self, state) {
                if (state['status'] == 'not_approved') {
                    var last_error = state['error_msg'][state['error_msg'].length - 1];
                    window.oNotifications.createNotification({
                        title: 'Огого!',
                        text: self.renderError(last_error),
                        onBeforeShow: errorNotification});
                }
            }
        },
        cancel: {
            text: 'отменить',
            url: '/json/jobs/cancel/{job_id}/'
        },
        restart: {
            text: 'начать всё сначала',
            url: '/json/jobs/restart/{job_id}/'
        },
        refinish: {
            text: 'почистить за собой снова',
            url: '/json/jobs/refinish/{job_id}/'
        }
    };

    JobsView.prototype.statusButtons = {
        broken: ['cancel', 'restart', 'refinish'],
        pending: ['cancel', 'restart', 'refinish'],
        not_approved: ['approve', 'cancel']
    };

    JobsView.prototype.renderJobButtons = function(job, uid, job_management_btns, state, force) {
        var self = this;

        if (self.statusButtons[state['status']] == undefined) {
            job_management_btns.empty();
        } else if (job.attr('status') != state['status'] || force) {

            job_management_btns.empty();

            var btn_ids = self.statusButtons[state['status']];
            for (var i = 0; i < btn_ids.length; i++) {

                // special case for restart
                if (btn_ids[i] == 'restart' && state['tasks'][0]['status'] != 'queued') {
                    continue;
                }

                // special case for refinish
                if (btn_ids[i] == 'refinish') {
                    var finished = true;
                    for (var j = 0; j < state['tasks'].length; j++) {
                        if (
                            state['tasks'][j]['status'] != 'completed'
                            && state['tasks'][j]['status'] != 'skipped'
                        ) {
                            finished = false;
                            break;
                        }
                    }
                    if (!finished) {
                        continue;
                    }
                }

                var btn_data = self.updateJobBtns[btn_ids[i]];

                var btn = $('<a href="#" class="task-management-btn">').appendTo(job_management_btns);

                btn.text(btn_data.text);
                function process(btn_data, job_id, job_management_btns) {
                    return function () {
                        job_management_btns.empty();
                        job_management_btns.append(self.job_action_pb.clone());
                        json_ajax({
                            url: btn_data.url.replace('{job_id}', job_id),
                            timeout: 10000,
                            success: function (response) {
                                var new_state = response;
                                self.updateJob({}, new_state.id, new_state);
                                if (btn_data.postprocess) {
                                    btn_data.postprocess(self, new_state);
                                }
                            },
                            error: function (response) {
                                self.renderJobButtons(job, uid, job_management_btns, state, true);
                            }
                        });
                        return false;
                    }
                }
                btn.on('click', process(btn_data, uid, job_management_btns));
            }
        }
    };

    JobsView.prototype.updateJob = function(event, uid, state) {
        var self = this,
            job = this.container.find('.job[uid=' + uid + ']'),
            job_create_time_label = job.find('.job-create-time-label'),
            job_create_time_val = job.find('.job-create-time-val'),
            job_start_time_label = job.find('.job-start-time-label'),
            job_start_time_val = job.find('.job-start-time-val'),
            job_finish_time_label = job.find('.job-finish-time-label'),
            job_finish_time_val = job.find('.job-finish-time-val'),
            job_delayed_till_time_label = job.find('.job-delayed-till-time-label'),
            job_delayed_till_time_val = job.find('.job-delayed-till-time-val'),
            job_management_btns = job.find('.job-management-btns'),
            task_list = job.find('.job-tasklist'),
            status = job.attr('status');

        var job_status_cls = 'job-status-' + state['status'];
        job.removeClass().addClass('job').addClass(job_status_cls);

        // TODO: think about when to do insertAfter
        // and maybe fix this in commands_view.js as well
        if ((this.jobs_status == 'not-approved' &&
             state['status'] != 'not_approved') ||
            (this.jobs_status == 'executing' &&
             state['status'] != 'new' &&
             state['status'] != 'executing') ||
            (this.jobs_status == 'pending' &&
             state['status'] != 'pending' &&
             state['status'] != 'broken') ||
            (this.jobs_status == 'finished' &&
             state['status'] != 'completed' &&
             state['status'] != 'cancelled')) {

            // move this to method or do it inside Jobs.prototype.update
            delete jobs.jobs[state['uid']];
            job.remove();

            return;

        }

        self.renderJobButtons(job, uid, job_management_btns, state);

        this.renderTime(state['create_ts'], job_create_time_label, job_create_time_val);
        this.renderTime(state['start_ts'], job_start_time_label, job_start_time_val);
        this.renderTime(state['finish_ts'], job_finish_time_label, job_finish_time_val);

        var failed_task = undefined;
        for (var i = 0; i < state['tasks'].length; i++) {
            var task = state['tasks'][i];
            if (task['status'] == 'failed') {
                failed_task = task;
                break;
            }
        }

        if (failed_task) {
            if (failed_task['run_history'] && failed_task['run_history'].length) {
                var run_history_length = failed_task['run_history'].length;
                var delayed_till_ts = failed_task['run_history'][run_history_length - 1]['delayed_till_ts'];
                if (delayed_till_ts) {
                    job_delayed_till_time_label.text('Следующая попытка не ранее:');
                    job_delayed_till_time_val.text(format_timestamp(delayed_till_ts));
                } else {
                    job_delayed_till_time_label.text('');
                    job_delayed_till_time_val.text('');
                }
            }
        }

        job.attr('status', state['status']);

        if (state['error_msg'] && state['error_msg'].length) {
            self.updateJobErrors(task_list, state['error_msg'].reverse());
        } else {
            task_list.find('.job-errorlist').remove();
        }

        var tasks = job.find('.task');
        for (idx in state['tasks']) {
            this.updateTask(tasks[idx], state['tasks'][idx], state['status'] == 'pending' || state['status'] == 'broken');
        }
    };

    JobsView.prototype.updateJobErrors = function(task_list, errors) {
        var self = this,
            error_list = task_list.find('.job-errorlist');
        if (error_list.length == 0) {
            error_list = $('<div class="job-errorlist">').prependTo(task_list);
            var error_list_header = $('<div class="job-errorlist-header">').appendTo(error_list),
                error_list_last = $('<div class="job-errorlist-last">').appendTo(error_list),
                more_btn = $('<a href="#" class="job-errorlist-showmore-btn">').appendTo(error_list),
                error_list_more = $('<div class="job-errorlist-more">').appendTo(error_list);
            error_list_more.css('display', 'none');
            error_list_header.text('Ошибки:');

            more_btn.css('display', 'none');
            more_btn.text('...');
            more_btn.on('click', function () {
                error_list_more.css('display', 'block');
                more_btn.remove();
                return false;
            });
        } else {
            var error_list_header = error_list.find('.job-errorlist-header'),
                error_list_last = error_list.find('.job-errorlist-last'),
                more_btn = error_list.find('.job-errorlist-showmore-btn'),
                error_list_more = error_list.find('.job-errorlist-more');
        }

        function make_job_error(error) {
            var job_error = $('<div class="job-error">'),
                job_error_ts = $('<div class="job-error-ts">').appendTo(job_error),
                job_error_msg = $('<div class="job-error-msg">').appendTo(job_error);

            job_error_ts.text(error['ts'] + ':');
            job_error_msg.text(self.renderError(error));
            return job_error;
        }

        var errors_count = error_list_last.children().length + error_list_more.children().length;

        for (var i = errors.length - errors_count - 1; i >= 0; i--) {
            make_job_error(errors[i]).prependTo(error_list_last);
        }

        if (error_list_last.children().length > 5 && error_list_more.css('display') == 'none') {
            more_btn.css('display', 'block');
        }

        var error_list_last_messages = error_list_last.children();
        for (var i = error_list_last_messages.length - 1; i >= 5; i--) {
            $(error_list_last_messages[i]).prependTo(error_list_more);
        }
    };

    JobsView.prototype.updateTask = function(task_div, task_state, manageable) {
        var self = this,
            task = $(task_div),
            job_id = task.parents('.job').attr('uid'),
            task_start_time = task.find('.task-start-time'),
            task_finish_time = task.find('.task-finish-time'),
            task_retry_time = task.find('.task-retry-time'),
            task_additional_data = task.find('.task-additional-info'),
            task_status_icon = task.find('.task-status-icon'),
            task_run_history = task.find('.task-run-history'),
            task_management = task.find('.task-management');

        var task_status_cls = 'task-status-' + task_state['status'];
        task.removeClass().addClass('task').addClass(task_status_cls);

        if (task_state['start_ts']) {
            task_start_time.text('Начало: ' + task_state['start_ts']);
        }
        if (task_state['finish_ts']) {
            task_start_time.text('Конец:' + task_state['finish_ts']);
        }

        if (task_state['run_history'] && task_state['run_history'].length) {
            var run_history_length = task_state['run_history'].length;
            var delayed_till_ts = task_state['run_history'][run_history_length - 1]['delayed_till_ts'];
            if (delayed_till_ts) {
                task_retry_time.text('Следующая попытка не ранее: ' + format_timestamp(delayed_till_ts));
            } else {
                task_retry_time.text('');
            }
        }

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

                var visible = true;

                json_ajax({
                    url: '/json/commands/status/' + task_state['minion_cmd_id'] + '/',
                    timeout: 10000,
                    success: function (cmd_status) {

                        commands.view.createCmd(undefined, task_state['host'], task_state['id'], cmd_status, task_cmd_state);
                        commands.view.updateCmd(undefined, task_state['host'], task_state['id'], cmd_status);

                        var closeBtn = $('<div>').addClass('close')
                            .on('click', function () {
                                task_cmd_state.remove();
                                visible = false;
                            })
                            .text('X')
                            .appendTo(task_cmd_state);

                        task_cmd_state.mouseup(function (e) {
                            e.stopPropagation();
                        });

                        function updateCmdStatus() {

                            if (cmd_status.progress < 1.0) {
                                // setting cmd status updater

                                json_ajax({
                                    url: '/json/commands/status/' + task_state['minion_cmd_id'] + '/',
                                    timeout: 3000,
                                    success: function (cmd_status) {
                                        commands.view.updateCmd(undefined, task_state['host'], task_state['id'], cmd_status);
                                        if (visible) {
                                            setTimeout(updateCmdStatus, 3000);
                                        }
                                    },
                                    error: function () {
                                        if (visible) {
                                            setTimeout(updateCmdStatus, 3000);
                                        }
                                    }
                                });

                            }
                        }

                        setTimeout(updateCmdStatus, 3000);
                    }
                });

                return false;
            });
        }

        if (task_state['status'] == 'failed' && manageable) {
            if (task_management.children().length == 0) {
                var retry_btn = $('<a href="#" class="task-management-btn">').appendTo(task_management),
                    // br = $('<br>').appendTo(task_management),
                    skip_btn = $('<a href="#" class="task-management-btn">').appendTo(task_management);
                retry_btn.text('перезапустить');
                skip_btn.text('пропустить');

                function applyAction(action, job_id, task_id) {
                    return function () {
                        json_ajax({
                            url: '/json/jobs/' + action + '/' + job_id + '/' + task_id + '/',
                            timeout: 10000,
                            success: function (state) {
                                self.updateJob({}, state.id, state);
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
        
        if (task_state['run_history'].length) {
            if (task_run_history.find('.history-icon').length == 0) {
                var history_icon = $('<img src="/static/img/history.png" class="history-icon">').appendTo(task_run_history);

                history_icon.click(function () {

                    self.closeCmdStatus();

                    var history_list = $('<div class="list">').appendTo(task_run_history);

                    var closeBtn = $('<div>').addClass('close')
                        .on('click', function () {
                            history_list.remove();
                        })
                        .text('X')
                        .appendTo(history_list);

                    task_run_history.mouseup(function (e) {
                        e.stopPropagation();
                    });

                    var table = $('<table>').appendTo(history_list);

                    var header_row = $('<tr>').appendTo(table);
                    $('<td>начало</td>').appendTo(header_row);
                    $('<td>конец</td>').appendTo(header_row);
                    $('<td>потрачено</td>').appendTo(header_row);
                    $('<td>exit code</td>').appendTo(header_row);
                    $('<td>артефакты</td>').appendTo(header_row);
                    $('<td>cледующий запуск</td>').appendTo(header_row);

                    task_state['run_history'].forEach(function (record) {
                        var row = $('<tr>');
                        $('<td>').text(format_timestamp(record['start_ts'])).appendTo(row);
                        $('<td>').text(format_timestamp(record['finish_ts'])).appendTo(row);
                        $('<td class="record-spent-time">').text(convertTimeUnits(record['finish_ts'] - record['start_ts'])).appendTo(row);

                        var exit_code = $('<td class="record-exit-code">').appendTo(row);
                        if (record['exit_code'] != 0) exit_code.text(record['exit_code']);

                        var artifacts = $('<td>').appendTo(row);
                        if (record['artifacts']) {
                            var artifacts_switch = $('<a href="#" class="cmd-std">посмотреть</a>');
                            var artifacts_row = $('<tr class="artifacts-content">');
                            artifacts_switch.appendTo(artifacts);
                            artifacts_switch.click(function () {
                                if (artifacts_row.css('display') == 'table-row') {
                                    artifacts_row.css('display', 'none');
                                } else {
                                    artifacts_row.css('display', 'table-row');
                                }
                                return false;
                            });
                        }

                        var delayed_till_ts = $('<td>').appendTo(row);
                        if (record['delayed_till_ts']) {
                            delayed_till_ts.text(format_timestamp(record['delayed_till_ts']));
                        }

                        row.appendTo(table);

                        if (record['artifacts']) {
                            var artifacts_col = $('<td colspan="6">').appendTo(artifacts_row);

                            if (record['error_msg']) {
                                $('<td>').text('Ошибка: ' + record['error_msg']).appendTo(artifacts_col);
                            }
                            $('<textarea class="artifacts">').text(JSON.stringify(record['artifacts'], null, 4)).appendTo(artifacts_col);

                            artifacts_row.appendTo(table);
                        }
                    });
                });
            }
        }
    };

    JobsView.prototype.renderCustomTaskFields = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        if (task_state['type'] == 'minion_cmd'
            || task_state['type'] == 'node_stop_task'
            || task_state['type'] == 'node_backend_defrag_task'
            || task_state['type'] == 'new_node_backend_defrag_task'
            || task_state['type'] == 'recover_dc_group_task'
            || task_state['type'] == 'external_storage'
            || task_state['type'] == 'lrc_recovery'
            || task_state['type'] == 'rsync_backend_task'
            || task_state['type'] == 'lrc_tools'
            || task_state['type'] == 'lrc_list'
        ) {
            this.renderMinionCmdFields(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'history_remove_node') {
            this.renderHistoryRemoveNodeFields(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'couple_defrag_state_check') {
            this.renderCoupleDefragStateCheck(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'create_group') {
            this.renderCreateGroup(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'remove_group') {
            this.renderRemoveGroup(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'dnet_client_backend_cmd') {
            this.renderDnetClientBackendCmd(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'write_meta_key') {
            this.renderWriteMetaKey(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'wait_groupset_state') {
            this.renderWaitGroupsetState(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'wait_backend_state') {
            this.renderWaitBackendState(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'change_couple_frozen_status') {
            this.renderChangeCoupleFrozenStatus(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'change_groupset_frozen_status') {
            this.renderChangeGroupsetFrozenStatus(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'external_storage_data_size') {
            this.renderExternalStorageDataSize(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'write_external_storage_mapping') {
            this.renderWriteExternalStorageMapping(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'change_couple_settings') {
            this.renderChangeCoupleSettings(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'move_path') {
            this.renderMovePath(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'mark_backend' || task_state['type'] == 'unmark_backend') {
            this.renderMarkBackend(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'remove_path') {
            this.renderRemovePath(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'create_group_file' || task_state['type'] == 'remove_group_file') {
            this.renderCreateGroupFile(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'create_ids_file') {
            this.renderCreateIdsFile(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'create_file_marker') {
            this.renderCreateFileMarker(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'check_file_system') {
            this.renderCheckFileSystem(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'check_groupset') {
            this.renderCheckGroupset(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'add_couple_meta_info') {
            this.renderAddCoupleMetaInfo(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'remove_couple_meta_info') {
            this.renderRemoveCoupleMetaInfo(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'create_groupset') {
            this.renderCreateGroupset(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'check_group_location') {
            this.renderCheckGroupLocation(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else if (task_state['type'] == 'history_remove_groupset') {
            this.renderHistoryRemoveGroupset(task_state, task_maintitle, task_subtitle, task_additional_data);
        } else {
            console.log('Unknown task type: ' + task_state['type']);
        }
    };

    JobsView.prototype.renderMinionCmdFields = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var cmdTitle = task_state['cmd'];
        if (task_state['params']['merged_to']) {
            cmdTitle += ', слияние группы ' + task_state['params']['group'] +
                ' c группой ' + task_state['params']['merged_to'];
        }
        task_maintitle.text(cmdTitle);
        task_maintitle.attr('title', task_state['cmd']);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    };

    JobsView.prototype.closeCmdStatus = function () {
        this.container.find('.task-cmd-stat .close').click();
        this.container.find('.task-run-history .close').click();
    };

    JobsView.prototype.renderHistoryRemoveNodeFields = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var cleantitle = 'отвязывание ноды ' + task_state['host'] + ':' +
                        task_state['port'] + ' от группы ' + task_state['group'];
        if (task_state['backend_id'] != undefined) {
            cleantitle = 'отвязывание бэкенда ' + task_state['host'] + ':' +
                        task_state['port'] + '/' + task_state['backend_id'] + ' от группы ' + task_state['group'];
        }
        task_maintitle.html(cleantitle);
        task_maintitle.attr('title', cleantitle);
        task_subtitle.text('очистка истории');
    }

    JobsView.prototype.renderCoupleDefragStateCheck = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var cleantitle = 'ожидание окончания дефрагментации групп';
        task_maintitle.html(cleantitle);
        task_maintitle.attr('title', cleantitle);
    }

    JobsView.prototype.renderCreateGroup = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var cleantitle = 'Создание группы ' + task_state['group'] +
            ' размером ' + prefixBytesRound(task_state['params']['total_space']);
        task_maintitle.html(cleantitle);
        task_maintitle.attr('title', cleantitle);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderRemoveGroup = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var cleantitle = 'Удаление группы ' + task_state['group'];
        task_maintitle.html(cleantitle);
        task_maintitle.attr('title', cleantitle);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderDnetClientBackendCmd = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        if (task_state['params']['dnet_client_command'] == 'enable') {
            var title = 'Запуск бэкенда ';
            if (task_state['params']['backend_id']) {
                title += task_state['params']['backend_id'];
            } else if (task_state['params']['group']) {
                title += 'группы ' + task_state['params']['group'];
            }
        } else if (task_state['cmd']) {
            var title = task_state['cmd'];
        }
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderWriteMetaKey = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = 'Запись мета-ключа в группу ' + task_state['group'];
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderWaitGroupsetState = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = 'Ожидание групсета ' + task_state['groupset'];
        if (task_state['groupset_statuses']) {
            title += ', ожидаемые статусы ' + task_state['groupset_statuses'];
        } else if (task_state['groupset_status']) {
            title += ', требуемый статус ' + task_state['groupset_status'];
        }
        if (task_state['sleep_period']) {
            title += ' (ожидание ' + convertTimeUnits(task_state['sleep_period']) + ')';
        }
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderWaitBackendState = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';
        if (task_state['missing']) {
            title += 'Ожидание отключения бекенда ';
        } else {
            title += 'Ожидание бекенда ';
        }

        title += task_state['backend'];

        if (task_state['backend_statuses']) {
            title += ', ожидаемые статусы ' + task_state['backend_statuses'];
        }
        if (task_state['sleep_period']) {
            title += ' (ожидание ' + convertTimeUnits(task_state['sleep_period']) + ')';
        }
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderChangeCoupleSettings = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';
        if (task_state['update']) {
            title += 'Обновление ';
        } else {
            title += 'Установка ';
        }
        title += 'настроек капла ' + task_state['couple'];

        if (task_state['settings']['read_preference']) {
            title += ', приоритеты чтения: [' + task_state['settings']['read_preference'].join(', ') + ']';
        }

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderMovePath = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Переименование директории ' + task_state['params']['move_src'];
        title += ' в ' + task_state['params']['move_dst'];

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderMarkBackend = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        if (task_state['type'] == 'mark_backend') {
            title += 'Создание ';
            title += 'lock файла ' + task_state['params']['mark_backend'];
        } else if (task_state['type'] == 'unmark_backend') {
            title += 'Удаление ';
            title += 'lock файла ' + task_state['params']['unmark_backend'];
        } else {
            console.log('Unknown task type: ' + task_state['type']);
        }

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderRemovePath = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Удаление директории ' + task_state['params']['remove_path'];

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderCreateGroupFile = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        if (task_state['type'] == 'create_group_file') {
            title += 'Запись группы ' + task_state['params']['group'] + ' в ' + task_state['params']['group_file'];
        } else if (task_state['type'] == 'remove_group_file') {
            title += 'Удаление файла группы ' + task_state['params']['remove_group_file'];
        } else {
            console.log('Unknown task type: ' + task_state['type']);
        }

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderCreateIdsFile = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Запись ids файла ' + task_state['params']['ids'];

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderCreateFileMarker = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Запись файла ' + task_state['params']['group_file_marker'];
        title += ' для переехавшей группы ' + task_state['params']['group'];

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderCheckFileSystem = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Проверка файловой системы ' + task_state['params']['backend_path'];

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderCheckGroupset = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Проверка групсета ' + task_state['groupset'];
        if (task_state['check_consistency']) {
            title += ' на консистентность ключей';
        }

        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderAddCoupleMetaInfo = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Добавление мета-информации о капле ' + task_state['couple_meta_info']['couple_id'];
        title += ' в групсет ' + task_state['groupset'];
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderRemoveCoupleMetaInfo = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Удаление мета-информации о капле ' + task_state['couple'];
        title += ' из групсета ' + task_state['groupset'];
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderCreateGroupset = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Создание групсета ' + task_state['groupset'] + ' типа ' + task_state['groupset_type'];
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderCheckGroupLocation = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';

        title += 'Соответствие группы ' + task_state['group'];
        title += ' бекенду ' + task_state['params']['backend'];
        if (task_state['params']['base_path']) {
            title += ' (путь ' + task_state['params']['base_path'] + ')';
        }
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderHistoryRemoveGroupset = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = 'удаление групсета ' + task_state['groupset'] + ' из истории групп';
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.text('очистка истории');
    }

    JobsView.prototype.renderChangeCoupleFrozenStatus = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';
        if (task_state['frozen']) {
            title += 'Заморозка капла ';
        } else {
            title += 'Разморозка капла ';
        }
        title += task_state['couple'];
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderChangeGroupsetFrozenStatus = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = '';
        if (task_state['frozen']) {
            title += 'Заморозка групсета ';
        } else {
            title += 'Разморозка групсета ';
        }
        title += task_state['groupset'];
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.renderExternalStorageDataSize = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = 'Определение размера данных';
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
        task_subtitle.html('таск миньона на хосте <span class="composite-line">' +
            task_state['host'] + '</span>');
    }

    JobsView.prototype.renderWriteExternalStorageMapping = function(task_state, task_maintitle, task_subtitle, task_additional_data) {
        var title = 'Запись соответствия капла и внешнего хранилища';
        if (task_state['couples'] != undefined && task_state['couples'].length > 1) {
            title = 'Запись соответствия каплов и внешнего хранилища';
        }
        task_maintitle.html(title);
        task_maintitle.attr('title', title);
    }

    JobsView.prototype.updateContainers = function() {
        var containers = [this.cont];
        for (var idx in containers) {
            var container = containers[idx];

            if (container.find('.job').length != 0 &&
                container.find('.job-list-empty').length != 0) {
                container.find('.job-list-empty').remove();
            } else if (container.find('.job').length == 0 &&
                       container.find('.job-list-empty').length == 0) {
                container.append(this.job_list_empty.clone());
            }
        }
    };

    JobsView.prototype.clearJobs = function(event) {
        var self = this,
            jobs = this.container.find('.job');

        jobs.remove();
    };

    var jobs = new Jobs();
    var view = new JobsView(jobs.eventer);

    view.eventer.on("create", view.createJob.bind(view));
    view.eventer.on("update", view.updateJob.bind(view));
    view.eventer.on("clear", view.clearJobs.bind(view));

    return {
        model: jobs,
        view: view
    }
})();
