import json
import traceback

from cocaine.services import Service
from cocaine.logging import Logger
from flask import Flask, Response
from flask import render_template

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


@app.route('/json/stat/')
def stat():
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


if __name__ == '__main__':
    app.run(debug=True)
