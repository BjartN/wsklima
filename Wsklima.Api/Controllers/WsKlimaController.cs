using Newtonsoft.Json;
using System;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Web.Http;
using System.Collections.Generic;

namespace Wsklima.Api.Controllers
{
    public class WsKlimaController : ApiController
    {
        const string defaultLanguage = "en";
        const string defaultTimeseriesType = "2";       //daily
        const string defaultElement = "SA";             //snow depth
        const string defaultStations = "50300, 50310";  //Kvamskogen, the most beautiful place on earth

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

            return ds.getStationsFromTimeserieType(timeseriesType, "").Select(x => new
            {
                x.name,
                lat = x.latDec,
                lon = x.lonDec,
                stationId = x.stnr,
                from = Parse(x.fromYear, x.fromMonth, x.fromDay),
                to = Parse(x.toYear, x.toMonth, x.toDay),
            }).ToArray();
        }

        //stations-by-element?element=SA
        [Route("stations-by-element")]
        public object GetStationsByElement(string element, string timeseriesType = defaultTimeseriesType)
        {
            var ds = new MetDataService();

            return ds.getStationsFromTimeserieTypeElemCodes(timeseriesType, element, "").Select(x => new
            {
                x.name,
                lat = x.latDec,
                lon = x.lonDec,
                stationId = x.stnr,
                from = Parse(x.fromYear, x.fromMonth, x.fromDay),
                to = Parse(x.toYear, x.toMonth, x.toDay),
            }).ToArray();
        }


        //series?from=2016-12-01&to=2017-12-01
        [Route("generate-cache")]
        public object GetGenerateCache()
        {
            var s = new TimeseriesCache();
            s.GenerateCache((a, b, c, d) => GetTimeSeries(a, b, c, d));

            return Ok();
        }

        //series?from=2016-12-01&to=2017-12-01
        [Route("series")]
        public Entry[] GetTimeSeries(DateTime from, DateTime to, string element = defaultElement, string stations = defaultStations, string noValue = "-99999")
        {
            var timeseriesTypeDailyId = "0";
            var hours = Enumerable.Range(0, 23);    //all hours
            var months = Enumerable.Range(1, 12);   //all months
            var intStations = stations.Split(',').Select(x => int.Parse(x)).ToArray();

            //check cache
            var cache = new TimeseriesCache();
            Entry[] cached = new Entry[0];
            if (cache.IsCached(from, to, element, intStations)){
                cached = cache.ReadCache(element, intStations);
            }
            var range = cache.NotCachedRange(from, to, element, intStations);

            //get result
            var ds = new MetDataService();
            var result = ds.getMetData(
                timeseriesTypeDailyId,
                "yyyy-MM-dd",
                range.Item1.ToString("yyyy-MM-dd"),
                range.Item2.ToString("yyyy-MM-dd"),
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
            .Where(x => x.elementValue != "-99999")
            .ToArray();

            return entries.Union(cached)
                .GroupBy(x=>x.from)
                .Select(x=>x.First())
                .OrderBy(x=>x.from)
                .ToArray();
        }

        static DateTime? Parse(int year, int month, int day)
        {
            if (year == 0)
                return default(DateTime?);

            return new DateTime(year, month, day);
        }

    }

    public class TimeseriesCache
    {
        private string _cacheFolder;
        private int[] _stationCache;
        private DateTime _cacheStart;
        private DateTime _cacheEnd;
        private string[] _elementCache;

        public TimeseriesCache()
        {
            _cacheStart = new DateTime(1950, 1, 1);
            _cacheEnd = new DateTime(2017, 12, 31);
            _cacheFolder = ConfigurationManager.AppSettings["CacheFolder"];
            _elementCache = ConfigurationManager.AppSettings["ElementCache"].Split(',');
            _stationCache = ConfigurationManager.AppSettings["StationCache"].Split(',').Select(x => int.Parse(x)).ToArray();
        }

        public bool IsCached(DateTime from, DateTime to, string element, int[] stations)
        {
            return (from == _cacheStart && to > _cacheEnd && _elementCache.Contains(element) && stations.All(x => _stationCache.Contains(x)));
        }

        public Entry[] ReadCache(string element, int[] stations)
        {
            List<Entry> l = new List<Entry>();
            foreach (var s in stations)
            {
                var file = Path.Combine(_cacheFolder, $"{element}-{s}.json");
                var json = File.ReadAllText(file);
                l.AddRange(JsonConvert.DeserializeObject<Entry[]>(json));
            }
            return l.ToArray();
        }


        public Tuple<DateTime, DateTime> NotCachedRange(DateTime from, DateTime to, string element, int[] stations)
        {
            if (!IsCached(from, to, element, stations))
                return new Tuple<DateTime, DateTime>(from, to);

            return new Tuple<DateTime, DateTime>(_cacheEnd, to);
        }

        public void GenerateCache(Func<DateTime, DateTime, string, string, Entry[]> getTimeSeries)
        {
            foreach (var e in _elementCache)
            {
                foreach (var s in _stationCache)
                {
                    var file = Path.Combine(_cacheFolder, $"{e}-{s}.json");
                    if (File.Exists(file))
                    {
                        continue;
                    }

                    var r = getTimeSeries(_cacheStart, _cacheEnd, e, s.ToString());
                    File.WriteAllText(Path.Combine(_cacheFolder, $"{e}-{s}.json"), JsonConvert.SerializeObject(r));
                }
            }
        }

    }


    public class Entry
    {
        public DateTime from { get; set; }
        public DateTime? to { get; set; }
        public int stationId { get; set; }
        public string elementId { get; set; }
        public string elementValue { get; set; }
        public int elementQuality { get; set; }
    }

}
