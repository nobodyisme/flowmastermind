var Graph = (function(canvas, width, height, offset_x, offset_y) {

    function GraphData() {
        this.data = [];
        this.eventer = $('<i>');
    };

    GraphData.prototype.update = function(data) {
        this.data = data;
        this.eventer.trigger("update", [data]);
    };

    GraphData.prototype.clear = function() {
        this.eventer.trigger("clear", []);
    };

    var graph_data = new GraphData();

    function GraphView(canvas, offset_x, offset_y, width, height) {

        this.context = canvas.getContext('2d');
        console.log(this.context);

        this.offset_x = offset_x;
        this.offset_y = offset_y;
        this.height = height;
        this.width = width;

        this.eventer = graph_data.eventer;
    };

    GraphView.prototype.updateGraph = function(event, data) {
        var rows_to_display = Math.min(data.length, this.width);

        this.context.save();

        var data_idx = data.length - 1;

        this.context.translate(this.offset_x + rows_to_display, this.offset_y);
        for (var i = rows_to_display - 1; i >= 0; i--) {
            this.context.translate(-1, 0);
            this.drawRow(data[data_idx]);
            data_idx--;
        }

        this.context.restore();

        this.context.save();

        this.context.textAlign = "center";
        this.context.font = "10px Georgia";

        for (var i = 0; i < this.width / 100; i++) {
            this.context.fillText("здесь будет", i * 100 + 50, this.height + 20);
            this.context.fillText("дата", i * 100 + 50, this.height + 30);
        }

        this.context.restore();
    };

    GraphView.prototype.clearGraph = function(event, data) {
        this.context.clearRect(0, 0, this.width, this.height);
        // clear marks
        this.context.clearRect(0, this.height, this.width, this.height + 40);
    };

    GraphView.prototype.drawRow = function(row) {

        if (row.length == 0) {
            return;
        }
        var grd = this.context.createLinearGradient(0, this.height, 0, 0);
        var start_color = get_rgb_color(row[0]);
        grd.addColorStop(0, "rgb(" + start_color.r + "," + start_color.g + "," + start_color.b + ")");

        var grd_pos = 0.0,
            grd_step = 1.0 / (row.length - 1);
        for (var point_idx = 1; point_idx < row.length; point_idx++) {
            grd_pos += grd_step;
            var color = get_rgb_color(row[point_idx]);
            grd.addColorStop(grd_pos, "rgb(" + color.r + "," + color.g + "," + color.b + ")");
        }
        this.context.fillStyle = grd;

        this.context.beginPath();
        this.context.moveTo(0, 0);
        this.context.lineTo(1, 0);
        this.context.lineTo(1, this.height);
        this.context.lineTo(0, this.height);
        this.context.closePath();
        this.context.fill();
    };

    view = new GraphView(canvas, offset_x, offset_y, width, height);
    view.eventer.on("update", view.updateGraph.bind(view));
    view.eventer.on("clear", view.clearGraph.bind(view));

    return {
        model: graph_data,
        view: view
    }
});



function hsv_to_rgb(hue, sat, val) {
    sat = sat / 100;
    val = val / 100;
    var c = val * sat;
    var hue_prime = hue / 60;
    var x = c * (1 - Math.abs(hue_prime % 2 - 1));

    var r1 = null;
    var g1 = null;
    var b1 = null;

    if (hue_prime < 1) {
        r1 = c;
        g1 = x;
        b1 = 0;
    } else if (hue_prime < 2) {
        r1 = x;
        g1 = c;
        b1 = 0;
    } else if (hue_prime < 3) {
        r1 = 0;
        g1 = c;
        b1 = x;
    } else if (hue_prime < 4) {
        r1 = 0;
        g1 = x;
        b1 = c;
    } else if (hue_prime < 5) {
        r1 = x;
        g1 = 0;
        b1 = c;
    } else if (hue_prime < 6) {
        r1 = c;
        g1 = 0;
        b1 = x;
    }

    var m = val - c;

    var r = r1 + m;
    var g = g1 + m;
    var b = b1 + m;

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    }
}



function rgb_to_hsv () {
    var rr, gg, bb,
        r = arguments[0] / 255,
        g = arguments[1] / 255,
        b = arguments[2] / 255,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c){
            return (v - c) / 6 / diff + 1 / 2;
        };

    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);

        if (r === v) {
            h = bb - gg;
        }else if (g === v) {
            h = (1 / 3) + rr - bb;
        }else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100)
    };
}

var base_points = [
    [0.0, [255, 0, 0]],
    [1.0, [0, 0, 255]]
];

function calculate_color(ratio, lower_rgb, upper_rgb) {
    var lower_hsv = rgb_to_hsv(lower_rgb[0], lower_rgb[1], lower_rgb[2]),
        upper_hsv = rgb_to_hsv(upper_rgb[0], upper_rgb[1], upper_rgb[2]);

    new_h = lower_hsv.h + ratio * (upper_hsv.h - lower_hsv.h);
    new_s = lower_hsv.s + ratio * (upper_hsv.s - lower_hsv.s);
    new_v = lower_hsv.v + ratio * (upper_hsv.v - lower_hsv.v);

    return hsv_to_rgb(new_h, new_s, new_v);
}

function get_rgb_color(value) {
    for (var idx = 0; idx < base_points.length; idx++) {
        var base_point_val = base_points[idx][0];

        if (value < base_point_val) {
            var upper_rgb = base_points[idx][1],
                lower_bp = base_points[idx - 1],
                lower_rgb = lower_bp[1],
                lower_base_point_val = lower_bp[0];

            return calculate_color(
                (
                    (value - lower_base_point_val) /
                    (base_point_val - lower_base_point_val)
                ),
                lower_rgb,
                upper_rgb
            );

        }
    }
}

