using System;
using System.Linq;
using System.Web.Http;

namespace Wsklima.Api.Controllers
{
    public class WsKlimaController : ApiController
    {
        const string defaultLanguage = "en";
        const string defaultTimeseriesType = "2";                   //daily
        const string defaultElement = "SA";                         //snow depth
        const string defaultStations = "50300, 50310";              //Kvamskogen, the most beautiful place on earth
        const string noValue = "-99999";
        static int[] hours = Enumerable.Range(0, 23).ToArray();    //all hours
        static int[] months = Enumerable.Range(1, 12).ToArray();

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

        [Route("stations-by-element")]
        public Station[] GetStationsByElement(string element, string timeseriesType = defaultTimeseriesType)
        {
            var ds = new MetDataService();

            return ds.getStationsFromTimeserieTypeElemCodes(timeseriesType, element, "")
                .Select(x=>x.ToStation())
                .ToArray();
        }

       
        [Route("quality-flag")]
        public object[] GetQualityFlat(string lang=defaultLanguage)
        {
            var ds = new MetDataService();

            return ds.getFlagProperties(lang, "")
                .Select(x => new
                {
                    x.flagCode,
                    x.flagDescription,
                    x.flagName,
                    flagId= x.flagID
                })
                .ToArray();
        }

        [Route("generate-cache")]
        public object GetGenerateCache()
        {
            var s = new TimeseriesCache();
            s.GenerateCache((a, b, c, d) => GetTimeSeriesInner(a, b, c, d));

            return Ok();
        }

        [Route("generate-latest-cache")]
        public object GetGenerateLatestCache()
        {
            var s = new OverviewCache();
            s.GenerateCache((a) => GetLatesDailyObsInner(a));

            return Ok();
        }

        [Route("series-light")]
        public object[][] GetTimeSeriesLight(DateTime from, DateTime to, string element = defaultElement, string stations = defaultStations)
        {
            return GetTimeSeries(from, to, element, stations)
                .Select(x => new object[] { x.from.ToUnix(), x.elementValue.ToNullableDouble() })
                .ToArray();
        }

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

        [Route("series-latest")]
        public StationEntry[] GetLatesDailyObs(string element = defaultElement, int limit = 10000)
        {
            //check cache
            var cache = new OverviewCache();
            if (cache.IsCached(element))
            {
                return cache.ReadCache(element);
            }

            return GetLatesDailyObsInner(element, limit);
        }

        private StationEntry[] GetLatesDailyObsInner(string element=defaultElement, int limit=10000)
        {
            var timeseriesTypeDailyId = "0";
            var ds = new MetDataService();
            var st = GetStationsByElement(element, timeseriesTypeDailyId)
                .Where(x => x.to == null)
                .ToArray();

            var stIdx = st.ToDictionary(x => x.stationId, x => x);

            var stations = string.Join(",", st.Select(x => x.stationId).ToArray());

            var result = ds.getMetData(
                timeseriesTypeDailyId,
                "yyyy-MM-dd",
                DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd"),
                DateTime.UtcNow.ToString("yyyy-MM-dd"),
                stations,
                element,
                string.Join(",", hours),
                string.Join(",", months),
                "");

            //flatten
            var entries = result.timeStamp.SelectMany(timestamp => timestamp.location.SelectMany(location => location.weatherElement.Select(weatherElement => new StationEntry
            {
                from = timestamp.from,
                to = timestamp.to.Year == 1 ? default(DateTime?) : timestamp.to,
                stationId = location.id,
                elementId = weatherElement.id,
                elementValue = weatherElement.value,
                elementQuality = weatherElement.quality,
                stationName = stIdx.ContainsKey(location.id) ? stIdx[location.id].name : default(string),
                lat = stIdx.ContainsKey(location.id) ? stIdx[location.id].lat : default(double?),
                lon = stIdx.ContainsKey(location.id) ? stIdx[location.id].lon : default(double?)
            })))
            .Where(x => x.elementValue != noValue)
            .GroupBy(x=>x.stationId)
            .Select(g=>g.OrderByDescending(x=>x.from).First())
            .ToArray();

            return entries
                .OrderByDescending(x => x.elementValue.ToNullableDouble())
                .Take(limit)
                .ToArray();
        }

        private static Entry[] GetTimeSeriesInner(DateTime from, DateTime to, string element, string stations)
        {
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
