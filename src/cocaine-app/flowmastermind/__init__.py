import datetime
from functools import wraps
import json
import traceback

import msgpack

from cocaine.services import Service
from cocaine.logging import Logger
from flask import Flask, Response, request
from flask import abort, render_template

from flowmastermind.error import ApiResponseError
from flowmastermind.test import ping


logging = Logger()

app = Flask(__name__)

MASTERMIND_APP_NAME = 'mastermind2.26'


DEFAULT_DT_FORMAT = '%Y-%m-%d %H:%M:%S'


def json_response(func):

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            res = {'status': 'success',
                   'response': func(*args, **kwargs)}
        except ApiResponseError as e:
            logging.error('API error: {0}'.format(e))
            logging.error(traceback.format_exc())
            res = {'status': 'error',
                   'error_code': e.code,
                   'error_message': e.msg}
        except Exception as e:
            logging.error(e)
            logging.error(traceback.format_exc())
            res = {'status': 'error',
                   'error_code': 'UNKNOWN',
                   'error_message': str(e)}

        return JsonResponse(json.dumps(res))

    return wrapper


class JsonResponse(Response):
    def __init__(self, *args, **kwargs):
        super(JsonResponse, self).__init__(*args, **kwargs)
        self.headers['Cache-Control'] = 'no-cache, must-revalidate'
        self.headers['Content-Type'] = 'application/json'


def mastermind_response(response):
    if isinstance(response, dict) and 'Balancer error' in response:
        raise RuntimeError(response['Balancer error'])
    return response


@app.route('/')
def charts():
    try:
        return render_template('charts.html', menu_page='charts')
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/commands/')
def commands():
    try:
        return render_template('commands.html', menu_page='commands',
                                                cur_page='commands')
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/commands/history/')
@app.route('/commands/history/<year>/<month>/')
def history(year=None, month=None):
    try:
        if year is None:
            dt = datetime.datetime.now()
            year, month = dt.year, dt.month
        try:
            dt = datetime.datetime(int(year), int(month), 1)
        except ValueError:
            abort(404)
        return render_template('commands_history.html', year=year,
                                                        month=month,
                                                        menu_page='commands',
                                                        cur_page='history')
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/jobs/')
@app.route('/jobs/<job_type>/')
def jobs(job_type=None):
    if job_type is None:
        job_type = 'move'
    if job_type not in ('move', 'recovery'):
        abort(404)
    try:
        return render_template('jobs.html', menu_page='jobs',
                                            cur_page=job_type,
                                            job_type=job_type)
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/stat/')
def json_stat():
    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = JsonResponse(json.dumps(m.enqueue('get_flow_stats', '').get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/commands/')
def json_commands():
    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = JsonResponse(json.dumps(m.enqueue('get_commands', '').get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/commands/history/<year>/<month>/')
def json_commands_history(year, month):
    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = JsonResponse(json.dumps(m.enqueue('minion_history_log',
            msgpack.packb([year, month])).get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


def ts_to_dt(ts):
    return datetime.datetime.fromtimestamp(float(ts)).strftime(DEFAULT_DT_FORMAT)

@app.route('/json/jobs/<job_type>/')
def json_jobs_list(job_type):
    if job_type not in ('move', 'recovery'):
        abort(404)

    mm_job_types = {'move': 'move_job',
                    'recovery': 'recover_dc_job'}

    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = m.enqueue('get_job_list', msgpack.packb([{'job_type': mm_job_types[job_type]}])).get()

        def convert_tss_to_dt(d):
            if d.get('create_ts'):
                d['create_ts'] = ts_to_dt(d['create_ts'])
            if d['start_ts']:
                d['start_ts'] = ts_to_dt(d['start_ts'])
            if d['finish_ts']:
                d['finish_ts'] = ts_to_dt(d['finish_ts'])

        for r in resp:
            convert_tss_to_dt(r)
            for error_msg in r.get('error_msg', []):
                error_msg['ts'] = ts_to_dt(error_msg['ts'])
            for task in r['tasks']:
                convert_tss_to_dt(task)

        return JsonResponse(json.dumps(resp))
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/jobs/retry/<job_id>/<task_id>/')
def json_retry_task(job_id, task_id):
    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = m.enqueue('retry_failed_job_task', msgpack.packb([job_id, task_id])).get()

        return JsonResponse(json.dumps(resp))
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/jobs/skip/<job_id>/<task_id>/')
def json_skip_task(job_id, task_id):
    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = m.enqueue('skip_failed_job_task', msgpack.packb([job_id, task_id])).get()

        return JsonResponse(json.dumps(resp))
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/jobs/cancel/<job_id>/')
def json_cancel_job(job_id):
    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = m.enqueue('cancel_job', msgpack.packb([job_id])).get()

        return JsonResponse(json.dumps(resp))
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/jobs/approve/<job_id>/')
@json_response
def json_approve_job(job_id):
    try:
        m = Service(MASTERMIND_APP_NAME)
        resp = m.enqueue('approve_job', msgpack.packb([job_id])).get()

        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/map/')
@app.route('/json/map/<namespace>/')
def json_treemap(namespace=None):
    try:
        m = Service(MASTERMIND_APP_NAME)
        options = {
            'namespace': namespace,
            'couple_status': request.args.get('couple_status')
        }
        resp = JsonResponse(json.dumps(m.enqueue('get_groups_tree',
            msgpack.packb([options])).get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/group/<group_id>/')
def json_group_info(group_id):
    try:
        m = Service(MASTERMIND_APP_NAME)
        group_info = m.enqueue('get_couple_statistics',
            msgpack.packb([int(group_id)])).get()
        resp = JsonResponse(json.dumps(group_info))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/commands/status/<uid>/')
@json_response
def json_command_status(uid):
    m = Service(MASTERMIND_APP_NAME)
    status = mastermind_response(m.enqueue('get_command',
        msgpack.packb([uid.encode('utf-8')])).get())

    return status


@app.route('/json/commands/execute/node/shutdown/', methods=['POST'])
@json_response
def json_commands_node_shutdown():
    node = request.form.get('node')
    host, port = node.split(':')
    if not node:
        raise ValueError('Node should be specified')
    m = Service(MASTERMIND_APP_NAME)
    cmd = mastermind_response(m.enqueue('shutdown_node_cmd',
        msgpack.packb([host.encode('utf-8'), int(port)])).get())

    resp = mastermind_response(m.enqueue('execute_cmd',
        msgpack.packb([host, cmd, {'node': node}])).get())

    uid = resp.keys()[0]

    return uid


@app.route('/json/commands/execute/node/start/', methods=['POST'])
@json_response
def json_commands_node_start():
    node = request.form.get('node')
    host, port = node.split(':')
    if not node:
        raise ValueError('Node should be specified')
    m = Service(MASTERMIND_APP_NAME)
    cmd = mastermind_response(m.enqueue('start_node_cmd',
        msgpack.packb([host.encode('utf-8'), int(port)])).get())

    resp = mastermind_response(m.enqueue('execute_cmd',
        msgpack.packb([host, cmd, {'node': node}])).get())

    uid = resp.keys()[0]

    return uid


if __name__ == '__main__':
    app.run(debug=True)
