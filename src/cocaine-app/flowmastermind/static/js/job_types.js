var JobTypesGroups = [],
    JobTypes = {},
    JobStatuses = [];

(function () {

    function fill_job_types_groups() {
        $('jobs job_types_groups job_types_group').each(function (i, el) {
            var job_types_group_data = $(el);

            var job_types_group = {
                id: job_types_group_data.attr('id'),
                label: job_types_group_data.attr('label'),
                position: parseInt(job_types_group_data.attr('position')),
                job_types: [],
            };

            JobTypesGroups.push(job_types_group);
        });

        JobTypesGroups.sort(function(o1, o2) {
            return o1.position > o2.position ? 1 : -1;
        });
    };

    function fill_job_types() {
        $('jobs job_types job_type').each(function (i, el) {
           var job_type_data = $(el);

           var job_type = {
               id: job_type_data.attr('id'),
               label: job_type_data.attr('label'),
               job_types_group_id: job_type_data.attr('job_types_group_id'),
           };

           JobTypes[job_type.id] = job_type;

           var job_types_group = JobTypesGroups[
               JobTypesGroups.findIndex(function (jt) {
                   return jt.id == job_type.job_types_group_id;
               })
           ];

           if (job_types_group == undefined) {
               console.error('Failed to find job types group with id ' + job_type.job_types_group_id);
               return;
           }

           job_types_group.job_types.push(job_type.id);
        });
    }

    function fill_job_statuses() {
        $('jobs job_statuses job_status').each(function (i, el) {
           var job_status_data = $(el);

           var job_status = {
               id: job_status_data.attr('id'),
               label: job_status_data.attr('label'),
           };

           JobStatuses.push(job_status);
        });
    }

    fill_job_types_groups();
    fill_job_types();
    fill_job_statuses();
})();
