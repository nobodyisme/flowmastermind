import datetime
import json
import traceback

import msgpack

from cocaine.services import Service
from cocaine.logging import Logger
from flask import Flask, Response
from flask import abort, render_template

from flowmastermind.test import ping


logging = Logger()

app = Flask(__name__)


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


@app.route('/json/stat/')
def json_stat():
    try:
        m = Service('mastermind')
        resp = JsonResponse(json.dumps(m.enqueue('get_flow_stats', '').get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/commands/')
def json_commands():
    try:
        m = Service('mastermind')
        resp = JsonResponse(json.dumps(m.enqueue('get_commands', '').get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/commands/history/<year>/<month>/')
def json_commands_history(year, month):
    try:
        m = Service('mastermind')
        resp = JsonResponse(json.dumps(m.enqueue('minion_history_log',
            msgpack.packb([year, month])).get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/treemap/')
def json_treemap():
    try:
        m = Service('mastermind')
        resp = JsonResponse(json.dumps(m.enqueue('get_groups_tree',
            '').get()))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/group/<group_id>/')
def json_group_info(group_id):
    try:
        m = Service('mastermind')
        group_info = m.enqueue('get_couple_statistics',
            msgpack.packb([int(group_id)])).get()
        resp = JsonResponse(json.dumps(group_info))
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


class JsonResponse(Response):
    def __init__(self, *args, **kwargs):
        super(JsonResponse, self).__init__(*args, **kwargs)
        logging.info(self)
        self.headers['Cache-Control'] = 'no-cache, must-revalidate'
        self.headers['Content-Type'] = 'application/json'


if __name__ == '__main__':
    app.run(debug=True)
