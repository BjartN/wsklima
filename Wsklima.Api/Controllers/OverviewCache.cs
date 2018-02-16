using Newtonsoft.Json;
using System;
using System.Configuration;
using System.IO;
using System.Collections.Generic;
using System.Linq;

namespace Wsklima.Api.Controllers
{
    public class OverviewCache
    {
        private string _cacheFolder;
        private string[] _elementCache;

        public OverviewCache()
        {
            _cacheFolder = ConfigurationManager.AppSettings["CacheFolder"];
            _elementCache = ConfigurationManager.AppSettings["ElementCache"].Split(',');
        }

        public bool IsCached(string element)
        {
            return _elementCache.Any(x => x == element);
        }

        public StationEntry[] ReadCache(string element)
        {
            List<StationEntry> l = new List<StationEntry>();

            var file = Path.Combine(_cacheFolder, GetFile(element));
            var json = File.ReadAllText(file);
            return JsonConvert.DeserializeObject<StationEntry[]>(json);
        }

        public void GenerateCache(Func<string, StationEntry[]> getLatest)
        {
            foreach (var e in _elementCache)
            {
                var file = Path.Combine(_cacheFolder, GetFile(e));
                var r = getLatest(e);
                File.WriteAllText(Path.Combine(_cacheFolder, GetFile(e)), JsonConvert.SerializeObject(r));
            }
        }

        private string GetFile(string e)
        {
            return $"latest-{e}.json";
        }

    }

}
