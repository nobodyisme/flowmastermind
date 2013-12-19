import time

import tornado.ioloop
import tornado.web
from tornado import gen

class MainHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    @gen.engine
    def get(self):
        self.write("Hello, world")
        self.flush()
        yield gen.Task(tornado.ioloop.IOLoop.instance().add_timeout, time.time() + 5)
        self.write("Awake")
        self.finish()

application = tornado.web.Application([
    (r"/", MainHandler),
])

if __name__ == "__main__":
    application.listen(8888)
    tornado.ioloop.IOLoop.instance().start()
