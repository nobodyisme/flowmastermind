
var json_ajax = function (params) {

    var DEFAULT_TIMEOUT = 3000;

    if (params.timeout == undefined) {
        params.timeout = DEFAULT_TIMEOUT;
    }

    if (params.dataType == undefined) {
        params.dataType = 'json';
    }

    if (params.data == undefined) {
        params.data = {};
    }

    if (params.data.ts == undefined) {
        params.data.ts = new Date().getTime();
    }

    if (params.success == undefined) {
        params.success = function () {};
    }

    if (params.error == undefined) {
        params.error = function () {};
    }

    // wrapping handlers
    var on_success = function (processor) {
        return function (response, textStatus) {
            if (response['status'] == 'success') {
                return processor(response['response'], textStatus);
            } else {
                return params.error(response, textStatus);
            }
        }
    }

    var on_error = function (processor) {
        return function (response, textStatus) {
            if (textStatus != null && textStatus != 'success') {
                response = {
                    'error_code': 'HTTP_ERROR',
                    'error_message': 'HTTP status ' + response.status,
                    'http_status': response.status,
                    'ajax_status': textStatus
                };
            }
            var error = renderApiError(response);
            window.oNotifications.createNotification({
                title: error.title,
                text: error.msg,
                onBeforeShow: errorNotification});
            return processor(response, textStatus);
        }
    }

    params.success = on_success(params.success);
    params.error = on_error(params.error);

    return $.ajax(params);
}
