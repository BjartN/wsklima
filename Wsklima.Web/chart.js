(function () {

    var startYear = 1950;
    var settingsViewIdx = 4;
    var rootUrl = 'http://localhost:55880/';

    var stationSets = [
        {
            name: "Kvamskogen",
            description: "Observasjoner tatt på Jonshøgdi fra 2006, Eikedalen før det.",
            stations: [50300, 50310]
        },
        {
            name: "Myrkdalen",
            description: "Observasjoner tatt i Myrkdalen",
            stations: [51990]
        }
    ];
    var state = {
        viewIdx: 0,
        getStationSet: function () {
            return stationSets[parseInt($('#station-select').val())];
        }
    };

    $(function () {
        var $stationSelect = $('#station-select');

        //corresponding pages, menu items and function to run
        var panels = _.map(['.all-years-wrapper', '.summary-wrapper', '.compare-season-wrapper', '.latest-wrapper', '.settings-wrapper'], function (x) { return $(x) });
        var buttons = _.map(['#all-years', '#summary', '#compare-years', '#latest', '#settings'], function (x) { return $(x) });
        var functions = [loadTimeseries, loadTimeseriesSubset, loadTimeseriesByYear, loadLatest, function () { }];

        //intitialize starting state
        _.each(panels, function (w, i) { if (i > 0) w.hide(); });

        //intitialize view change
        _.each(buttons, function (x, i) {
            initMenuClick(x, i, panels, functions);
        })

        $stationSelect.change(function () {
            changeView(state.viewIdx, panels, functions);
        });

        changeView(state.viewIdx, panels, functions);
    });

    function filterByDate(x) {
        return x[0] > (new Date(2017, 06, 01).getTime() / 1000);
    }

    function initMenuClick(x, i, panels, functions) {
        x.click(function () {
            changeView(i, panels, functions);
        });
    }

    function changeView(i, panels, functions) {
        _.each(panels, function (w) { w.hide() });
        panels[i].show();
        if (i !== settingsViewIdx) {
            state.viewIdx = i;
        }
        functions[i]();
    }

    function loadTimeseries() {
        var stations = state.getStationSet().stations.join(',');
        var url = rootUrl + 'series-light?from=' + startYear + '-01-01&to=2018-12-01&element=SA&stations=' + stations;
        loadData(url, showTimeseries);
    }

    function loadTimeseriesSubset() {
        var stations = state.getStationSet().stations.join(',');
        var url = rootUrl + 'series-light?from=' + startYear + '-01-01&to=2018-12-01&element=SA&stations=' + stations;
        loadData(url, function (d) {
            showTimeseries(d, function (x) { return isGreater(x[0], new Date(2017, 06, 01)); }, 'container3')
        });
    }

    function loadTimeseriesByYear() {
        var stations = state.getStationSet().stations.join(',');
        var url = rootUrl + 'series-light?from=' + startYear + '-01-01&to=2018-12-01&element=SA&stations=' + stations;
        loadData(url, showTimeseriesByYear);
    }

    function loadLatest() {
        var url = rootUrl + 'series-latest?limit=100';
        loadData(url, showLatest);
    }

    function showLatest(data) {
        var $body = $('.latest-wrapper tbody');
        $body.html('')
        _.each(data, function (x) {
            $body.append('<tr><td>' + x.stationName + '</td><td>' + x.elementValue + 'cm</td></tr>')
        });
    }

    function showTimeseries(data, filter, container) {

        var d = filter == undefined ? data : _.chain(data).filter(filter).value();

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
                text: state.getStationSet().name
            },
            subtitle: {
                text: state.getStationSet().description
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
        $($selects[0]).val(2017);
        $($selects[1]).val(2018);

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
                    return Highcharts.dateFormat(' %b %e: ' + this.y + 'cm', this.x * 1000)
                }
            },

            chart: {
                zoomType: 'x'
            },
            title: {
                text: state.getStationSet().name
            },
            subtitle: {
                text: state.getStationSet().description
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

    function loadData(url, success) {

        $('.dimmer').show();

        $.ajax({
            type: 'GET',
            url: url,
            dataType: 'json',
            success: function (d) {
                success(d);
                $('.dimmer').hide();
            },
            error: function () {
                alert("Error downloading data");
                $('.dimmer').hide();
            }
        });
    }

    function isGreater(unixTime, date) {
        return unixTime > (date.getTime() / 1000)
    }

})();
