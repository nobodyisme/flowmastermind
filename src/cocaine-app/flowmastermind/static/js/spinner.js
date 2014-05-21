
function Spinner(container) {
    var self = this,
        container = d3.select(container),
        thickness = 7,
        endAngle = Math.PI * 3 / 2;

    self.svg = container.insert('svg', ':first-child')
        .attr('width', '100%')
        .attr('height', '100%');

    self.width = 30;
    self.height = 30;

    self.spinner = self.svg.append('g')
        .attr('transform', 'translate(' + (self.width / 2 + 10) + ',' +
                                          (self.height / 2 + 10) + ') rotate(0)');

    var path = self.spinner
            .append('path')
            .attr('class', 'spinner')
            .attr('fill-opacity', 1),
        arc = d3.svg.arc()
            .outerRadius(self.height / 2)
            .innerRadius(self.height / 2 - thickness)
            .startAngle(0)
            .endAngle(endAngle);

    path.attr('d', arc());

}

Spinner.prototype.start = function () {
    var self = this;
    self.run = true;

    function rotate() {
        self.spinner
            .transition()
            .duration(2000)
            .ease('linear')
            .attrTween('transform', rotateTween)
            .each('end', rotate);
    }

    function rotateTween() {
        return function(t) {
            return 'translate(' + (self.width / 2 + 10) + ',' + (self.height / 2 + 10) + ') rotate(' + Math.round(t * 360) +')';
        }
    }
    rotate();
}

Spinner.prototype.stop = function () {
    var self = this;

    self.spinner.select('path')
        .transition(500)
        .attr('fill-opacity', 0)
        .each('end', function () {
            self.spinner
                .transition()
                .duration(0);
            self.spinner.remove();
            self.svg.remove();
        });
}
