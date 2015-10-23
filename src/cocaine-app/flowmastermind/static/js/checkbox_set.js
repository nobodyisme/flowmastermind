var CheckboxSet = function (container, add_select_all_checkbox) {

    this.checkboxes = {};
    this.settings = {};

    this.add_select_all_checkbox = add_select_all_checkbox;

    this.container = container;
    this.key = function (spanItem) {
        return spanItem.find('input[type=checkbox]').attr('value');
    }

    this.cmp = function (key1, key2) {
        return key1 < key2;
    }
    
    this.add_item_cb = function (item_id, item) { return; };
    this.update_settings_cb = function (settings) { return; };

    this.check_item_cb = function (item_id, item) { return; };
    this.uncheck_item_cb = function (item_id, item) { return; };

    this.select_all_item = null;
};


CheckboxSet.prototype.set_add_item_cb = function (cb) {
    this.add_item_cb = cb;
};

CheckboxSet.prototype.set_update_settings_cb = function (cb) {
    this.update_settings_cb = cb;
};

CheckboxSet.prototype.set_check_item_cb = function (cb) {
    this.check_item_cb = cb;
};

CheckboxSet.prototype.set_uncheck_item_cb = function (cb) {
    this.uncheck_item_cb = cb;
};

CheckboxSet.prototype.set_settings = function (settings) {
    this.settings = settings;
};


CheckboxSet.prototype.add = function (item_id) {
    var self = this;

    if (self.checkboxes[item_id]) return;

    if (self.add_select_all_checkbox && Object.keys(self.checkboxes).length == 0) {
        self._add_select_all_checkbox();
    }

    var spanItem = $('<span />'),
        cbItem = $('<input type="checkbox" value="' + item_id + '">').appendTo(spanItem);

    self.checkboxes[item_id] = spanItem;

    // User callback on adding item
    self.add_item_cb(item_id, spanItem);

    self._insert_item(spanItem);
    self._update_checkbox_state(item_id, true);

    checked = self.settings[item_id];
    cbItem.attr('checked', checked ? 'checked' : null);

    if (checked) {
        self.check_item_cb(item_id, spanItem);
    }

    cbItem.change(function () {
        if (this.checked) {
            self.settings[$(this).val()] = true;
            
            self.check_item_cb(item_id, cbItem);
            
            var all_checked = true;
            self.container.find('input[type=checkbox]').each(function () {
                if (!this.checked) {
                    all_checked = false;
                    return false;
                }
            });
            if (self.add_select_all_checkbox && all_checked) {
                self.select_all_item.find('input[type=checkbox]').prop('checked', true);
            }
            self._update_checkbox_state(item_id);
        } else {
            delete self.settings[$(this).val()];

            self.uncheck_item_cb(item_id, cbItem);
           
            if (self.add_select_all_checkbox) {
                self.select_all_item.find('input[type=checkbox]').prop('checked', false);
            }
            self._update_checkbox_state(item_id);
        }
        self.update_settings_cb(self.settings);
    });
};

CheckboxSet.prototype._add_select_all_checkbox = function () {
    var self = this,
        selectAllItem = $('<span>'),
        selectAllLabel = $('<label>').appendTo(selectAllItem),
        selectAllCbItem = $('<input type="checkbox" value="">').appendTo(selectAllLabel);

    self.container.append(selectAllItem);

    selectAllCbItem.change(function () {
        var select_cb = this;
        self.container.find('input[type=checkbox]').each(function () {

            // Skip 'select all' checkbox
            if ($(this).attr('value') == '') return;

            $(this).prop('checked', select_cb.checked).trigger('change');
        });
    });
    selectAllLabel.append(document.createTextNode('выбрать все'));

    self.add_item_cb('', selectAllItem);

    self.select_all_item = selectAllItem;
};

CheckboxSet.prototype._insert_item = function (item) {
    var self = this,
        inserted = false;
    self.container.children().each(function () {
        if (self.cmp(self.key(item), self.key($(this)))) {
            item.insertBefore($(this));
            inserted = true;
            return false;
        }
    });

    if (!inserted) self.container.append(item);
};

CheckboxSet.prototype._update_checkbox_state = function (item_id, init) {
    var spanItem = this.checkboxes[item_id],
        cbItem = spanItem.find('input[type=checkbox]');

    checked = this.settings[item_id] == true;

    if (checked) {
        spanItem.find('.label').remove();
        menuItemLabel = $('<a class="label" href="#' + item_id + '">' + item_id + '</a>').
            appendTo(spanItem);
        if (!init) {
            // was a user click, not initialization of menu item
            location.hash = '#' + item_id;
        }
    } else {
        spanItem.find('.label').remove();
        menuItemLabel = $('<a class="label unchecked" href="#' + item_id + '">' + item_id + '</a>').
            appendTo(spanItem);
        menuItemLabel.click(function () {
            cbItem.prop('checked', true).trigger('change');
            return false;
        });
    }

};
