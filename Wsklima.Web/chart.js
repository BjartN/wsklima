﻿(function () {

    var data = undefined;

    var months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
    ];

    $(function () {

        var $compareYears = $('#compare-years'),
            $compareYearsWrapper = $('#compare-years-wrapper');
            $allYears = $('#all-years'),
            $filterPanel = $('#filter-panel'),
            $selects = $('.year-select'),
            $container = $('#container'),
            $container2 = $('#container2');

        $container.show();
        $compareYearsWrapper.hide();

        $allYears.click(function () {
            $container.show();
            $compareYearsWrapper.hide();
            showTimeseries(data);
        });

        $compareYears.click(function () {
            $container.hide();
            $compareYearsWrapper.show();
            showTimeseriesByYear(data);
        });

        _.each(_.range(1950, 2019), function (x) {
            $selects.append($('<option>', { value: x }).text(x-1 + '-' + x));
        });

        $($selects[0]).val(2016);
        $($selects[1]).val(2017);
        $($selects[2]).val(2018);

        loadData(function (csv) {
            data = csv;
            showTimeseriesByYear(data);
            showTimeseries(data);
        });
    });


    function loadData(success){
        $.ajax({
            type: 'GET',
            url: '1950-2018-SA.csv',
            dataType: 'text',
            success: success,
            error: function () { alert("Crash!"); }
        });
    }

    function formatData(csv) {

        var lines = csv.split('\n');
        var entries = _.chain(lines)
            .map(function (x) { return x.split(',') })
            .map(function (x) { return [parseInt(x[0]), parseFloat(x[1])]; })
            .filter(function (x) { return !isNaN(x[0]) })
            .value();

        return entries;
    }

    function showTimeseries(csv) {

        var entries = formatData(csv);

        Highcharts.chart('container', {
            tooltip: {
                formatter: function () {
                    return Highcharts.dateFormat('%Y %b %e: ' + this.y + 'cm', this.x * 1000)
                }
            },
            chart: {
                zoomType: 'x'
            },
            title: {
                text: 'Snødybder Kvamskogen'
            },
            subtitle: {
                text: 'Observasjoner tatt på Jonshøgdi fra 2006, Eikedalen før det. Zoom ved å markere ett område i grafen.'
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%Y', this.value * 1000); // milliseconds not seconds
                    },
                }
            },
            yAxis: {
                title: {
                    text: 'Snødybde (cm)'
                }
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                area: {
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, Highcharts.getOptions().colors[0]],
                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                        ]
                    },
                    marker: {
                        radius: 1
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                }
            },

            series: [{
                type: 'area',
                name: 'Snødybder',
                data: entries
            }]
        });
    }

    function monthKey(d) {
        return d.getFullYear() + '_' + d.getMonth();
    }

    function getDateByMonthKey(key) {
        var a = key.split('_');
        return new Date(parseInt(a[0]), parseInt(a[1]));
    }

    function getBaseDateSeason(unixDate) {

        var d = new Date(unixDate * 1000);
        var year = d.getMonth() > 6 ? 1970 : 1971;
        var date = new Date(year, d.getMonth(), d.getDate());

        return date.getTime() / 1000
    }

    function getSeason(unixDate) {
        var d = new Date(unixDate * 1000);
        var season = d.getMonth() > 6 ? d.getFullYear() + 1 : d.getFullYear();
        return season;
    }
   
    function getYears() {
        var years=  _.chain($('.year-select').toArray())
            .map(function (x) { return $(x).val()*1; })
            .value();

        return years;

        return [2016, 2017, 2018];
    }

    function initYears(csv) {
        $('.year-select').change(function () {
            showTimeseriesByYear(csv);
        });
    }

    var first = true;

    function showTimeseriesByYear(csv) {

        if (first) {
            initYears(csv);
            first = false;
        }

        var selectedYears = getYears();

        var entries = _.chain(formatData(csv))
            .filter(function (x) { return selectedYears.indexOf(getSeason(x[0]))>=0; })
            .value()

        var byYear = _.groupBy(entries, function (x) { return getSeason(x[0]) });
        var keys = _.keys(byYear);

        var series = _.chain(keys)
            .map(function (x) {
                return {
                    type: 'line',
                    name: 'Snødybder ' + x,
                    data: _.chain(byYear[x]).map(function (y) { return [getBaseDateSeason(y[0]), y[1]]; }).value()
                }
            })
            .value();
        

        Highcharts.chart('container2', {
            tooltip: {
                formatter: function () {
                    return Highcharts.dateFormat(this.series.name + ' %b %e: ' + this.y + 'cm', this.x * 1000)
                }
            },

            chart: {
                zoomType: 'x'
            },
            title: {
                text: 'Snødybder Kvamskogen sesongsammenligning'
            },
            subtitle: {
                text: 'Observasjoner tatt på Jonshøgdi fra 2006, Eikedalen før det. Zoom ved å markere ett område i grafen.'
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%b', this.value * 1000); // milliseconds not seconds
                    },
                }
            },
            yAxis: {
                title: {
                    text: 'Snødybde (cm)'
                }
            },
            legend: {
                enabled: true
            },
            plotOptions: {
                line: {
                    marker: {
                        radius: 2
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                }
            },

            series: series
        });
    }

})();
