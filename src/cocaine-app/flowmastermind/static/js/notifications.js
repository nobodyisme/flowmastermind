(function (window, document, UNDEF) {

    'use script';

    if (!window || !document) return;

    var isDocumentHidden = false;
    var isContainerInserted = false;
    var container = document.createElement('div');
    var styles = document.createElement('style');

    var limit = 5;
    var timeLimit = 5000;
    var visible = [];
    var pending = [];
    var DEFAULT_STYLES = '\
        .o-notifications { \
            width: 240px; \
            padding: 0 16px 0 0; \
            position: fixed; \
            top: 0; \
            right: 0; \
            z-index: 9999; \
            cursor: default; \
            -webkit-user-select: none; \
            user-select: none; \
        } \
        .o-notifications-item { \
            box-sizing: border-box; \
            padding: 9px 0 0; \
            position: relative; \
            top: 20px; \
            opacity: 0; \
            transition: top 0.1s ease-out, opacity 0.1s ease-out; \
        } \
        .o-notifications-item__init { \
            width: 100%; \
            top: 0; \
            opacity: 1; \
        } \
        .o-notifications-item__closed { \
            height: 0 !important; \
            overflow: hidden; \
            padding: 0; \
            margin-left: 150%; \
            transition-property: margin, height, padding; \
            transition-duration: 0.4s, 0.3s, 0.3s; \
            transition-delay: 0, 0.2s, 0.2s; \
            transition-timing-function: ease-out; \
        } \
        .o-notifications-default { \
            width: 100%; \
            display: block; \
            background: #fff; \
            border: 1px solid #d4d4d4; \
            box-sizing: border-box; \
            padding: 9px 16px; \
            margin: 0; \
            position: relative; \
        } \
        .o-notifications-default_closer { \
            color: #666; \
            font-family: sans-serif; \
            font-size: 17px; \
            font-weight: lighter; \
            line-height: 16px; \
            text-align: center; \
            width: 16px; \
            height: 16px; \
            display: block; \
            cursor: pointer; \
            position: absolute; \
            top: 3px; \
            right: 3px; \
        } \
        .o-notifications-default_title { \
            font-size: 17px; \
            line-height: 21px; \
            display: block; \
            padding: 0; \
            margin: 0; \
        } \
        .o-notifications-default_text { \
            font-size: 13px; \
            line-height: 18px; \
            display: block; \
            padding: 0; \
            margin: 0; \
        } \
        ';
    var DEFAULT_TEMPLATE = '<span class="o-notifications-default"> \
            <b class="o-notifications-default_closer">&times;</b> \
            <span class="o-notifications-default_title">{{title}}</span> \
            <span class="o-notifications-default_text">{{text}}</span> \
        </span>';
    var customTemplate;


    // Exporting ///////////////////////////////////////////////////////////////

    window.oNotifications = {
        /**
         * @param {number} n
         */
        setLimit: function (n) {
            limit = n || 5;
        },
        /**
         * @param {string} template
         */
        setTemplate: function (template) {
            customTemplate = template;
        },
        /**
         * @param {number} template
         */
        setNotificationTimeLimit: function (n) {
            timeLimit = n || 5000;
        },
        /**
         * @param {Object} data
         */
        createNotification: function (data) {

            if (!isContainerInserted || visible.length >= limit || isDocumentHidden) {
                pending.push(data);
                return;
            }

            createNotification(data);
        }
    };


    // Appending to the document ///////////////////////////////////////////////

    styles.innerHTML = DEFAULT_STYLES;
    container.className = 'o-notifications';
    container.appendChild(styles);

    var bodies = document.getElementsByTagName('body');

    // Actual appenting

    if (bodies.length) {
        appendToTheDocument();
    } else {
        document.addEventListener('DOMContentLoaded', appendToTheDocument);
    }

    container.addEventListener('click', function (e) {

        var target = e.target;

        while (target) {

            if (target === container) break;

            if (target._notificationToClose) {
                closeNotification(target);
                break;
            }

            target = target.parentNode;
        }
    });


    // Watching after Visibility change ////////////////////////////////////////

    document.addEventListener('visibilitychange', checkDocumentVisibilityState);


    // Handlers ////////////////////////////////////////////////////////////////

    function appendToTheDocument () {
        if (bodies.length < 1) return;
        bodies[0].appendChild(container);
        isContainerInserted = true;
        checkPending();
    }

    function checkDocumentVisibilityState () {

        isDocumentHidden = document.hidden;

        if (!isDocumentHidden) checkPending();

        var length = visible.length;
        var i = 0;

        for (; i < length; i++) {
            (function (item) {

                if (isDocumentHidden) {
                    clearAutoClose(item);
                } else {
                    setAutoClose(item);
                }

            })(visible[i]);
        }
    }

    function createNotification (data) {

        var template = customTemplate || DEFAULT_TEMPLATE;
        var content = data.content || data;
        var contentKeys = Object.getOwnPropertyNames(content);
        var length = contentKeys.length;
        var i = 0;

        for (; i < length; i++) {
            (function (key) {
                var rx = new RegExp('{{' + key + '}}', 'gi');
                template = template.replace(rx, content[key]);
            })(contentKeys[i]);
        }

        var item = document.createElement('div');

        item.className = 'o-notifications-item';
        item.innerHTML = template;
        item._notificationToClose = true;

        container.appendChild(item);
        visible.push(item);

        if (typeof data.onBeforeShow === 'function') {
            data.onBeforeShow.call(item.children[0], item.children[0]);
        }

        setTimeout(function () {
            item.className += ' o-notifications-item__init';
            item.style.height = item.offsetHeight + 'px';
            setAutoClose(item);
        }, 100);
    }

    function checkPending () {

        if (!pending.length || isDocumentHidden) return;

        var availableSlots = getAvailableSlots();

        while (availableSlots) {

            createNotification(pending[0]);

            availableSlots = getAvailableSlots();

            pending.splice(0, 1);

            if (!pending.length) break;
        }
    }

    function getAvailableSlots () {
        return limit - visible.length;
    }

    function closeNotification (item) {

        if (item.deleted) return;

        clearAutoClose(item);

        var index = 0;
        var length = visible.length;
        var i = 0;

        item.className += ' o-notifications-item__closed';
        item.deleted = true;

        for (; i < length; i++) {
            if (visible[i] === item) index = i;
        }

        setTimeout(function () {
            container.removeChild(item);
            visible.splice(index, 1);
            checkPending();
        }, 600);
    }

    function setAutoClose (item) {
        item._notificationCloseTimeout = setTimeout(function () {
            closeNotification(item);
        }, timeLimit);
    }

    function clearAutoClose (item) {
        clearTimeout(item._notificationCloseTimeout);
    }



})(window, document);