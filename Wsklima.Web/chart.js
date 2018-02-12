(function () {

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

    $(document).ready(function () {
        $.ajax({
            type: 'GET',
            url: '1950-2018-SA.csv',
            dataType: 'text',
            success: function (csv) {
                showTimeseriesByYear(csv);
                showTimeseries(csv);
            },
            error: function () { alert("Crash!"); }
        });
    });

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
                    //return new Date(this.x * 1000)
                    return Highcharts.dateFormat('%Y %b %e: ' + this.y + 'cm', this.x * 1000)
                }
            },

            chart: {
                zoomType: 'x'
            },
            title: {
                text: 'Snødybder Kvamskogen hele period'
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

    function toBase(unixDate) {
        var d = new Date(unixDate * 1000);
        var date = new Date(1970, d.getMonth(), d.getDate());

        return date.getTime() / 1000
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

        var yrs = getYears();

        var entries = _.chain(formatData(csv))
            .filter(function (x) { return yrs.indexOf( new Date(x[0]*1000).getFullYear())>=0; })
            .value()

        var byYear = _.groupBy(entries, function (x) { return new Date(x[0] * 1000).getFullYear() });
        var keys = _.keys(byYear);

        var series = _.chain(keys)
            .map(function (x) {
                return {
                    type: 'line',
                    name: 'Snødybder ' + x,
                    data: _.chain(byYear[x]).map(function (y) { return [toBase(y[0]), y[1]]; }).value()
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
                text: 'Snødybder Kvamskogen årssammenligning'
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
