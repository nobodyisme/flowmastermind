# -*- coding: utf-8 -*
from collections import namedtuple

__all__ = (
    'job_types_groups',
    'job_types',
    'job_statuses',
)


JobType = namedtuple('Job', ('type', 'label', 'job_types_group_id'))
JobTypesGroup = namedtuple('JobTypesGroup', ('group_id', 'label', 'position'))
JobStatus = namedtuple('JobStatus', ('id', 'label'))

replicas_jobs = JobTypesGroup(
    'replicas_jobs',
    label=u'replicas-групсеты',
    position=0,
)
lrc_jobs = JobTypesGroup(
    'lrc_jobs',
    label=u'lrc-групсеты',
    position=1,
)
couple_jobs = JobTypesGroup(
    'couple_jobs',
    label=u'каплы',
    position=2,
)
convert_jobs = JobTypesGroup(
    'convert_jobs',
    label=u'конвертация',
    position=3,
)
backend_jobs = JobTypesGroup(
    'backend_jobs',
    label=u'бекенды',
    position=4,
)
obsolete_jobs = JobTypesGroup(
    'obsolete_jobs',
    label=u'ну такие',
    position=5,
)

job_types_groups = {
    job_types_group.group_id: job_types_group
    for job_types_group in (
        replicas_jobs,
        lrc_jobs,
        couple_jobs,
        convert_jobs,
        backend_jobs,
        obsolete_jobs,
    )
}


job_types = {
    job_type.type: job_type
    for job_type in (
        JobType(
            'move_job',
            label=u'переезд replicas-группы',
            job_types_group_id=replicas_jobs.group_id,
        ),
        JobType(
            'recover_dc_job',
            label=u'синхронизация replicas-групсета',
            job_types_group_id=replicas_jobs.group_id,
        ),
        JobType(
            'restore_group_job',
            label=u'восстановление replicas-группы',
            job_types_group_id=replicas_jobs.group_id,
        ),
        JobType(
            'couple_defrag_job',
            label=u'дефрагментация replicas-групсета',
            job_types_group_id=replicas_jobs.group_id,
        ),
        JobType(
            'ttl_cleanup_job',
            label=u'чистка данных replicas-групсета',
            job_types_group_id=replicas_jobs.group_id,
        ),

        JobType(
            'add_groupset_to_couple_job',
            label=u'добавление групсета в капл',
            job_types_group_id=convert_jobs.group_id,
        ),
        JobType(
            'convert_to_lrc_groupset_job',
            label=u'внешняя конвертация в lrc',
            job_types_group_id=convert_jobs.group_id,
        ),

        JobType(
            'move_lrc_groupset_job',
            label=u'переезд lrc-группы',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'recover_lrc_groupset_job',
            label=u'синхронизация lrc-групсета',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'defrag_lrc_groupset_job',
            label=u'дефрагментация lrc-групсета',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'restore_lrc_group_job',
            label=u'восстановление lrc-группы',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'remove_lrc_groupset_job',
            label=u'удаление данных капла из lrc-групсета',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'make_lrc_groups_job',
            label=u'создание новых uncoupled-lrc-групп',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'make_lrc_reserved_groups_job',
            label=u'создание новых reserved-lrc-групп',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'restore_uncoupled_lrc_group_job',
            label=u'восстановление uncoupled-lrc-группы',
            job_types_group_id=lrc_jobs.group_id,
        ),
        JobType(
            'discard_groupset_job',
            label=u'удаление групсета',
            job_types_group_id=couple_jobs.group_id,
        ),

        JobType(
            'backend_cleanup_job',
            label=u'Удаление бекенда',
            job_types_group_id=backend_jobs.group_id,
        ),
        JobType(
            'fix_eblobs_job',
            label=u'eblob_kit',
            job_types_group_id=backend_jobs.group_id,
        ),

        JobType(
            'add_lrc_groupset_job',
            label=u'Добавление lrc-групсета',
            job_types_group_id=obsolete_jobs.group_id,
        ),
        JobType(
            'backend_manager_job',
            label=u'Упраление бекендом',
            job_types_group_id=obsolete_jobs.group_id,
        ),
    )
}

job_statuses = [
    JobStatus(
        'not_approved',
        label=u'неодобренные',
    ),
    JobStatus(
        'new',
        label=u'готовые к выполнению',
    ),
    JobStatus(
        'executing',
        label=u'выполняющиеся',
    ),
    JobStatus(
        'pending',
        label=u'упавшие',
    ),
    JobStatus(
        'broken',
        label=u'сломанные',
    ),
    JobStatus(
        'completed',
        label=u'выполненные',
    ),
    JobStatus(
        'cancelled',
        label=u'отмененные',
    ),
]
