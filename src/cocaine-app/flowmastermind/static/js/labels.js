var labels = {"types": {}};

(function () {
    $.ajax({
        url: '/external/labels.json',
        method: 'get',
        dataType: 'json',
        timeout: 1000,
        success: function (data) {
            labels = data;
        },
        error: function (data) {
        }
    });
})();
