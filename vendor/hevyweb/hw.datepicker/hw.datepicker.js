/**
 * Hevyweb datepicker
 * 
 * Provides a popup calendar, which allows to pick the date
 * @link https://github.com/hevyweb/hw.datepicker
 * @author Dmytro Dzyuba <1932@bk.ru>
 * @licence MIT
 * @version 1.3.0
 */

var DatePicker = function(configs) {

    function removeTime(date) {
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    }

    if (typeof configs.input == "undefined") {
        throw new SyntaxError("Input field is not specified.");
    }

    var input = $(configs.input);
    if (!input.length) {
        throw new SyntaxError("Specified input field does not exist.");
    }

    var container;
    if (typeof configs.container == "undefined") {
        container = $("body");
    } else {
        container = $(configs.container);
        if (!container.length) {
            throw new SyntaxError("Specified container does not exist.");
        }
    }

    if (typeof configs.trigger == "undefined") {
        throw new SyntaxError("Trigger is not defined.");
    }
    
    var trigger = $(configs.trigger);
    if (!trigger.length) {
        throw new SyntaxError("Specified trigger does not exist.");
    }

    var currentDate = new Date();
    if (typeof configs.currentDate != "undefined") {
        var currentDate = new Date(configs.currentDate);
        if (isNaN(currentDate.getTime())) {
            throw new SyntaxError("Current date is not valid.");
        }
    }

    removeTime(currentDate);

    if (typeof configs.minDate != "undefined") {
        var minDate = new Date(configs.minDate);
        if (isNaN(minDate.getTime())) {
            throw new SyntaxError("Min date is not valid.");
        }
        removeTime(minDate);
    }

    if (typeof configs.maxDate != "undefined") {
        var maxDate = new Date(configs.maxDate);
        if (isNaN(maxDate.getTime())) {
            throw new SyntaxError("Max date is not valid");
        }
        removeTime(maxDate);
    }

    if (typeof maxDate != "undefined" && typeof minDate != "undefined") {
        if (minDate > maxDate) {
            throw new SyntaxError("Min date is greater then max date.");
        }
    }

    return {
        /**
         * Contains an instance of the current datepicker for those cases, when
         * you need to initialize several datepickers per page
         */
        "currentPicker": null,
        "input": input,
        "trigger": trigger,
        "currentDate": currentDate,
        "selectedDate": null,
        "activeDate": new Date(currentDate),
        "maxDate": maxDate || null,
        "minDate": minDate || null,
        "startWithMonday": configs.startWithMonday || false,
        "dateFormat": configs.dateFormat || "dd.mm.yyyy",
        "buttons": {
            "currentDateButton": configs.currentDateButton || true,
            "closeButton": configs.closeButton || true
        },
        "events": $.extend({
            "onSelect": null,
            "onMonthChange": null,
            "onOpen": null,
            "onClose": null,
            "onDateFocus": null
        }, configs.events || {}),
        i18n: $.extend({
            "prevMonth": "Previous month",
            "nextMonth": "Next month",
            "monthName": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            "weekNameFull": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "weekNameShort": ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
            "currentDate": "Current date",
            "selectedDate": "Selected date",
            "currentMonth": "Current month",
            "lastAvailableDate": "Last available date",
            "firstAvailableDate": "First available date",
            "notAvailable": "Date is not available",
            "description": "datepicker",
            "close": "Close"
        }, configs.i18n || {}),
        
        addFrontZeros: function(number) {
            return (number < 10 ? "0" : "") + number;
        },
        
        adjustPosition: function() {
            var $window = $(window);
            var inputPosition = this.input.offset();
            var windowOffsetTop = $window.scrollTop();
            var windowWidth = $window.width();
            var pickerWidth = this.currentPicker.outerWidth();
            var left = inputPosition.left;
            if (windowWidth > pickerWidth) {
                if (left + pickerWidth > windowWidth) {
                    var right = left + this.input.width();
                    if (right - pickerWidth < 0){                    
                        left = parseInt((windowWidth - (left + pickerWidth))/2);
                    } else{
                        left = right - pickerWidth;
                    }
                }
            } else {
                left = 0;
            }
            
            var inputHeight = this.input.outerHeight();
            var top = inputPosition.top + inputHeight;
            var windowHeight = $window.height();
            var pickerHeight = this.currentPicker.outerHeight(true);
            if (top - windowOffsetTop + pickerHeight > windowHeight){
                var bodyHeight = $("body").height();
                if (top + pickerHeight < bodyHeight) {
                    $window.scrollTop(inputPosition.top);
                } else {
                    top = inputPosition.top - pickerHeight;
                    if (top < 0){
                        top = 0;
                    } else {
                        if (top < $window.scrollTop()){
                            $window.scrollTop(inputPosition - windowHeight + inputHeight);
                        }
                    }
                }
            }
            
            this.currentPicker
                .css({
                    "left": left,
                    "top": top
                });
        },
        
        changeDate: function(newDate) {
            this.selectedDate = newDate;
            this.activeDate = new Date(newDate);
            if (this.currentPicker) {
                this.monthChange(this.activeDate);
            }
        },

        close: function(e) {
            if (this.events.onClose) {
                this.events.onClose.call(this, e);
            }
            this.currentPicker.addClass("hw_closed").attr("aria-hidden", "true");
            $("body").off("click.hw.datepicker.body");
            this.trigger.focus();
        },
        
        destroy: function(){
            if (this.events.onDestroy) {
                this.events.onDestroy.call(this, e);
            }
            $(window).off("resize.hw.datepicker.window");
            $("body").off("click.hw.datepicker.body");
            this.input.off("keyup.hw.datepicker.input");
            this.trigger.off("click.hw.datepicker.trigger");
            if(this.currentPicker){
                this.currentPicker.remove();
                this.currentPicker = null;
            }
            
        },
        
        displayMonthYear: function(date){
            return this.i18n.monthName[date.getMonth()] + " " + date.getFullYear();
        },
        
        focusDate: function(date, future) {
            if (typeof date != "object") {
                var newDate = new Date(this.activeDate);
                newDate.setDate(newDate.getDate() + (future ? 1 : -1) * date);
            } else {
                var newDate = date;
            }

            if (this.maxDate && newDate > this.maxDate) {
                this.focusDate(this.maxDate);
                return;
            }

            if (this.minDate && newDate < this.minDate) {
                this.focusDate(this.minDate);
                return;
            }

            if (this.activeDate.getMonth() != newDate.getMonth()) {
                this.monthChange(newDate);
            }

            this.currentPicker.find("button[data-date=" + newDate.getTime() + "]").focus();
        },
        
        getActive: function() {
            if (!this.activeDate) {
                this.activeDate = this.currentPicker.find(".hw_selectedDate, .hw_currentDate, .hw_default").first();
            }
            return this.activeDate;
        },
        
        getFormatedDate: function(date) {
            var day = date.getDate();
            var month = date.getMonth() + 1;

            return this.dateFormat
                .replace("dd", this.addFrontZeros(day))
                .replace("d", day)
                .replace("mm", this.addFrontZeros(month))
                .replace("m", month)
                .replace("yyyy", date.getFullYear());
        },

        getFullDate: function(date, dayName) {
            return this.i18n.monthName[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() + ", " + dayName;
        },

        getLastDate: function(date)
        {
            var lastDate = new Date(date);
            lastDate.setDate(1);
            lastDate.setMonth(lastDate.getMonth() + 1);
            lastDate.setDate(0);
            removeTime(lastDate);
            return lastDate;
        },

        getNextMonthDate: function(date) {
            var nextMonthDate = new Date(date);
            nextMonthDate.setDate(1);
            removeTime(nextMonthDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            return nextMonthDate;
        },

        getPrevMonthDate: function(date) {
            var prevMonthDate = new Date(date);
            prevMonthDate.setDate(0);
            removeTime(prevMonthDate);
            return prevMonthDate;
        },
        
        init: function() {
            var self = this;

            this.trigger.on('click.hw.datepicker.trigger', this.triggerClickEvent.bind(this));

            var selectedDate = this.strToDate(this.input.val());

            if (selectedDate != null && !isNaN(selectedDate.getTime()) && selectedDate != this.selectedDate) {
                this.changeDate(selectedDate);
            }

            this.input.on("keyup.hw.datepicker.input", this.inputKeydownEvent.bind(this));

            $(window).on("resize.hw.datepicker.window", this.windowResizeEvent.bind(this));
        },
        
        inputKeydownEvent: function (e) {
            var date = this.strToDate(this.input.val());
            if (date != null && !isNaN(date.getTime())) {
                if ((this.minDate == null || self.minDate <= date) && (self.maxDate == null || self.maxDate >= date)) {
                    this.changeDate(date);
                }
            }
        },
        
        keyboardNavigation: function(e) {
            var keyCode = e.which || e.keyCode;
            switch (keyCode) {
                case 27: //esc
                    this.close(e);
                    break;
                case 33: //page up    
                    e.preventDefault();
                    e.stopPropagation();
                    var newDate = new Date(this.activeDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    if (this.activeDate.getMonth() - newDate.getMonth() == 0) {
                        newDate.setDate(0);
                    }
                    this.focusDate(newDate, true);
                    break;
                case 34: //page down
                    e.preventDefault();
                    e.stopPropagation();
                    var newDate = new Date(this.activeDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    if (newDate.getMonth() - this.activeDate.getMonth() > 1) {
                        newDate.setDate(0);
                    }
                    this.focusDate(newDate, true);
                    break;
                case 35: //end
                    e.preventDefault();
                    e.stopPropagation();
                    var newDate = this.getLastDate(this.activeDate);
                    this.focusDate(newDate, true);
                    break;
                case 36: //home
                    e.preventDefault();
                    e.stopPropagation();
                    var newDate = new Date(this.activeDate);
                    newDate.setDate(1);
                    this.focusDate(newDate, true);
                    break;
                case 37: //left
                    e.preventDefault();
                    e.stopPropagation();
                    this.focusDate(1, false);
                    break;
                case 38: //up
                    e.preventDefault();
                    e.stopPropagation();
                    this.focusDate(7, false);
                    break;
                case 39: //right
                    e.preventDefault();
                    e.stopPropagation();
                    this.focusDate(1, true);
                    break;
                case 40: //down
                    e.preventDefault();
                    e.stopPropagation();
                    this.focusDate(7, true);
                    break;
                case 9: //tab
                    if ($(e.target).hasClass("hw_lastActive")){
                        e.preventDefault();
                        e.stopPropagation();
                        this.close();
                        this.trigger.focus();
                    }
            }
        },
        
        monthBtnClick: function(e) {
            var date = new Date(parseInt($(e.currentTarget).attr("data-date")));
            if (this.events.onMonthChange) {
                this.events.onMonthChange.call(this, date, e);
            }
            this.monthChange(date);
        },

        monthChange: function(date) {
            this.currentPicker.find(".hw_week").remove();
            this.currentPicker.find(".hw_pickerBody").append(this.renderWeeks(date));

            var currentMonthYear = this.displayMonthYear(date);
            this.currentPicker.find(".hw_currentMonth")
                .attr("aria-label", currentMonthYear)
                .html(currentMonthYear);

            var prevMonthDate = this.getPrevMonthDate(date),
                nextMonthDate = this.getNextMonthDate(date);

            this.currentPicker.find(".hw_monthLeft")
                .trigger("redraw", this.minDate && (prevMonthDate <= this.minDate && prevMonthDate <= this.selectedDate))
                .attr({
                    "data-date": prevMonthDate.getTime(),
                    "aria-label": this.displayMonthYear(prevMonthDate)
                });

            this.currentPicker.find(".hw_monthRight")
                .trigger("redraw", this.maxDate && (nextMonthDate >= this.maxDate && nextMonthDate >= this.selectedDate))
                .attr({
                    "data-date": nextMonthDate.getTime(),
                    "aria-label": this.displayMonthYear(nextMonthDate)
                });

            this.activeDate = date;
        },

        open: function() {
            if (this.events.onOpen) {
                this.events.onOpen.call(this);
            }

            if (!this.currentPicker) {
                $(container).append(this.render());
            }

            this.adjustPosition();
            
            $("body").on("click.hw.datepicker.body", this.close.bind(this));
            this.currentPicker.removeClass("hw_closed").removeAttr("aria-hidden").focus();
            this.getActive();
        },

        render: function() {
            this.currentPicker = $("<div />").attr({
                "class": "hw_datepicker hw_closed",
                "aria-hidden": "true",
                "tabindex": "0",
                "role": "application",
                "aria-label": this.i18n.description
                })
                .click(function(e) {
                    e.stopPropagation();
                })
                .keydown(this.keyboardNavigation.bind(this))
                .append(this.renderMonthNavigation(this.activeDate))
                .append(this.renderBody())
                .append(this.renderFooter());
            return this.currentPicker;
        },
        
        renderBody: function() {
            return $("<div />")
                .addClass("hw_pickerBody")
                .append(this.renderBodyHeader())
                .append(this.renderWeeks(this.activeDate));
        },

        renderBodyHeader: function() {
            var bodyHeader = $("<div />").attr({
                "class": "hw_pickerBodyHeader",
                "role": "rowheader"
            });
            var self = this;
            if (!this.startWithMonday) {
                this.i18n.weekNameFull.unshift(this.i18n.weekNameFull.pop());
                this.i18n.weekNameShort.unshift(this.i18n.weekNameShort.pop());
            }
            $.each(self.i18n.weekNameShort, function(key, day) {
                $("<div />").attr({
                    "title": self.i18n.weekNameFull[key],
                    "role": "columnheader"
                }).html(day)
                .appendTo(bodyHeader);
            });

            return bodyHeader;
        },
        
        renderFooter: function(){
            var buttonContainer = $("<div />")
                .addClass("hw_footer");

            if (this.buttons.currentDateButton){
                buttonContainer.append(this.renderCurrentDateButton()).show();
            }
            
            if (this.buttons.closeButton){
                buttonContainer.append(this.renderCloseButton()).show();
            }
            
            return buttonContainer;
        },

        renderCell: function(buttonDate, currentMonth, dayName) {
            var inactive = false;
            var title = [];
            var dayindex = buttonDate.getDay();
            
            var button = $("<button />")
                .attr({
                    "aria-label": this.getFullDate(buttonDate, dayName),
                    "data-dayindex": dayindex,
                    "data-date": buttonDate.getTime(),
                    "tabindex": "0"
                })
                .text(this.addFrontZeros(buttonDate.getDate()));

                
            
            if (currentMonth != buttonDate.getMonth()) {
                button.addClass("hw_inactive")
                    .attr({
                    "aria-disabled": "true",
                    "tabindex": "-1"
                });
                inactive = true;
            } else if ((this.maxDate && this.maxDate < buttonDate) || (this.minDate && this.minDate > buttonDate)) {
                button.addClass("hw_unavailable")
                    .attr({
                    "aria-disabled": "true",
                    "tabindex": "-1"
                });
                title[0] = this.i18n.notAvailable;
                inactive = true;
            }
            
            if (buttonDate.getTime() === this.currentDate.getTime()) {
                button.addClass("hw_currentDate");
                title[0] = this.i18n.currentDate;
            }

            if (this.selectedDate != null && buttonDate.getTime() === this.selectedDate.getTime()) {
                button.addClass("hw_selectedDate");
                title[0] = this.i18n.selectedDate;
            }
            
            if (this.minDate && this.minDate.getTime() == buttonDate.getTime()) {
                title.push(this.i18n.firstAvailableDate);
            }
            
            if (this.maxDate && this.maxDate.getTime() == buttonDate.getTime()) {
                title.push(this.i18n.lastAvailableDate);
            }
            
            if (title.length){
                button.attr("title", title.join(", "));
            }

            if (!inactive) {
                var self = this;
            
                button.addClass("hw_default")
                .click(function(e) {
                    self.selectDate(e);
                })
                .hover(
                        function() {
                            $(this).focus();
                        },
                        function() {
                            $(this).blur();
                        }
                )
                .focus(function(e) {
                    var activeDate = new Date();
                    activeDate.setTime($(this).attr("data-date"));
                    if (self.events.onDateFocus) {
                        self.events.onDateFocus(e, activeDate);
                    }

                    self.currentPicker.find(".hw_activeDay").removeClass("hw_activeDay");
                    self.activeDate = activeDate;
                    $(this).addClass("hw_activeDay");
                })
                .blur(function() {
                    $(this).removeClass("hw_activeDay");
                });
            } else {
                button.prop("disabled");
            }

            return $("<div />").addClass("hw_day").append(button);
        },
        
        renderCloseButton: function(){
            var self = this;
            return $("<button />")
                .attr({
                    "class": "hw_close",
                    "title":self.i18n.close
                })
                .click(function(){
                    self.close();
                });
        },
        
        renderCurrentDateButton: function(){
            var self = this;
            return $("<button />")
                .attr({
                    "class": "hw_selectCurrentDate",
                    "title": self.i18n.currentDate
                })
                .click(function(){
                    self.changeDate(self.currentDate);
                });
        },

        renderMonthNavBtn: function(label, date, className) {
            var self = this;
            return $("<button />").attr({
                "type": "button",
                "class": "hw_monthButton " + className,
                "aria-label": this.displayMonthYear(date),
                "title": label,
                "data-date": date.getTime()
            }).on("redraw", function(e, inactive) {
                if (inactive) {
                    $(this).addClass("hw_unavailable").attr({
                        "aria-disabled": "true",
                        "tabindex": -1
                    }).off("click");
                } else {
                    $(this).removeClass("hw_unavailable").attr({
                        "aria-disabled": "false",
                        "tabindex": 0
                    }).off("click").on("click", self.monthBtnClick.bind(self));
                }
            });
        },
        
        renderMonthNavigation: function(date) {
            var 
            monthDate = new Date(date),
            prevMonthDate = this.getPrevMonthDate(monthDate),
            nextMonthDate = this.getNextMonthDate(monthDate),

            prevButton = this.renderMonthNavBtn(
                this.i18n.prevMonth,
                prevMonthDate,
                "hw_monthLeft"
            ).trigger("redraw", this.minDate && prevMonthDate <= this.minDate && prevMonthDate <= this.selectedDate),

            nextButton = this.renderMonthNavBtn(
                this.i18n.nextMonth,
                nextMonthDate,
                "hw_monthRight"
            ).trigger("redraw", this.maxDate && nextMonthDate >= this.maxDate && nextMonthDate >= this.selectedDate),

            currentMonth = this.displayMonthYear(monthDate);

            return $("<div />")
                    .addClass("hw_monthContainer")
                    .append(prevButton)
                    .append(
                        $("<div />")
                        .attr({
                            "class": "hw_currentMonth",
                            "tabindex": 0,
                            "aria-label": currentMonth,
                            "title": this.i18n.currentMonth
                        })
                        .html(currentMonth)
                    )
                    .append(nextButton);
        },

        renderRow: function(index) {
            return $("<div />").attr({
                "class": "hw_week",
                "data-week": index
            });
        },

        renderWeeks: function(date) {
            var dateTiker = new Date(date),
                row,
                rows = [],
                week = 0,
                lastDay = this.getLastDate(dateTiker),
                currentMonth = dateTiker.getMonth(),
                lastActiveButton = null,
                cell,
                button;
            dateTiker.setDate(1);
            dateTiker.setDate(dateTiker.getDate() + (this.startWithMonday ? -6 : 0) - dateTiker.getDay());
            
            while (dateTiker <= lastDay) {
                row = this.renderRow(week);
                for (var day = 0; day < 7; day++) {
                    cell = this.renderCell(dateTiker, currentMonth, this.i18n.weekNameFull[day]);
                    row.append(cell);
                    button = cell.children("button");
                    if (button.hasClass("hw_default")){
                        lastActiveButton = button;
                    }
                    dateTiker.setDate(dateTiker.getDate() + 1);
                }
                week++;
                rows.push(row);
            }
            
            if (lastActiveButton){
                lastActiveButton.addClass("hw_lastActive");
            }

            return rows;
        },

        selectDate: function(e) {
            if (this.events.onSelect) {
                this.events.onSelect.call(this, e);
            }
            var currentButton = $(e.currentTarget);
            var date = new Date();
            date.setTime(currentButton.attr("data-date"));
            this.input.val(this.getFormatedDate(date))
                    .attr("aria-label", currentButton.attr("aria-label"));
            this.selectedDate = date;
            this.currentPicker.find(".hw_selectedDate").removeClass("hw_selectedDate");
            currentButton.addClass("hw_selectedDate");
            this.close(e);
        },

        strToDate: function(string) {
            var regExp = new RegExp("^" + this.dateFormat
                .replace(/\\/g, "\\\\")
                .replace(/\./g, "\\.")
                .replace("yyyy", "([0-9]{4})")
                .replace("mm", "([0-1]{1}[0-9]{1})")
                .replace("m", "([0-9]{1,2})")
                .replace("dd", "([0-3]{1}[0-9]{1})")
                .replace("d", "([0-9]{1,2})") +
                "$", i);
            var data = regExp.exec(string);
            if (data != null) {
                var positioning = [];
                positioning[this.dateFormat.indexOf("y")] = "setFullYear";
                positioning[this.dateFormat.indexOf("m")] = "setMonth";
                positioning[this.dateFormat.indexOf("d")] = "setDate";
                var date = new Date(2000, 0, 1, 0, 0, 0, 0);
                var i = 1;
                for (var n = 0; n < positioning.length; n++) {
                    var method = positioning[n];
                    if (method) {
                        var value = parseInt(data[i]);
                        if (method == "setMonth") {
                            value--;
                        }
                        date[method](value);
                        i++;
                    }
                }
                return date;
            }
            return null;
        },
        
        triggerClickEvent: function(e) {
            if (this.currentPicker == null || this.currentPicker.hasClass("hw_closed")) {
                e.stopPropagation();
                this.open();
            }
        },
        
        windowResizeEvent: function() {
            if (self.currentPicker != null) {
                self.adjustPosition();
            }
        },
    };
};