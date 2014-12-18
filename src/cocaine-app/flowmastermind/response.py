from flask import Response


class JsonResponse(Response):
    def __init__(self, *args, **kwargs):
        super(JsonResponse, self).__init__(*args, **kwargs)
        self.headers['Cache-Control'] = 'no-cache, must-revalidate'
        self.headers['Content-Type'] = 'application/json'
