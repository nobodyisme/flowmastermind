function create_convert_to_lrc_groupset_job_label(job_state) {
    var groupset = job_state['groups'].join(':');
    var title = 'Конвертация данных в lrc-групсет ' + groupset + ' ' +
            '(капл ' + job_state['couple'] + ')';
    return title;
}
