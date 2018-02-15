using System;
using System.Globalization;

namespace Wsklima.Api.Controllers
{
    public static class WsExtentions
    {

        public static Station ToStation(this no_met_metdata_StationProperties x)
        {
            return new Station
            {
                name = x.name,
                lat = x.latDec,
                lon = x.lonDec,
                stationId = x.stnr,
                from = Parse(x.fromYear, x.fromMonth, x.fromDay),
                to = Parse(x.toYear, x.toMonth, x.toDay),
            };
        }


        static DateTime? Parse(int year, int month, int day)
        {
            if (year == 0)
                return default(DateTime?);

            return new DateTime(year, month, day);
        }

        public static int ToUnix(this DateTime d)
        {
            return (int)(d.Subtract(new DateTime(1970, 1, 1))).TotalSeconds;
        }

        public static double? ToNullableDouble(this string s)
        {
            double n;
            bool isNumeric = double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out n);
            return n;
        }
    }


}
