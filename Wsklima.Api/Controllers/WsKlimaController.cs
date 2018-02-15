using System;
using System.Linq;
using System.Web.Http;

namespace Wsklima.Api.Controllers
{
    public class WsKlimaController : ApiController
    {
        const string defaultLanguage = "en";
        const string defaultTimeseriesType = "2";       //daily
        const string defaultElement = "SA";             //snow depth
        const string defaultStations = "50300, 50310";  //Kvamskogen, the most beautiful place on earth
        const string noValue = "-99999";

        [Route("series-type")]
        public object GetSeriesType(string lang = defaultLanguage)
        {
            var ds = new MetDataService();

            return ds.getTimeserieTypesProperties(lang, "").Select(x => new
            {
                x.serieTypeID,
                x.serieTypeName,
                x.serieTypeDescription
            }).ToArray();
        }

        [Route("stations")]
        public object GetStations(string timeseriesType = defaultTimeseriesType)
        {
            var ds = new MetDataService();

            return ds.getStationsFromTimeserieType(timeseriesType, "")
                .Select(x => x.ToStation())
                .ToArray();
        }

        //stations-by-element?element=SA
        [Route("stations-by-element")]
        public object GetStationsByElement(string element, string timeseriesType = defaultTimeseriesType)
        {
            var ds = new MetDataService();

            return ds.getStationsFromTimeserieTypeElemCodes(timeseriesType, element, "")
                .Select(x=>x.ToStation())
                .ToArray();
        }


        //series?from=2016-12-01&to=2017-12-01
        [Route("generate-cache")]
        public object GetGenerateCache()
        {
            var s = new TimeseriesCache();
            s.GenerateCache((a, b, c, d) => GetTimeSeriesInner(a, b, c, d));

            return Ok();
        }

        [Route("series-light")]
        public object[][] GetTimeSeriesLight(DateTime from, DateTime to, string element = defaultElement, string stations = defaultStations)
        {
            return GetTimeSeries(from, to, element, stations)
                .Select(x => new object[] { x.from.ToUnix(), x.elementValue.ToNullableDouble() })
                .ToArray();
        }

        //series?from=2016-12-01&to=2017-12-01
        [Route("series")]
        public Entry[] GetTimeSeries(DateTime from, DateTime to, string element = defaultElement, string stations = defaultStations)
        {
            var intStations = stations.Split(',').Select(x => int.Parse(x)).ToArray();

            //check cache
            var cache = new TimeseriesCache();
            if (cache.IsCached(element, intStations))
            {
                return cache
                    .ReadCache(element, intStations)
                    .Where(x => x.from >= from && x.from <= to)
                    .ToArray();
            }

            return GetTimeSeriesInner(from, to, element, stations);
        }

        private static Entry[] GetTimeSeriesInner(DateTime from, DateTime to, string element, string stations)
        {
            var hours = Enumerable.Range(0, 23);    //all hours
            var months = Enumerable.Range(1, 12);   //all months
            var timeseriesTypeDailyId = "0";

            //get result
            var ds = new MetDataService();
            var result = ds.getMetData(
                timeseriesTypeDailyId,
                "yyyy-MM-dd",
                from.ToString("yyyy-MM-dd"),
                to.ToString("yyyy-MM-dd"),
                stations,
                element,
                string.Join(",", hours),
                string.Join(",", months), "");

            //flatten
            var entries = result.timeStamp.SelectMany(timestamp => timestamp.location.SelectMany(location => location.weatherElement.Select(weatherElement => new Entry
            {
                from = timestamp.from,
                to = timestamp.to.Year == 1 ? default(DateTime?) : timestamp.to,
                stationId = location.id,
                elementId = weatherElement.id,
                elementValue = weatherElement.value,
                elementQuality = weatherElement.quality
            })))
            .Where(x => x.elementValue != noValue)
            .ToArray();

            return entries
                .GroupBy(x => x.from)
                .Select(x => x.First())
                .OrderBy(x => x.from)
                .ToArray();
        }
    }


}
