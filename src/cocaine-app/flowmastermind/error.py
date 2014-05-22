
class ApiResponseError(Exception):
    def __init__(self, code, msg=''):
        self.code = code
        self.msg = msg or 'error'

    def str(self):
        return '{0}: {1}'.format(self.code, self.msg)
