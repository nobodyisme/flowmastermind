

var renderApiError = function (error) {
    var title = 'Что-то пошло не так!';
    var msg = error['error_message'];
    if (error['error_code'] == 'AUTHENTICATION_FAILED') {
        msg = 'Тебе бы <a href="' +
            error['url'].replace('{return_uri}', encodeURIComponent(window.location.toString())) +
            '">залогиниться</a>...';
    } else if (error['error_code'] == 'AUTHORIZATION_FAILED') {
        title = 'Смотреть могут не только лишь все,'
        msg = 'мало кто может это делать...';
    } else if (error['error_code'] == 'HTTP_ERROR') {
        if (error['http_status'] != 0) {
            msg = 'Код ошибки ' + error['http_status'];
        } else if (error['ajax_status'] == 'timeout') {
            msg = 'Не дождались ответа';
        } else {
            msg = 'Что-то вроде ' + error['ajax_status'];
        }
    }
    return {title: title, msg: msg};
};


function successNotification(notification) {
    $(notification).addClass('o-notification-success');
};

function errorNotification(notification) {
    $(notification).addClass('o-notification-error');
};
