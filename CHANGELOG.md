# Changelog

## 2.2.1

- Increase fetched event range from 100 to 200.

## 2.2.0

- Require Grafana 8.x.
- Fix query disable not working.
- Change 'Get parameter value' so that it respects the query range (previously it was always fetching current value).
- Fix bugs relating to retrieval of aggregate member and array entries.

## 2.1.0

- Aggregate members and array entries can now be queried. Use this in combination with Yamcs v5.5.x or later. #7
- If available, engineering units are now passed to Grafana as metadata. Grafana will show this information in various widget types.
- The query types `Get parameter samples` and `Get parameter value` allow switching the output to the raw parameter value (as opposed to the default engineering value). Use this in combination with Yamcs v5.5.x or later.
- The query type `Get parameter value history` returns both raw and engineering values in its table output.
- The query type `Get parameter samples` now properly shows gaps instead of connecting the points surrounding the gap.
- An issue was fixed where autocomplete suggestions were wrongly interpreting user input as regex.
