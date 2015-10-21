#!/usr/bin/python
# NB: this import have to be executed as early as possible
#     to guarantee proper initialization of ioloops in
#     each process of cocaine pool
import flowmastermind

from cocaine.decorators.wsgi import wsgi
from cocaine.worker import Worker


Worker().run({
    'http': wsgi(flowmastermind.app)
})
