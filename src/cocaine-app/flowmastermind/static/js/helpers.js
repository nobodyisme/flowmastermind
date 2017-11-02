
var prefixes = ['б', 'кб', 'Мб', 'Гб', 'Тб', 'Пб'],
    gb = 1024 * 1024 * 1024;

var decimal_prefixes = ['', 'к', 'млн', 'млрд', 'трлн'];


function prefixBytes(bytes) {
    var res = bytes;
    for (var i in prefixes) {
        if (res < 1024) {
            return res.toFixed(2) + ' ' + prefixes[i];
        }
        res = res / 1024;
    }
    return res.toFixed(2) + ' ' + prefixes[prefixes.length - 1];
}

function prefixBytesRound(bytes) {
    var res = bytes;
    for (var i in prefixes) {
        if (res < 1024) {
            return Math.round(res) + ' ' + prefixes[i];
        }
        res = res / 1024;
    }
    return Math.round(res) + ' ' + prefixes[prefixes.length - 1];
}

function prefixNumRound(number, max_value) {
    var res = number,
        scaler = max_value,
        large = false;

    function render(number, i) {
        return (scaler < 1000 && large) ?
                   number.toFixed(2) + ' ' + decimal_prefixes[i] :
                   Math.round(number) + ' ' + decimal_prefixes[i];
    }

    for (var i in prefixes) {
        if (res < 1000) {
            return render(res, i);
        }
        large = true;
        res = res / 1000;
        scaler = scaler / 1000;
    }
    return render(res, prefixes.length - 1);
}

var time_units = ['сек', 'мин', 'ч', 'д'],
    unit_count = [60, 60, 24];


function convertTimeUnits(seconds) {
    var res = seconds,
        parts = [];
    for (var i = 0; i < time_units.length - 1; i++) {
        var part_val = res % unit_count[i];
        if (part_val) {
            parts.push(part_val + ' ' + time_units[i]);
        }
        res = Math.floor(res / unit_count[i]);
    }
    if (res) {
        parts.push(res + ' ' + time_units[time_units.length - 1]);
    }
    return parts.reverse().join(' ');
}

Number.prototype.format = function(n, x, s, c) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
        num = this.toFixed(Math.max(0, ~~n));

    return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

function intGroupsDelimiter(number, delimiter) {
    return number.format(0, 3, delimiter);
}

function SortByAlphanum(a, b){
    var aName = a.toLowerCase(),
        bName = b.toLowerCase();
    return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
}

function iterItems(obj) {
    var keys = [],
        items = [];
    for (key in obj) {
        keys.push(key);
    }

    keys.sort(SortByAlphanum);

    for (idx in keys) {
        items.push([keys[idx], obj[keys[idx]]]);
    }

    return items;
}

function transpose(source) {

    var result = [],
        length = source[0].length;

    while (length--) {
        result.push([]);
    }

    source.forEach(function (inner) {
        inner.forEach(function (item, index) {
            result[index].push(item);
        });
    });

    return result;
}

function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

function dateToStr(d) {
    var dateStr = d.getFullYear() + '-' +
                  padStr(1 + d.getMonth()) + '-' +
                  padStr(d.getDate()) + ' ' +
                  padStr(d.getHours()) + ':' +
                  padStr(d.getMinutes()) + ':' +
                  padStr(d.getSeconds());
    return dateStr;
}

function padStr(i) {
    return (i < 10) ? "0" + i : "" + i;
}

function timedeltaToStr(sec) {
    var postfixes = ['сек', 'мин', 'час'],
        units = [60, 60, 1],
        x = sec,
        res = '';

    for (var i = 0; i < postfixes.length - 1; i++) {
        var cur = x % units[i];
        x = Math.floor(x / units[i]);
        if (cur != 0 || (i == 0 && x == 0)) {
            res = cur + ' ' + postfixes[i] + ' ' + res;
        }
        if (x == 0) {
            break;
        }
    }

    return res;
}

function insertAlphabetically(child, parent, key) {
    var inserted = false;
    parent.children().each(function () {
        if (key($(this)) > key(child)) {
            child.insertBefore($(this));
            inserted = true;
            return false;
        }
    });
    if (!inserted) parent.append(child);
}


var STATUS_LABELS = {
    couple_labels: {
        'OK': 'ОК',
        'INIT': 'инициализируется',
        'BAD': 'плохо',
        'BROKEN': 'ошибка конфигурации',
        'FROZEN': 'заморожен',
        'RO': 'только чтение',
        'FULL': 'заполнен'
    },

    group_labels: {
        'INIT': 'инициализируется',
        'BAD': 'недоступна для записи',
        'BROKEN': 'ошибка конфигурации',
        'COUPLED': 'в капле',
        'RO': 'только чтение',
        'MIGRATING': 'переезд'
    },

    node_labels: {
        'BAD': 'уничтожена',
        'BROKEN': 'ошибка конфигурации',
        'INIT': 'отсутствует статистика',
        'STALLED': 'устаревшая статистика',
        'OK': 'ОК',
        'RO': 'только чтение'
    }
}


function prefix_int(i) {
    if (i < 10) {
        return '0' + i;
    }
    return '' + i;
}

function format_timestamp(ts) {
    var a = new Date(ts * 1000);
    var year = a.getFullYear();
    var month = prefix_int(a.getMonth() + 1);
    var date = prefix_int(a.getDate());
    var hour = prefix_int(a.getHours());
    var min = prefix_int(a.getMinutes());
    var sec = prefix_int(a.getSeconds());
    return year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
}


function copyToClipboard(elem) {
    // create hidden text element, if it doesn't already exist
    var targetId = "_hiddenCopyText_";
    var isInput = elem.tagName === "INPUT" || elem.tagName === "TEXTAREA";
    var origSelectionStart, origSelectionEnd;
    if (isInput) {
        // can just use the original source element for the selection and copy
        target = elem;
        origSelectionStart = elem.selectionStart;
        origSelectionEnd = elem.selectionEnd;
    } else {
        // must use a temporary form element for the selection and copy
        target = document.getElementById(targetId);
        if (!target) {
            var target = document.createElement("textarea");
            target.style.position = "absolute";
            target.style.left = "-9999px";
            target.style.top = "0";
            target.id = targetId;
            document.body.appendChild(target);
        }
        target.textContent = elem.textContent;
    }
    // select the content
    var currentFocus = document.activeElement;
    target.focus();
    target.setSelectionRange(0, target.value.length);

    // copy the selection
    var succeed;
    try {
        succeed = document.execCommand("copy");
    } catch(e) {
        succeed = false;
    }
    // restore original focus
    if (currentFocus && typeof currentFocus.focus === "function") {
        currentFocus.focus();
    }

    if (isInput) {
        // restore prior selection
        elem.setSelectionRange(origSelectionStart, origSelectionEnd);
    } else {
        // clear temporary content
        target.textContent = "";
    }
    return succeed;
}
