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
        return render_template('charts.html')
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/commands/')
def commands():
    try:
        return render_template('commands.html')
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/commands/history/<year>/<month>/')
def history(year, month):
    try:
        try:
            dt = datetime.datetime(int(year), int(month), 1)
        except ValueError:
            abort(404)
        return render_template('commands_history.html', year=year,
                                                        month=month)
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/stat/')
def json_stat():
    try:
        m = Service('mastermind')
        resp = Response(json.dumps(m.enqueue('get_flow_stats', '').get()))
        resp.headers['Cache-Control'] = 'no-cache, must-revalidate'
        resp.headers['Content-Type'] = 'application/json'
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/commands/')
def json_commands():
    try:
        m = Service('mastermind')
        resp = Response(json.dumps(m.enqueue('get_commands', '').get()))
        resp.headers['Cache-Control'] = 'no-cache, must-revalidate'
        resp.headers['Content-Type'] = 'application/json'
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


@app.route('/json/commands/history/<year>/<month>/')
def json_commands_history(year, month):
    try:
        m = Service('mastermind')
        resp = Response(json.dumps(m.enqueue('minion_history_log',
            msgpack.packb([year, month])).get()))
        resp.headers['Cache-Control'] = 'no-cache, must-revalidate'
        resp.headers['Content-Type'] = 'application/json'
        return resp
    except Exception as e:
        logging.error(e)
        logging.error(traceback.format_exc())
        raise


if __name__ == '__main__':
    app.run(debug=True)
