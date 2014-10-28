

class ApiResponseError(Exception):
    def __init__(self, code, msg=''):
        self.code = code
        self.msg = msg or 'error'

    def __str__(self):
        return '{0}: {1}'.format(self.code, self.msg)


class AuthError(Exception):
    def __str__(self):
        return 'General auth error'


class AuthorizationError(AuthError):
    def __init__(self, login=None):
        self.login = login

    def __str__(self):
        if self.login:
            return 'User {0} is not authorized'.format(self.login)

        return 'Authorization error'


class AuthenticationError(AuthError):
    def __init__(self, url=None):
        self.url = url

    def __str__(self):
        return 'Authentication error'
