
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

var STATUS_LABELS = {
    couple_labels: {
        'OK': 'ОК',
        'INIT': 'инициализируется',
        'BAD': 'плохо',
        'FROZEN': 'заморожен',
        'RO': 'только чтение',
        'FULL': 'заполнен'
    },

    group_labels: {
        'INIT': 'инициализируется',
        'BAD': 'недоступна для записи',
        'COUPLED': 'в капле',
        'RO': 'только чтение'
    },

    node_labels: {
        'BAD': 'уничтожена',
        'INIT': 'отсутствует статистика',
        'STALLED': 'устаревшая статистика',
        'OK': 'ОК',
        'RO': 'только чтение'
    }
}

