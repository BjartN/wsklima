using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

namespace wsklima
{
    /// <summary>
    ///  Exploring API
    /// </summary>
    class Program
    {
        static void Main(string[] args)
        {
            var yearStart = 1950;
            var yearEnd = 2018;

            var r = GetSnowDepths(yearStart,yearEnd);
            var csv = GetCsv(r);

            File.WriteAllText($"{yearStart}-{yearEnd}-SA.csv",csv);

            Console.WriteLine(csv);
        }

        static int ToUnix(DateTime t)
        {
            return (Int32)(t.Subtract(new DateTime(1970, 1, 1))).TotalSeconds;
        }

        static string GetCsv(no_met_metdata_Metdata result)
        {
            var sb = new StringBuilder();
            //sb.AppendLine("time,value");

            foreach (var time in result.timeStamp)
            {
                foreach (var location in time.location)
                {
                    foreach (var value in location.weatherElement)
                    {
                        if (value.value == "-99999")
                        {
                            continue;
                        }

                        sb.AppendLine($"{ToUnix(time.from)},{value.value}");
                    }
                }
            }

            return sb.ToString();
        }


        static no_met_metdata_Metdata GetSnowDepths(int startYear, int endYear)
        {
            //http://eklima.met.no/met/MetService?invoke=getMetData&timeserietypeID=2&format=&from=1950-01-01&to=2017-01-01&stations=50310&elements=SA&hours=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9&months=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11&username=

            var snowDepthParameter = "SA";
            var stations = new[] { 50300, 50310 };

            //var timeseriesTypeObs = "T_ELEM_OBS";
            //var timeseriesTypeObsId = "2";          

            var timeseriesTypeObs = "T_DIURNAL";
            var timeseriesTypeObsId = "0";

            var hours = Enumerable.Range(0, 23);
            var months = new[] { 10,11, 12, 1, 2, 3, 4,5 };
            var from = startYear + "-01-01";
            var to = endYear + "-31-12";

            var ds = new MetDataService();

            var result = ds.getMetData(
                timeseriesTypeObsId,
                "yyyy-MM-dd",
                from,
                to,
                string.Join(",", stations),
                snowDepthParameter.ToString(),
                string.Join(",", hours),
                string.Join(",", months), "");


            return result;
        }
        
    
        static void GetVariousDataFromApi()
        {
            var st = new[] { 50300, 50310 };
            var ds = new MetDataService();
            var types = ds.getTimeserieTypesProperties("", "");

            var timeseriesTypeObs = "T_ELEM_OBS";
            var timeseriesTypeObsId = "2";

            var stations = ds
                .getStationsFromTimeserieType("2", "")
                .Where(s => st.Any(x => x == s.stnr))
                .OrderBy(x => x.name)
                .ToArray();

            foreach (var s in stations)
            {
                Console.WriteLine($"{s.name} {s.fromYear}-{s.toYear} {s.stnr}");
            }

            Console.WriteLine();

            var parameters = ds
                .getElementsFromTimeserieType(timeseriesTypeObsId)
                .Where(x => x.description.ToLower().Contains("snø")) //snow
                .ToArray();

            foreach (var p in parameters)
            {
                Console.WriteLine($"{p.name} {p.elemNo}");
            }

            Console.ReadLine();
        }
    }
}
