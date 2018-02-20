(function () {

    var startYear = 1950;
    var settingsViewIdx = 4;
    var rootUrl = 'http://localhost:55880/';
    var state = stateModule();

    $(function () {
        //corresponding pages, menu items and function to run
        var panels = _.map(['.all-years-wrapper', '.summary-wrapper', '.compare-season-wrapper', '.latest-wrapper', '.settings-wrapper'], function (x) { return $(x) });
        var buttons = _.map(['#all-years', '#summary', '#compare-season', '#latest', '#settings'], function (x) { return $(x) });
        var functions = [loadTimeseries, loadTimeseriesSubset, loadTimeseriesByYear, loadLatest, function () { }];

        //intitialize starting state
        _.each(panels, function (w, i) { if (i > 0) w.hide(); });

        //intitialize view change
        _.each(buttons, function (x, i) {
            initMenuClick(x, i, panels, functions);
        })

        initStationSelect(state, panels, functions);
        changeView(state.getViewIdx(), panels, functions);
    });

    function initStationSelect(state, panels, functions) {
        var $stationSelect = $('#station-select');
        var stations = state.getStations();

        _.each(stations, function (station, i) {
            _.each(station.elements, function (elementId, j) {
                $stationSelect.append($('<option>', { value: JSON.stringify({ stationIdx: i, elementId: elementId }) }).text(station.name + ' ' + state.getElement(elementId).name));
            })
        });

        $stationSelect.change(function () {
            changeView(state.getViewIdx(), panels, functions);
        });
    }

    function initMenuClick(x, i, panels, functions) {
        x.click(function () {
            changeView(i, panels, functions);
        });
    }

    function initYears(data) {
        var $selects = $('.year-select');
        _.each(_.range(startYear, (new Date().getFullYear()) + 1), function (x) {
            $selects.append($('<option>', { value: x }).text(x - 1 + '-' + x));
        });
        $($selects[0]).val(2017);
        $($selects[1]).val(2018);

        $selects.change(function () {
            showTimeseriesCompare(data);
        });
    }

    function changeView(i, panels, functions) {
        _.each(panels, function (w) { w.hide() });
        panels[i].show();
        if (i !== settingsViewIdx) {
            state.setViewIdx(i);
        }
        functions[i]();
    }

    function loadTimeseries() {
        var stations = state.getStation().stations.join(',');
        var element = state.getElement();
        var url = rootUrl + 'series-light?from=' + startYear + '-01-01&to=2018-12-01&element=' + element.id + '&stations=' + stations;
        loadData(url, function (d) {
            showTimeseries(toMillisecondTicks(d));
        });
    }

    function toMillisecondTicks(data) {
        return _.map(data, function (a) {return [a[0]*1000,a[1]] });
    }

    function loadTimeseriesSubset() {
        var stations = state.getStation().stations.join(',');
        var element = state.getElement();
        var url = rootUrl + 'series-light?from=' + startYear + '-01-01&to=2018-12-01&element=' + element.id + '&stations=' + stations;
        loadData(url, function (d) {
            var d = toMillisecondTicks(d);
            showTimeseries(d, function (x) { return x[0] > new Date(2017, 06, 01).getTime()}, 'container3')
        });
    }

    function loadTimeseriesByYear() {
        var stations = state.getStation().stations.join(',');
        var element = state.getElement();
        var url = rootUrl + 'series-light?from=' + startYear + '-01-01&to=2018-12-01&element=' + element.id + '&stations=' + stations;
        loadData(url, function (d) {
            showTimeseriesCompare(toMillisecondTicks(d));
        });
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

        Highcharts.setOptions({
            lang: {
                resetZoom: 'Nullstill zoom'
            }
        });

        Highcharts.chart(container === undefined ? 'container' : container, {
            tooltip: {
                formatter: function () {
                    return Highcharts.dateFormat('%Y %b %e: ' + this.y + 'cm', this.x)
                }
            },
            chart: {
                zoomType: 'x'
            },
            title: {
                text: state.getStation().name
            },
            subtitle: {
                text: state.getStation().description
            },  
            xAxis: {
                type: 'datetime'
            },
            yAxis: {
                title: {
                    text: state.getElement().name
                },
                min:0
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
                },

                column: {
                    color: 'green'
                }

            },

            series: [{
                type: state.getElement().chartType,
                name: state.getElement().name,
                data: d
            }]
        });

        var chart = $('#container').highcharts();

    }

    function getBaseDateSeason(unixDateMs) {

        var d = new Date(unixDateMs);
        var year = d.getMonth() > 6 ? 1970 : 1971;
        var date = new Date(year, d.getMonth(), d.getDate());

        return date.getTime()
    }

    function getSeason(unixDateMs) {
        var d = new Date(unixDateMs);
        var season = d.getMonth() > 6 ? d.getFullYear() + 1 : d.getFullYear();
        return season;
    }

    function getYears() {
        var years = _.chain($('.year-select').toArray())
            .map(function (x) { return $(x).val() * 1; })
            .value();

        return years;
    }
    var first = true;

    function showTimeseriesCompare(d) {

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

        var currentElement = state.getElement();

        var series = _.chain(keys)
            .map(function (x) {
                return {
                    type: currentElement.chartType === 'area' ? 'line' : currentElement.chartType, //always line, not area
                    name: currentElement.name + ' ' + x,
                    data: _.chain(byYear[x]).map(function (y) { return [getBaseDateSeason(y[0]), y[1]]; }).value()
                }
            })
            .value();

        Highcharts.setOptions({
            lang: {
                resetZoom: 'Nullstill zoom'
            }
        });

        Highcharts.chart('container2', {
            tooltip: {
                formatter: function () {
                    return Highcharts.dateFormat(' %b %e: ' + this.y + 'cm', this.x)
                }
            },

            chart: {
                zoomType: 'x'
            },
            title: {
                text: state.getStation().name
            },
            subtitle: {
                text: state.getStation().description
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%b', this.value);
                    },
                }
            },
            yAxis: {
                title: {
                    text: currentElement.name
                },
                min:0
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

    function stateModule() {

        var viewIdx = 0;

        var nameMap = {
            "SA": "Snødybde",
            "TA": "Temperatur",
            "RR": "Døgnnedbør"
        }

        var chartMap = {
            "SA": "area",
            "TA": "area",
            "RR": "column"
        }

        var stations = [
            {
                name: "Kvamskogen",
                description: "Observasjoner tatt på Jonshøgdi fra 2006, Eikedalen før det.",
                stations: [50300, 50310],
                elements: ["SA", "RR"]
            },
            {
                name: "Myrkdalen",
                description: "Observasjoner tatt i Myrkdalen",
                stations: [51990],
                elements: ["SA", "RR"]
            }
        ];

        function setViewIdx(i) {
            viewIdx = i;
        }
        function getViewIdx() {
            return viewIdx;
        }
        function getStation() {
            var s = JSON.parse($('#station-select').val());
            return getStations()[s.stationIdx];
        }
        function getElement(elementId) {
            var id = elementId === undefined ? JSON.parse($('#station-select').val()).elementId : elementId;

            return {
                id: id,
                name: nameMap[id],
                chartType: chartMap[id]
            }
        }
        function getStations() {
            return stations;
        }

        return {
            setViewIdx: setViewIdx,
            getViewIdx: getViewIdx,
            getStation: getStation,
            getStations: getStations,
            getElement: getElement
        }
    }

})();
