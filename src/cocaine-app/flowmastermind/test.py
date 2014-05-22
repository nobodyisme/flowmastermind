from cocaine.logging import Logger
from cocaine.decorators.http import http
import msgpack

logging = Logger()

@http
def ping(request, response):
    headers = []
    response.write_head(200, headers)
    response.write(str(type(response)))
    response.write(str(type(request)))
    response.write('pong')
    response.write('something')
    response.write('')
    response.close()
