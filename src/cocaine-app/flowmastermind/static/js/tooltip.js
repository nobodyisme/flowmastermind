    function Tooltip(useSplitter) {
        this.tooltip = $('<div>').addClass('tooltip');
        this.tooltipContainer = $('<div>').addClass('tooltipContainer')
                .appendTo(this.tooltip);
        if (useSplitter) {
            this.tooltipDC = $('<div>').addClass('tooltip-dc').appendTo(this.tooltipContainer);
            this.tooltipSplitter = $('<div>').addClass('tooltip-splitter').appendTo(this.tooltipContainer);
        }
        this.tooltipSpace = $('<div>').addClass('tooltip-space').appendTo(this.tooltipContainer);
        this.tooltipSpaceLabel = $('<div>').addClass('tooltip-space-label').appendTo(this.tooltipSpace);
        this.tooltipSpaceValue = $('<div>').addClass('tooltip-space-value').appendTo(this.tooltipSpace);

        if (useSplitter) {
            $('<div>').addClass('tail')
                .appendTo(this.tooltipContainer)
                .append('<div class="tail-inner">');
        }
    };

    Tooltip.prototype.appendTo = function (container) {
        this.tooltip.prependTo(container);
    };

    Tooltip.prototype.setDC = function (dc) {
        this.tooltipDC.text(dc);
    };

    Tooltip.prototype.setSpaceLabel = function (val) {
        this.tooltipSpaceLabel.text(val);
    };

    Tooltip.prototype.setSpaceValue = function (val) {
        this.tooltipSpaceValue.text(val);
    };

    Tooltip.prototype.show = function (x, y) {
        this.tooltip.stop(true, true)
            .css({opacity: 0});
        this.tooltip.css({top: +x + 'px',
                          left: +y + 'px',
                          display: 'block'})
        .animate({
            opacity: 1
        }, 200);
    };

    Tooltip.prototype.hide = function () {
        this.tooltip.stop(true, true)
            .animate({
                opacity: 0
            }, 200, function () {
                $(this).css({display: 'none'});
            });
    };
