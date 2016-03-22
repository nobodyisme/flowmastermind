from functools import wraps

from cocaine.logger import Logger
from flask import abort, request

from flowmastermind.config import config
from flowmastermind.error import AuthError, AuthenticationError, AuthorizationError
from flowmastermind.importer import import_object

logging = Logger()


class AuthController(object):

    def __init__(self, auth):
        self.auth = auth

    def check_auth(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                if not self.auth_required():
                    logging.warn('Authentication is not required')
                else:
                    logging.info('Authentication checking started')
                    user = self.auth.authenticated_user(request)
                    if not user:
                        logging.info('Authentication checking failed')
                        raise AuthenticationError(url=self.auth.login_url)

                    logging.info('Authentication checking passed, user data: {0}'.format(user))

                    if not self.is_authorized(user):
                        login = self.auth.user_login(user)
                        logging.info('User {0} is not authorized'.format(login))
                        raise AuthorizationError(login=login)

                res = func(*args, **kwargs)

            except AuthError:
                raise
            except Exception as e:
                logging.error(e)
                raise
            return res

        return wrapper

    CONFIG_USERS = config.get('auth', {}).get('users', [])
    AUTHORIZED_USERS = (CONFIG_USERS
                        if CONFIG_USERS and not '*' in CONFIG_USERS else
                        [])

    def auth_required(self):
        return self.AUTHORIZED_USERS

    def is_authorized(self, user):
        if not self.AUTHORIZED_USERS:
            return True

        return self.auth.user_login(user) in self.AUTHORIZED_USERS


class FakeAuth(object):
    def __init__(self, **kwargs):
        pass

    def authenticated_user(self, request):
        return {'login': 'fake_user'}

    @property
    def login_url(self):
        return 'http://fake-url.com'

    def user_login(self, user):
        return user['login']


config_auth_class = config.get('auth', {}).get('class')
Auth = config_auth_class and import_object(config_auth_class) or FakeAuth
auth_controller = AuthController(Auth(logger=logging))
