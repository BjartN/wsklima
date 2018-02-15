using System;

namespace Wsklima.Api.Controllers
{
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
