(function () {

    var startYear = 1950;
    var data = undefined;

    $(function () {

        var $dimmer = $('.dimmer');

        //corresponding pages, menu items and function to run
        var wrappers = _.map(['.all-years-wrapper', '.summary-wrapper', '.compare-season-wrapper'], function (x) { return $(x) });
        var menuItems = _.map(['#all-years', '#summary', '#compare-years'], function (x) { return $(x) });
        var functions = [
            showTimeseries,
            function (x) { showTimeseries(x, function (x) { return x[0] > (new Date(2017, 06, 01).getTime() / 1000) }, 'container3') },
            showTimeseriesByYear
        ];

        //intitialize starting state
        _.each(wrappers, function (w, i) { if (i > 0) w.hide(); });

        //intitialize view change
        _.each(menuItems, function (x, i) {
            initMenuClick(x, i, wrappers, functions);
        })

        loadData(function (json) {
            data = formatData(json);
            showTimeseriesByYear(data);
            showTimeseries(data);
            $dimmer.hide();
        });
    });

    function filterByDate(x){
        return x[0] > (new Date(2017, 06, 01).getTime() / 1000);
    }

    function initMenuClick(x, i, wrappers, functions) {
        x.click(function () {
            _.each(wrappers, function (w) { w.hide() });
            wrappers[i].show();
            functions[i](data);
        });
    }

    function loadData(success) {
        $.ajax({
            type: 'GET',
            url: 'http://localhost:55880/series-light?from=' + startYear + '-01-01&to=2018-12-01&element=SA',
            dataType: 'json',
            success: success,
            error: function (e) {
                alert('An error occured');
            }
        });
    }

    function showTimeseries(entries, filter, container) {

        var d = filter == undefined ? entries: _.chain(entries).filter(filter).value();

        Highcharts.chart(container === undefined ? 'container' : container, {
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
                data: d
            }]
        });

        var chart = $('#container').highcharts();

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
        var years = _.chain($('.year-select').toArray())
            .map(function (x) { return $(x).val() * 1; })
            .value();

        return years;
    }

    function initYears(data) {

        var $selects = $('.year-select');
        _.each(_.range(startYear, (new Date().getFullYear()) + 1), function (x) {
            $selects.append($('<option>', { value: x }).text(x - 1 + '-' + x));
        });
        $($selects[0]).val(2016);
        $($selects[1]).val(2017);

        $selects.change(function () {
            showTimeseriesByYear(data);
        });
    }

    var first = true;

    function showTimeseriesByYear(d) {

        if (first) {
            initYears(d);
            first = false;
        }

        var selectedYears = getYears();

        var entries = _.chain(d)
            .filter(function (x) { return selectedYears.indexOf(getSeason(x[0])) >= 0; })
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


    function formatData(data) {
        return data;
    }

})();
