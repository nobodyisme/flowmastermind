d3.transition.prototype.endall = function(callback) {
    var n = 0;
    this.each(function() { ++n; })
        .each("end", function() { if (!--n) callback.apply(this, arguments); });
    return this;
};
