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
            success: function (csv) { showTimeseries(csv); },
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


    function showByMonth(csv) {
        var entries = formatData(csv);

        Highcharts.chart('container', {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Monthly Max Snow Depth'
            },
            subtitle: {
                text: 'Source: EKlima'
            },
            xAxis: {
                categories: months,
                crosshair: true
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Snow Depth (cm)'
                }
            },
            tooltip: {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:.1f} mm</b></td></tr>',
                footerFormat: '</table>',
                shared: true,
                useHTML: true
            },
            plotOptions: {
                column: {
                    pointPadding: 0.2,
                    borderWidth: 0
                }
            },
            series: [{
                name: 'Tokyo',
                data: [49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4]

            }, {
                name: 'New York',
                data: [83.6, 78.8, 98.5, 93.4, 106.0, 84.5, 105.0, 104.3, 91.2, 83.5, 106.6, 92.3]

            }, {
                name: 'London',
                data: [48.9, 38.8, 39.3, 41.4, 47.0, 48.3, 59.0, 59.6, 52.4, 65.2, 59.3, 51.2]

            }, {
                name: 'Berlin',
                data: [42.4, 33.2, 34.5, 39.7, 52.6, 75.5, 57.4, 60.4, 47.6, 39.1, 46.8, 51.1]

            }]
        });
    }


})();
