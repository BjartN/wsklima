using Newtonsoft.Json;
using System;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Collections.Generic;

namespace Wsklima.Api.Controllers
{

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
            _cacheEnd = DateTime.UtcNow;
            _cacheFolder = ConfigurationManager.AppSettings["CacheFolder"];
            _elementCache = ConfigurationManager.AppSettings["ElementCache"].Split(',');
            _stationCache = ConfigurationManager.AppSettings["StationCache"].Split(',').Select(x => int.Parse(x)).ToArray();
        }

        public bool IsCached(string element, int[] stations)
        {
            return (_elementCache.Contains(element) && stations.All(x => _stationCache.Contains(x)));
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

        public void GenerateCache(Func<DateTime, DateTime, string, string, Entry[]> getTimeSeries)
        {
            foreach (var e in _elementCache)
            {
                foreach (var s in _stationCache)
                {
                    var file = Path.Combine(_cacheFolder, $"{e}-{s}.json");
                  
                    var r = getTimeSeries(_cacheStart, _cacheEnd, e, s.ToString());
                    File.WriteAllText(Path.Combine(_cacheFolder, $"{e}-{s}.json"), JsonConvert.SerializeObject(r));
                }
            }
        }

    }

}
