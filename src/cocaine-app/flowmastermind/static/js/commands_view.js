var Commands = (function() {

    function Commands() {
        this.hosts = {};
        this.eventer = $('<i>');
    };

    Commands.prototype.update = function(host, uid, status) {
        if (this.hosts[host] == undefined) {
            this.hosts[host] = {};
        }

        if (this.hosts[host][uid] == undefined) {
            this.hosts[host][uid] = {};
            this.eventer.trigger("create", [host, uid, status]);
        }

        if (this.hosts[host][uid].progress != status.progress) {
            this.hosts[host][uid] = status;
            this.eventer.trigger("update", [host, uid, status]);
        }
    }

    commands = new Commands();


    function CommandsView() {
        this.eventer = commands.eventer;

        this.container = $('.cmd-containers');
        this.unknown_cont = $('.cmd-unknown');
        this.executing_cont = $('.cmd-executing');
        this.executing_header = this.executing_cont.find('.cmd-header');
        this.finished_cont = $('.cmd-finished');
        this.finished_header = this.finished_cont.find('.cmd-header');

        this.progress = {};
    };

    CommandsView.prototype.createCmd = function(event, host, uid, status) {

        var cmd = $('<div class="cmd">'),
            cmd_level_one = $('<div>').appendTo(cmd),
            cmd_group = $('<div class="cmd-group">').appendTo(cmd),
            cmd_command = $('<div class="cmd-command">').appendTo(cmd),
            cmd_progress = $('<div class="cmd-progress">'). appendTo(cmd),
            cmd_progress_bar = $('<div class="progressBar">').appendTo(cmd_progress),
            cmd_progress_bar_div = $('<div>').appendTo(cmd_progress_bar),
            cmd_pid = $('<div class="cmd-pid">').appendTo(cmd),
            cmd_level_two = $('<div>').appendTo(cmd)
            cmd_host = $('<div class="cmd-host">').appendTo(cmd),
            cmd_startdt = $('<div class="cmd-startdt">').appendTo(cmd),
            cmd_mdashdt = $('<div class="cmd-mdash">').appendTo(cmd),
            cmd_finishdt = $('<div class="cmd-finishdt">').appendTo(cmd),
            cmd_runtime = $('<div class="cmd-runtime">').appendTo(cmd),
            cmd_uid = $('<div class="cmd-uid">').appendTo(cmd);

        cmd.attr('uid', uid);
        cmd.attr('host', host);
        cmd.attr('group', status.group);
        cmd.attr('stage', 'unknown');
        cmd.css({display: 'none'});

        this.initCmd(cmd, host, uid, status);

        host_txt = host;
        if (status['hostname'] != undefined) {
            host_txt = status['hostname'] + '<br />' + host_txt;
        }
        cmd_host.html(host_txt);
        cmd_uid.text(uid);

        cmd.appendTo(this.unknown_cont);
    }

    CommandsView.prototype.updateCmd = function(event, host, uid, status) {
        console.log("Updating command for host " + host);

        console.log(status);

        var cmd = this.container.find('.cmd[uid='+uid+']'),
            cmd_progress = cmd.find('.progressBar'),
            cmd_mdash = cmd.find('.cmd-mdash'),
            cmd_finishdt = cmd.find('.cmd-finishdt'),
            cmd_runtime = cmd.find('.cmd-runtime');

        if (status.progress < 1.0 && cmd.attr('stage') != 'executing') {
            cmd.attr('stage', 'executing');
            cmd.css({display: 'block'});

            console.log('appending to executing');
            cmd.insertAfter(this.executing_header);

            this.updateContainers();

        } else if (status.progress == 1.0 && cmd.attr('stage') != 'finished') {
            cmd.attr('stage', 'finished');
            cmd.css({display: 'block'});

            cmd.insertAfter(this.finished_header);

            if (status.exit_code != 0) {
                this.addErrorData(cmd, status);
            }

            cmd_mdash.text('—');
            cmd_finishdt.text(dateToStr(new Date(status.finish_ts * 1000)));

            this.updateContainers();
        }

        var progressVal = Math.round(status.progress * 100 * 100) / 100;
        console.log(progressVal);
        progress(progressVal, cmd_progress);
    }

    function progress(percent, $element) {
        var progressBarWidth = percent;
        $element.find('div').animate({ width: progressBarWidth + '%' }, 500).html(percent + "%&nbsp;");
    }

    CommandsView.prototype.initCmd = function(cmd, host, uid, status) {
        var cmd_group = cmd.find('.cmd-group'),
            cmd_command = cmd.find('.cmd-command'),
            cmd_pid = cmd.find('.cmd-pid'),
            cmd_host = cmd.find('.cmd-host'),
            cmd_startdt = cmd.find('.cmd-startdt'),
            cmd_progress = cmd.find('.cmd-progress'),
            cmd_uid = cmd.find('.cmd-uid');

        group_txt = 'Группа: ' + status.group;
        if (status['couple'] != undefined) {
            group_txt += '<br /><span class="cmd-couple">Капл: ' + status['couple'] + '</span>';
        }
        cmd_group.html(group_txt);
        cmd_command.text(status.command);
        var progress = status.progress * 100;
        cmd_uid.text(uid);
        cmd_pid.text('pid: ' + status.pid);
        cmd_host.text(host);
        cmd_startdt.text(dateToStr(new Date(status.start_ts * 1000)));
    }

    CommandsView.prototype.updateContainers = function() {
        var containers = [this.executing_cont, this.finished_cont];
        for (var idx in containers) {
            var container = containers[idx];

            if (container.find('.cmd').length) {
                container.css({display: 'block'});
            } else {
                container.css({display: 'none'});
            }
        }
    };

    CommandsView.prototype.addErrorData = function(cmd, status) {
        var cmd_level_three = $('<div>').appendTo(cmd),
            cmd_error_code = $('<div class="cmd-error-code">').appendTo(cmd),
            cmd_error_message = $('<div class="cmd-error-message">').appendTo(cmd);

        cmd_error_code.text('Код возврата: ' + status.exit_code);
        cmd_error_message.text(status.exit_message);
        cmd.addClass('cmd-error');
    }

    view = new CommandsView();
    view.eventer.on("create", view.createCmd.bind(view));
    view.eventer.on("update", view.updateCmd.bind(view));

    return {
        model: commands,
        view: view
    }

})();