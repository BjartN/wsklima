using System;

namespace Wsklima.Api.Controllers
{
    public class Station
    {
        public string name { get; set; }
        public double lat { get; set; }
        public double lon { get; set; }
        public int stationId { get; set; }
        public DateTime? from { get; set; }
        public DateTime? to { get; set; }
    }


}
