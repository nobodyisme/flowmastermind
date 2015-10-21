import functools
from multiprocessing import Pool

from mastermind import ReconnectableService

from flowmastermind.config import MASTERMIND_APP_NAME


def make_cocaine_request(method, *args):
    m = ReconnectableService(
        MASTERMIND_APP_NAME,
        attempts=5
    )
    try:
        return m.enqueue(method, *args).get()
    except Exception as e:
        # TODO: not every type of the exception works properly with
        # multiptocessing.Pool (e.g. cocaine.exceptions.ServiceError).
        # Need to check it out.
        raise RuntimeError(str(e))


cocaine_pool = Pool(processes=5)


def request(method, *args):
    return cocaine_pool.apply(
        functools.partial(
            make_cocaine_request,
            method,
            *args
        )
    )
