var Paginator = (function (container) {

    function Paginator() {
        this.total = 0;
        this.offset = 0;
        this.limit = 0;
        this.baseUrl = ''
        this.eventer = $('<i>');
    };

    Paginator.prototype.update = function(state) {
        var updated = false;
        var self = this;
        console.log(state['total']);
        ['total', 'offset', 'limit', 'baseUrl'].forEach(function (k, i) {
            console.log(state[k], self[k]);
            if (state[k] != this[k]) {
                updated = true;
            }
            this[k] = state[k];
        });
        console.log(updated);
        if (updated) {
            this.eventer.trigger("update", [state]);
        }
    };

    function PaginatorView(eventer) {
        this.eventer = eventer;

        console.log(container);
        this.container = container;

        this.pagination = $('<div>');
        this.pagination.addClass('pagination');
        this.pagination.appendTo(this.container);

        var self = this;

        this.container.find('label').on('click', function () {
            var type = $(this).parent().attr('class').substr(5);
            PseudoURL.setParam('type', type).setParam('job_id', null);
            PseudoURL.load();
            return false;
        });
    }

    PaginatorView.prototype.range = function(start, stop, step) {
        if (typeof stop=='undefined'){
            // one param defined
            stop = start;
            start = 0;
        };
        if (typeof step=='undefined'){
            step = 1;
        };
        if ((step>0 && start>=stop) || (step<0 && start<=stop)){
            return [];
        };
        var result = [];
        for (var i=start; step>0 ? i<stop : i>stop; i+=step){
            result.push(i);
        };
        return result;
    };

    PaginatorView.prototype.updatePaginator = function(event, state) {

        var self = this;
        console.log(state);

        if (state.total <= 0) {
            return;
        }

        var total_pages = Math.ceil(parseInt(state.total) / parseInt(state.limit)),
            cur_page = Math.ceil((parseInt(state.offset) + 1) / parseInt(state.limit));

        console.log(total_pages, state);
        var els = [];

        if (total_pages > 1) {
            // Previous button
            var span = $('<a>');
            span.addClass('previous_page');
            if (cur_page == 1) {
                span.addClass('disabled');
            } else {
                span.attr('href', state.baseUrl + '?limit=' + state.limit
                                                + '&offset=' + ((cur_page - 2) * state.limit));
            }
            span.text('Раньше');
            els.push(span[0].outerHTML);
        }

        function createPageWr(current) {
            function createPage(page, i) {
                if (current) {
                    var el = $('<em class="current">');
                } else {
                    var el = $('<a>');
                    el.attr('href', state.baseUrl + '?limit=' + state.limit
                                                  + '&offset=' + ((page - 1) * state.limit));
                }
                el.text(page);
                els.push(el[0].outerHTML);
            }
            return createPage;
        }

        if (cur_page >= 4) {
            self.range(1, Math.min(3, cur_page - 2)).forEach(createPageWr());
            if (cur_page - 3 == 3) {
                [3].forEach(createPageWr());
            } else if (cur_page > 6) {
                els.push('<span class="gap">…</span>');
            }
        }
        self.range(Math.max(1, cur_page - 2), cur_page).forEach(createPageWr());
        [cur_page].forEach(createPageWr(true));
        self.range(cur_page + 1, Math.min(cur_page + 3, total_pages + 1)).forEach(createPageWr());

        if (cur_page < total_pages - 2) {
            if (cur_page + 3 == total_pages - 2) {
                [cur_page + 3].forEach(createPageWr());
            } else if (cur_page < total_pages - 5) {
                els.push('<span class="gap">…</span>');
            }

            if (total_pages > cur_page + 2) {
                self.range(Math.max(cur_page + 3, total_pages - 1), total_pages + 1).forEach(createPageWr());
            }
        }

        if (total_pages > 1) {
            // Next button
            var span = $('<a>');
            span.addClass('next_page');
            if (cur_page == total_pages) {
                span.addClass('disabled');
            } else {
                span.attr('href', state.baseUrl + '?limit=' + state.limit
                                                + '&offset=' + ((cur_page) * state.limit));
            }
            span.text('Позже');
            els.push(span[0].outerHTML);
        }

        this.pagination.html(els.join(''));
    };


    var paginator = new Paginator();
    var view = new PaginatorView(paginator.eventer);

    view.eventer.on("update", view.updatePaginator.bind(view));

    return {
        model: paginator,
        view: view
    }
});