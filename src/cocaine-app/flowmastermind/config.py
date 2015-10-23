import json

CONFIG_PATH = '/etc/elliptics/flowmastermind.conf'
MASTERMIND_APP_NAME = 'mastermind2.26'

try:

    with open(CONFIG_PATH, 'r') as config_file:
        config = json.load(config_file)

except Exception as e:
    raise ValueError('Failed to load config file %s: %s' % (CONFIG_PATH, e))
