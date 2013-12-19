#!/usr/bin/python
from cocaine.decorators.wsgi import wsgi
from cocaine.worker import Worker
from flowmastermind import app


Worker().run({
    'http': wsgi(app)
})
